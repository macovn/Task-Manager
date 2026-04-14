import { Task } from '../../types';
import { analyzeTaskRisk } from './riskEngine';
import { addDays, format, parseISO, startOfDay, isSameDay } from 'date-fns';

/**
 * Balances the workload across days to ensure no day exceeds 480 minutes (8 hours).
 * @param tasks List of tasks to balance
 */
export function balanceWorkload(tasks: Task[]): Task[] {
  const MAX_MINUTES_PER_DAY = 480;
  const updatedTasks = [...tasks];
  
  // Group tasks by day based on suggested_schedule
  // We only care about tasks that have a schedule and are not done
  const scheduledTasks = updatedTasks.filter(t => t.suggested_schedule && t.status !== 'done');
  
  // Sort tasks by date
  scheduledTasks.sort((a, b) => {
    return parseISO(a.suggested_schedule!.start).getTime() - parseISO(b.suggested_schedule!.start).getTime();
  });

  const days = new Set(scheduledTasks.map(t => format(parseISO(t.suggested_schedule!.start), 'yyyy-MM-dd')));
  const sortedDays = Array.from(days).sort();

  for (const dayStr of sortedDays) {
    let dayTasks = scheduledTasks.filter(t => format(parseISO(t.suggested_schedule!.start), 'yyyy-MM-dd') === dayStr);
    let totalMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_time || 0), 0);

    while (totalMinutes > MAX_MINUTES_PER_DAY) {
      // Find candidates to move
      // Rules: Không move task high risk, không move task gần deadline
      const candidates = dayTasks.filter(t => {
        const risk = analyzeTaskRisk(t, updatedTasks);
        const isHighRisk = risk.risk_level === 'high';
        
        // Near deadline: deadline within 24 hours of current schedule
        const deadline = t.due_date ? parseISO(t.due_date) : null;
        const scheduleStart = parseISO(t.suggested_schedule!.start);
        const isNearDeadline = deadline ? (deadline.getTime() - scheduleStart.getTime() < 24 * 60 * 60 * 1000) : false;

        return !isHighRisk && !isNearDeadline;
      });

      if (candidates.length === 0) break; // Nothing more we can move safely

      // Find lowest priority candidate
      // Priority order: low (0), medium (1), high (2)
      const priorityMap = { low: 0, medium: 1, high: 2 };
      candidates.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
      
      const taskToMove = candidates[0];
      
      // Move to next day
      const currentStart = parseISO(taskToMove.suggested_schedule!.start);
      const currentEnd = parseISO(taskToMove.suggested_schedule!.end);
      const nextDayStart = addDays(currentStart, 1);
      const nextDayEnd = addDays(currentEnd, 1);

      taskToMove.suggested_schedule = {
        start: nextDayStart.toISOString(),
        end: nextDayEnd.toISOString()
      };
      taskToMove.is_adjusted = true;

      // Update local loop variables
      dayTasks = dayTasks.filter(t => t.id !== taskToMove.id);
      totalMinutes -= (taskToMove.estimated_time || 0);
    }
  }

  return updatedTasks;
}
