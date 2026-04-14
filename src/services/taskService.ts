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
    let currentTask = { ...task };
    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([currentTask])
        .select()
        .single();
      
      if (error) {
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          const match = error.message.match(/column "(.+)" of relation "tasks" does not exist/);
          if (match && match[1]) {
            const missingColumn = match[1];
            console.warn(`Column ${missingColumn} missing in DB. Removing from insert payload.`);
            delete (currentTask as any)[missingColumn];
            attempt++;
            continue;
          }
        }
        throw error;
      }
      return data as Task;
    }
    throw new Error('Failed to create task after multiple attempts to filter missing columns');
  },

  async updateTask(id: string, updates: Partial<Task>) {
    const supabase = getSupabaseClient();
    console.log('Supabase Update Request:', { id, updates });
    
    let currentUpdates = { ...updates };
    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      const { data, error } = await supabase
        .from('tasks')
        .update(currentUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        // Handle "column does not exist" error
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          const match = error.message.match(/column tasks\.(.+) does not exist/);
          if (match && match[1]) {
            const missingColumn = match[1];
            console.warn(`Column ${missingColumn} missing in DB. Removing from update payload.`);
            delete (currentUpdates as any)[missingColumn];
            attempt++;
            continue;
          }
        }
        
        console.error('Supabase Update Error:', error);
        throw error;
      }
      
      console.log('Supabase Update Success:', data);
      return data as Task;
    }
    
    throw new Error('Failed to update task after multiple attempts to filter missing columns');
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
    
    if (error) {
      console.warn('Error logging event (table might be missing):', error.message);
    }
  },

  async fetchProfile(userId: string) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('404')) {
          console.warn('Profile not found or table missing, returning null');
          return null;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
      return null;
    }
  }
};
