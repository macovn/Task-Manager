import { Task } from '../../types';
import { BehaviorInsights } from './behaviorModel';

export interface PerformanceMetrics {
  speed_score: number;
  focus_score: number;
  reliability_score: number;
}

export function calculatePerformance(tasks: Task[], insights: BehaviorInsights): PerformanceMetrics {
  // 1. Speed Score (0-100)
  // avg_speed = 1.0 is baseline (80 points)
  let speed_score = insights.avg_speed * 80;
  speed_score = Math.min(Math.max(speed_score, 0), 100);

  // 2. Focus Score (0-100)
  // Each interruption penalizes 15 points
  let focus_score = 100 - (insights.interruption_rate * 15);
  focus_score = Math.min(Math.max(focus_score, 0), 100);

  // 3. Reliability Score (0-100)
  // Ratio of completed tasks to total tasks that were supposed to be done
  const plannedTasks = tasks.filter(t => t.suggested_schedule || t.due_date);
  if (plannedTasks.length === 0) {
    return { speed_score, focus_score, reliability_score: 100 };
  }

  const completedPlanned = plannedTasks.filter(t => t.status === 'done').length;
  const reliability_score = (completedPlanned / plannedTasks.length) * 100;

  return {
    speed_score,
    focus_score,
    reliability_score
  };
}

export function getAdaptiveAdjustments(insights: BehaviorInsights) {
  const adjustments = {
    estimate_multiplier: 1.0,
    should_split_tasks: false,
    preferred_block_boost: insights.best_time_block
  };

  // IF speed > 1.2: increase future estimates (wait, if speed > 1.2 user is FAST, why increase estimates?)
  // Actually, usually if you are slow (speed < 1), you increase estimates.
  // But the prompt says: "IF speed > 1.2: increase future estimates". 
  // Maybe it means if the user is OVER-estimating? 
  // Let's follow the prompt exactly.
  if (insights.avg_speed > 1.2) {
    adjustments.estimate_multiplier = 1.2;
  } else if (insights.avg_speed < 0.8) {
    adjustments.estimate_multiplier = 1.5; // If slow, definitely increase estimates
  }

  if (insights.interruption_rate > 1.5) {
    adjustments.should_split_tasks = true;
  }

  return adjustments;
}
