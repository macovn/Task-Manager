import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { calculatePriority } from '../ai/priority';
import { suggestSchedule } from '../ai/scheduler';
import { Task } from '../../types';
import { useTasks } from './useTasks';

export function useUpdateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useTasks();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const currentTask = tasks.find(t => t.id === id);
      if (!currentTask) throw new Error('Task not found');

      const payload: any = { ...updates };

      // 1. Log events for behavior tracking
      if (updates.status === 'done' && currentTask.status !== 'done') {
        await taskService.logEvent({
          task_id: id,
          user_id: user?.id || '',
          event_type: 'task_completed',
          value: { title: currentTask.title }
        });
      }

      if (updates.due_date && currentTask.due_date && updates.due_date !== currentTask.due_date) {
        await taskService.logEvent({
          task_id: id,
          user_id: user?.id || '',
          event_type: 'task_rescheduled',
          value: { from: currentTask.due_date, to: updates.due_date }
        });
      }

      const isPriorityImpacted = 
        updates.due_date !== undefined || 
        updates.priority !== undefined || 
        updates.estimated_time !== undefined;

      if (isPriorityImpacted) {
        // Fetch user patterns for smarter suggestions
        const profile = await taskService.fetchProfile(user?.id || '');
        const delayFactor = profile?.productivity_score || 1.0;
        const preferredStart = profile?.preferred_working_hours?.start || 9;

        if (updates.ai_priority_score === undefined) {
          payload.ai_priority_score = calculatePriority({ ...currentTask, ...updates }, delayFactor);
        }

        if (updates.suggested_schedule === undefined) {
          payload.suggested_schedule = suggestSchedule({ ...currentTask, ...updates }, tasks, preferredStart);
        }
      }

      return taskService.updateTask(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });
}
