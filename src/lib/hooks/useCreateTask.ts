import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { calculatePriority } from '../ai/gemini';
import { suggestSchedule } from '../ai/scheduler';
import { Task } from '../../types';
import { useTasks } from './useTasks';

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useTasks();

  return useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const aiResult = await calculatePriority(newTask);
      const suggested_schedule = suggestSchedule(newTask, tasks);

      return taskService.createTask({
        ...newTask,
        user_id: user?.id,
        ai_priority_score: aiResult.score,
        ai_model: aiResult.model,
        ai_last_scored_at: aiResult.scored_at,
        suggested_schedule
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });
}
