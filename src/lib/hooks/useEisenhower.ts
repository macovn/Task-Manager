import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { getEisenhowerQuadrant, EisenhowerQuadrant } from '../ai/eisenhower';
import { Task } from '../../types';

export interface EisenhowerData {
  q1: Task[];
  q2: Task[];
  q3: Task[];
  q4: Task[];
}

export function useEisenhower() {
  const { data: tasks = [], isLoading, error } = useTasks();

  const quadrants = useMemo(() => {
    const result: EisenhowerData = {
      q1: [],
      q2: [],
      q3: [],
      q4: []
    };

    tasks.forEach(task => {
      if (task.status === 'done') return; // Only show active tasks
      const quadrant = getEisenhowerQuadrant(task);
      result[quadrant].push(task);
    });

    return result;
  }, [tasks]);

  return {
    quadrants,
    isLoading,
    error
  };
}
