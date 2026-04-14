import { Task } from '../../types';
import { parseISO, getHours } from 'date-fns';

export interface BehaviorInsights {
  avg_speed: number;
  interruption_rate: number;
  best_time_block: 'morning' | 'afternoon' | 'evening';
  total_completed: number;
}

export function analyzeBehavior(tasks: Task[]): BehaviorInsights {
  const completedTasks = tasks.filter(t => t.status === 'done' && t.actual_duration && t.estimated_time);
  
  if (completedTasks.length === 0) {
    return {
      avg_speed: 1,
      interruption_rate: 0,
      best_time_block: 'morning',
      total_completed: 0
    };
  }

  // 1. Calculate Average Speed (actual / estimated)
  // If actual < estimated, speed > 1 (faster)
  // If actual > estimated, speed < 1 (slower)
  // But user request says: IF speed > 1.2: increase future estimates.
  // This implies speed = estimated / actual. 
  // If estimated = 60, actual = 30, speed = 2 (very fast).
  // If estimated = 60, actual = 120, speed = 0.5 (slow).
  const totalSpeed = completedTasks.reduce((acc, t) => {
    const speed = t.estimated_time / (t.actual_duration || t.estimated_time);
    return acc + speed;
  }, 0);
  const avg_speed = totalSpeed / completedTasks.length;

  // 2. Interruption Rate
  const totalInterruptions = completedTasks.reduce((acc, t) => acc + (t.interruption_count || 0), 0);
  const interruption_rate = totalInterruptions / completedTasks.length;

  // 3. Best Time Block
  const timeBlocks = {
    morning: 0,
    afternoon: 0,
    evening: 0
  };

  completedTasks.forEach(t => {
    if (!t.completed_at) return;
    const hour = getHours(parseISO(t.completed_at));
    
    if (hour >= 5 && hour < 12) timeBlocks.morning++;
    else if (hour >= 12 && hour < 18) timeBlocks.afternoon++;
    else timeBlocks.evening++;
  });

  let best_time_block: 'morning' | 'afternoon' | 'evening' = 'morning';
  if (timeBlocks.afternoon > timeBlocks.morning && timeBlocks.afternoon > timeBlocks.evening) {
    best_time_block = 'afternoon';
  } else if (timeBlocks.evening > timeBlocks.morning && timeBlocks.evening > timeBlocks.afternoon) {
    best_time_block = 'evening';
  }

  return {
    avg_speed,
    interruption_rate,
    best_time_block,
    total_completed: completedTasks.length
  };
}
