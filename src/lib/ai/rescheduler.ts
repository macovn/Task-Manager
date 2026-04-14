import { parseISO, isBefore, addDays } from 'date-fns';
import { Task } from '../../types';
import { suggestSchedule } from './scheduler';

export function autoReschedule(tasks: Task[]): (Partial<Task> & { id: string })[] {
  const now = new Date();
  const updates: (Partial<Task> & { id: string })[] = [];

  tasks.forEach(task => {
    if (task.status !== 'done' && task.status !== 'archived' && task.due_date) {
      const dueDate = parseISO(task.due_date);
      
      if (isBefore(dueDate, now)) {
        // Task is overdue
        const newSchedule = suggestSchedule(task, tasks);
        
        updates.push({
          id: task.id,
          ai_priority_score: Math.min((task.ai_priority_score || 50) + 15, 100),
          is_rescheduled: true,
          due_date: newSchedule.start // Re-assign due date to the next available slot
        });
      }
    }
  });

  return updates;
}
