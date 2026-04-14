import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { calculatePriority } from '../lib/ai/priority';
import { suggestSchedule } from '../lib/ai/scheduler';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  user_id: string;
  ai_priority_score: number;
  estimated_time: number;
  suggested_schedule: { start: string; end: string } | null;
}

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const ai_priority_score = calculatePriority(newTask);
      const suggested_schedule = suggestSchedule(newTask, tasks);

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ 
          ...newTask, 
          user_id: user?.id,
          ai_priority_score,
          suggested_schedule
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const currentTask = tasks.find(t => t.id === id);
      const payload: any = { ...updates };

      // 1. Log events for behavior tracking
      if (updates.status === 'done' && currentTask?.status !== 'done') {
        await supabase.from('task_events').insert([{
          task_id: id,
          user_id: user?.id,
          event_type: 'task_completed',
          value: { title: currentTask?.title }
        }]);
      }

      if (updates.due_date && currentTask?.due_date && updates.due_date !== currentTask.due_date) {
        await supabase.from('task_events').insert([{
          task_id: id,
          user_id: user?.id,
          event_type: 'task_rescheduled',
          value: { from: currentTask.due_date, to: updates.due_date }
        }]);
      }

      const isPriorityImpacted = 
        updates.due_date !== undefined || 
        updates.priority !== undefined || 
        updates.estimated_time !== undefined;

      // Fetch user patterns for smarter suggestions
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      const delayFactor = profile?.productivity_score || 1.0;
      const preferredStart = profile?.preferred_working_hours?.start || 9;

      // Recalculate AI priority score only if relevant fields changed and not provided explicitly
      if (updates.ai_priority_score === undefined && isPriorityImpacted && currentTask) {
        payload.ai_priority_score = calculatePriority({ ...currentTask, ...updates }, delayFactor);
      }

      // Recalculate suggested schedule only if relevant fields changed and not provided explicitly
      if (updates.suggested_schedule === undefined && isPriorityImpacted && currentTask) {
        payload.suggested_schedule = suggestSchedule({ ...currentTask, ...updates }, tasks, preferredStart);
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
  };
}
