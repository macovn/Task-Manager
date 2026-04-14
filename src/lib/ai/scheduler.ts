import { addDays, addMinutes, format, isAfter, isBefore, isSameDay, parseISO, setHours, setMinutes, startOfDay, differenceInDays } from 'date-fns';
import { Task } from '../../types';

export interface ScheduledTask {
  task_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
}

const TIME_BLOCKS = [
  { start: { h: 7, m: 30 }, end: { h: 12, m: 0 }, energy: 'high' },
  { start: { h: 13, m: 0 }, end: { h: 16, m: 30 }, energy: 'medium' },
];

export function generateSchedule(tasks: Task[], startDate: Date = new Date()): ScheduledTask[] {
  // STEP 1: NORMALIZE
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'archived');

  // STEP 2 & 5: SORT & DEADLINE BOOST
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const now = new Date();
    const aDue = a.due_date ? parseISO(a.due_date) : null;
    const bDue = b.due_date ? parseISO(b.due_date) : null;

    const aIsNear = aDue && differenceInDays(aDue, now) <= 2;
    const bIsNear = bDue && differenceInDays(bDue, now) <= 2;

    // Deadline Boost
    if (aIsNear && !bIsNear) return -1;
    if (!aIsNear && bIsNear) return 1;

    // AI Score
    if (b.ai_priority_score !== a.ai_priority_score) {
      return b.ai_priority_score - a.ai_priority_score;
    }

    // Due Date
    if (aDue && bDue) return aDue.getTime() - bDue.getTime();
    if (aDue) return -1;
    if (bDue) return 1;

    return 0;
  });

  const schedule: ScheduledTask[] = [];
  let currentDay = startOfDay(startDate);
  const maxDays = 14; // Limit scheduling to 2 weeks ahead
  let taskIndex = 0;

  for (let d = 0; d < maxDays && taskIndex < sortedTasks.length; d++) {
    const day = addDays(currentDay, d);
    
    for (const block of TIME_BLOCKS) {
      let blockPointer = setMinutes(setHours(day, block.start.h), block.start.m);
      const blockEnd = setMinutes(setHours(day, block.end.h), block.end.m);

      while (taskIndex < sortedTasks.length) {
        const task = sortedTasks[taskIndex];
        const duration = task.estimated_time || 30;
        const taskEnd = addMinutes(blockPointer, duration);

        if (isBefore(taskEnd, blockEnd) || isSameDay(taskEnd, blockEnd)) {
          schedule.push({
            task_id: task.id,
            title: task.title,
            date: format(day, 'yyyy-MM-dd'),
            start_time: blockPointer.toISOString(),
            end_time: taskEnd.toISOString(),
          });
          blockPointer = taskEnd;
          taskIndex++;
        } else {
          // Task doesn't fit in this block
          break;
        }
      }
    }
  }

  return schedule;
}

// Keep the old function for compatibility but update it to use the new logic if needed
// or just keep it as a simple "next available slot" helper
export function suggestSchedule(task: any, tasks: any[], preferredStart: number = 9) {
  const schedule = generateSchedule([...tasks, task]);
  const myTask = schedule.find(s => s.task_id === task.id);
  
  if (myTask) {
    return {
      start: myTask.start_time,
      end: myTask.end_time
    };
  }

  // Fallback
  const start = new Date();
  if (start.getHours() < preferredStart) {
    start.setHours(preferredStart, 0, 0, 0);
  } else {
    start.setHours(start.getHours() + 1);
  }
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (task.estimated_time || 60));

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
