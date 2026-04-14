import { useQuery } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';

export function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => taskService.fetchTasks(),
    enabled: !!user,
  });
}
