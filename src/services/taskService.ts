import { getSupabaseClient } from '../lib/supabase/client';
import { Task } from '../types';

export const taskService = {
  async fetchTasks() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Task[];
  },

  async createTask(task: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
  },

  async updateTask(id: string, updates: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
  },

  async deleteTask(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async logEvent(event: { task_id: string; user_id: string; event_type: string; value: any }) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('task_events')
      .insert([event]);
    
    if (error) console.error('Error logging event:', error);
  },

  async fetchProfile(userId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
};
