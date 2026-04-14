import { Task } from '../../types';
import { isBefore, parseISO } from 'date-fns';

/**
 * Calculates a Focus Score (0-100) based on task completion,
 * interruptions, and punctuality.
 */
export function calculateFocusScore(tasks: Task[]): number {
  const plannedTasks = tasks.filter(t => t.suggested_schedule);
  if (plannedTasks.length === 0) return 0;

  const completedTasks = plannedTasks.filter(t => t.status === 'done');
  
  // Base score: completion rate (up to 70 points)
  let score = (completedTasks.length / plannedTasks.length) * 70;

  // Bonus/Penalty points (up to 30 points)
  let bonus = 0;
  
  completedTasks.forEach(task => {
    // Interruption weight: fewer interruptions = better score
    if (task.interruption_count === 0) bonus += 2;
    else if (task.interruption_count === 1) bonus += 1;
    else bonus -= 2;

    // Punctuality weight: finishing on time
    if (task.completed_at && task.suggested_schedule) {
      const completedAt = parseISO(task.completed_at);
      const scheduledEnd = parseISO(task.suggested_schedule.end);
      
      if (isBefore(completedAt, scheduledEnd)) {
        bonus += 3;
      } else {
        bonus -= 3;
      }
    }
  });

  // Normalize bonus to be within reasonable bounds
  const normalizedBonus = Math.max(-10, Math.min(30, bonus));
  
  return Math.max(0, Math.min(100, Math.round(score + normalizedBonus)));
}
