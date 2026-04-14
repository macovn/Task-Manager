import { useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { analyzeTaskRisk, RiskAnalysis } from '../lib/ai/riskEngine';
import { balanceWorkload } from '../lib/ai/workloadBalancer';
import { Task } from '../types';
import { format, parseISO } from 'date-fns';

export interface TaskWithRisk extends Task {
  risk: RiskAnalysis;
}

export function useRiskAnalysis() {
  const { data: tasks = [], isLoading } = useTasks();

  const tasksWithRisk = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      risk: analyzeTaskRisk(task, tasks)
    }));
  }, [tasks]);

  const balancedTasks = useMemo(() => {
    if (tasks.length === 0) return [];
    return balanceWorkload(tasks);
  }, [tasks]);

  const stats = useMemo(() => {
    const atRiskCount = tasksWithRisk.filter(t => t.risk.risk_level === 'high' && t.status !== 'done').length;
    
    // Count overloaded days
    const dayMinutes: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.suggested_schedule && t.status !== 'done') {
        const day = format(parseISO(t.suggested_schedule.start), 'yyyy-MM-dd');
        dayMinutes[day] = (dayMinutes[day] || 0) + (t.estimated_time || 0);
      }
    });
    
    const overloadedDaysCount = Object.values(dayMinutes).filter(m => m > 480).length;

    return {
      atRiskCount,
      overloadedDaysCount
    };
  }, [tasksWithRisk, tasks]);

  return {
    tasksWithRisk,
    balancedTasks,
    stats,
    isLoading
  };
}
