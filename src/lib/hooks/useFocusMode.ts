import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { Task } from '../../types';
import { useFocusStore } from '../../store/useFocusStore';
import { useTasks } from './useTasks';

export function useFocusMode() {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useTasks();
  const { activeTaskId, elapsedTime, isPaused, setActiveTaskId, setElapsedTime, setIsPaused } = useFocusStore();

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => 
      taskService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  useEffect(() => {
    let interval: any;
    if (activeTaskId && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId, isPaused, setElapsedTime]);

  const startTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setActiveTaskId(taskId);
    setIsPaused(false);
    
    // Resume if total_elapsed exists
    if (task.total_elapsed > 0) {
      setElapsedTime(task.total_elapsed);
    } else {
      setElapsedTime(0);
    }

    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        status: 'in_progress',
        started_at: task.started_at || new Date().toISOString(),
        paused_at: null,
      },
    });
  };

  const pauseTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsPaused(true);
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        paused_at: new Date().toISOString(),
        total_elapsed: elapsedTime,
        interruption_count: (task.interruption_count || 0) + 1,
        needs_attention: (task.interruption_count || 0) + 1 > 2,
      },
    });
  };

  const resumeTask = (taskId: string) => {
    setIsPaused(false);
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        paused_at: null,
      },
    });
  };

  const completeTask = (taskId: string, estimatedTime: number) => {
    const completedAt = new Date().toISOString();
    const actualDuration = Math.round(elapsedTime / 60); // in minutes
    
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        status: 'done',
        completed_at: completedAt,
        actual_duration: actualDuration,
        total_elapsed: elapsedTime,
        paused_at: null,
      },
    });

    if (actualDuration > estimatedTime) {
      console.log(`Learning: Task ${taskId} took ${actualDuration - estimatedTime}m longer than estimated.`);
    }

    setActiveTaskId(null);
    setElapsedTime(0);
    setIsPaused(false);
  };

  const stopTask = () => {
    setActiveTaskId(null);
    setElapsedTime(0);
    setIsPaused(false);
  };

  return {
    activeTaskId,
    elapsedTime,
    isPaused,
    startTask,
    pauseTask,
    resumeTask,
    completeTask,
    stopTask,
    isUpdating: updateTaskMutation.isPending
  };
}
