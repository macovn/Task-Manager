import { isBefore, isAfter, parseISO, addMinutes, startOfDay, addDays, setHours, setMinutes, isSameDay, format } from 'date-fns';
import { Task } from '../../types';
import { ScheduledTask } from './scheduler';

const TIME_BLOCKS = [
  { id: 'morning', start: { h: 7, m: 30 }, end: { h: 12, m: 0 }, energy: 'high' },
  { id: 'afternoon', start: { h: 13, m: 0 }, end: { h: 16, m: 30 }, energy: 'medium' },
  { id: 'evening', start: { h: 17, m: 0 }, end: { h: 20, m: 0 }, energy: 'low' },
];

/**
 * Smart Reschedule: Only moves overdue or missed tasks to the next available free slots.
 * Handles full days by moving to the next day (up to 7 days).
 * Implements energy fallback logic.
 */
export function smartReschedule(tasks: Task[], currentSchedule: ScheduledTask[]): Partial<Task>[] {
  const now = new Date();
  const updates: Partial<Task>[] = [];

  console.log('[SmartReschedule] Starting reschedule for overdue/missed tasks');

  // 1. Identify tasks that need rescheduling
  const tasksToReschedule = tasks.filter(task => {
    if (task.status === 'done' || task.status === 'archived') return false;
    
    const isOverdue = task.due_date && isBefore(parseISO(task.due_date), now);
    const missedSlot = task.suggested_schedule && isBefore(parseISO(task.suggested_schedule.end), now);
    
    return isOverdue || missedSlot;
  });

  console.log(`[SmartReschedule] Found ${tasksToReschedule.length} tasks to reschedule`);
  if (tasksToReschedule.length === 0) return [];

  // 2. Map current valid schedule to occupied slots
  const occupiedSlots = currentSchedule
    .filter(s => {
      const task = tasks.find(t => t.id === s.task_id);
      return task && 
             !tasksToReschedule.find(tr => tr.id === s.task_id) && 
             isAfter(parseISO(s.end_time), now);
    })
    .map(s => ({
      start: parseISO(s.start_time),
      end: parseISO(s.end_time)
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // 3. Find new slots for the identified tasks
  let taskIdx = 0;

  while (taskIdx < tasksToReschedule.length) {
    const task = tasksToReschedule[taskIdx];
    let found = false;
    let attemptedDays = 0;
    const maxDays = 7;

    console.log(`[SmartReschedule] Attempting to find slot for task: ${task.title} (Energy: ${task.energy_level || 'none'})`);

    for (let d = 0; d < maxDays && !found; d++) {
      attemptedDays++;
      const day = addDays(startOfDay(now), d);
      
      // Try each block
      for (const block of TIME_BLOCKS) {
        // Energy Fallback Logic
        const isEnergyMatch = !task.energy_level || 
                             (task.energy_level === 'high' && block.energy === 'high') ||
                             (task.energy_level === 'medium' && (block.energy === 'high' || block.energy === 'medium')) ||
                             (task.energy_level === 'low');

        // Allow fallback if we've tried a few days or if it's the only option
        const allowFallback = d > 1 || !task.energy_level;
        
        if (!isEnergyMatch && !allowFallback) continue;

        let blockPointer = setMinutes(setHours(day, block.start.h), block.start.m);
        const blockEnd = setMinutes(setHours(day, block.end.h), block.end.m);

        if (isBefore(blockPointer, now)) blockPointer = now;

        while (isBefore(blockPointer, blockEnd)) {
          const duration = task.estimated_time || 30;
          let taskStart = blockPointer;
          let taskEnd = addMinutes(taskStart, duration);

          if (isAfter(taskEnd, blockEnd)) break;

          const overlap = occupiedSlots.find(slot => 
            (isBefore(taskStart, slot.end) && isAfter(taskEnd, slot.start))
          );

          if (overlap) {
            blockPointer = overlap.end;
            continue;
          }

          // Found a slot!
          console.log(`[SmartReschedule] Slot found for ${task.title} on ${format(day, 'yyyy-MM-dd')} at ${format(taskStart, 'HH:mm')}`);
          updates.push({
            id: task.id,
            suggested_schedule: {
              start: taskStart.toISOString(),
              end: taskEnd.toISOString()
            },
            is_rescheduled: true,
            is_adjusted: !isEnergyMatch,
            ai_priority_score: Math.min(100, task.ai_priority_score + 15)
          });
          
          // Add to occupied slots so next tasks don't overlap
          occupiedSlots.push({ start: taskStart, end: taskEnd });
          occupiedSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
          
          found = true;
          break;
        }
      }
    }

    if (!found) {
      console.error(`[SmartReschedule] FAILED to find slot for ${task.title} after ${attemptedDays} days. Capacity likely full.`);
      // Absolute Fallback: Just put it at the end of the last block searched
      const lastDay = addDays(startOfDay(now), maxDays - 1);
      const lastBlock = TIME_BLOCKS[TIME_BLOCKS.length - 1];
      const fallbackStart = setMinutes(setHours(lastDay, lastBlock.start.h), lastBlock.start.m);
      const fallbackEnd = addMinutes(fallbackStart, task.estimated_time || 30);
      
      updates.push({
        id: task.id,
        suggested_schedule: {
          start: fallbackStart.toISOString(),
          end: fallbackEnd.toISOString()
        },
        is_rescheduled: true,
        is_adjusted: true,
        ai_priority_score: Math.min(100, task.ai_priority_score + 15)
      });
    }

    taskIdx++;
  }

  return updates;
}
