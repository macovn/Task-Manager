import { Task } from '../../types';
import { differenceInHours, parseISO, isAfter, startOfDay } from 'date-fns';

export interface RiskAnalysis {
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number; // 0 to 100
}

/**
 * Analyzes the risk of a task based on its deadline and estimated time.
 * @param task The task to analyze
 * @param allTasks All tasks in the schedule to account for total workload (optional)
 */
export function analyzeTaskRisk(task: Task, allTasks: Task[] = []): RiskAnalysis {
  if (!task.due_date || task.status === 'done') {
    return { risk_level: 'low', risk_score: 0 };
  }

  const deadline = parseISO(task.due_date);
  const now = new Date();

  if (isAfter(now, deadline)) {
    return { risk_level: 'high', risk_score: 100 };
  }

  // Calculate available hours until deadline (assuming 8 working hours per day)
  const hoursUntilDeadline = differenceInHours(deadline, now);
  const daysUntilDeadline = Math.max(1, hoursUntilDeadline / 24);
  
  // Standard working hours per day
  const WORKING_HOURS_PER_DAY = 8;
  const availableWorkingMinutes = daysUntilDeadline * WORKING_HOURS_PER_DAY * 60;

  const estimatedMinutes = task.estimated_time || 30;
  
  // Risk Score calculation
  // ratio = estimated / available
  const ratio = estimatedMinutes / availableWorkingMinutes;
  const riskScore = Math.min(100, Math.round(ratio * 100));

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (ratio > 0.8) {
    riskLevel = 'high';
  } else if (ratio > 0.4) {
    riskLevel = 'medium';
  }

  return {
    risk_level: riskLevel,
    risk_score: riskScore
  };
}
