import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { generateSchedule, ScheduledTask } from '../ai/scheduler';

export function useScheduler() {
  const { data: tasks = [], isLoading } = useTasks();

  const schedule = useMemo(() => {
    if (isLoading || tasks.length === 0) return [];
    return generateSchedule(tasks);
  }, [tasks, isLoading]);

  const getDaySchedule = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedule.filter(s => s.date === dateStr);
  };

  return {
    schedule,
    isLoading,
    getDaySchedule,
  };
}
