import { getSupabaseClient } from '../lib/supabase/client';
import { Task } from '../types';
import { sanitizeInput } from '../lib/utils';

export const taskService = {
  async fetchTasks() {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Task[];
  },

  async createTask(task: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    let currentTask = { 
      ...task,
      user_id: user.id,
      title: sanitizeInput(task.title || ''),
      description: sanitizeInput(task.description || '')
    };
    
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

      // Audit Log
      await this.logAudit(user.id, 'CREATE_TASK', 'task', { taskId: data.id });

      return data as Task;
    }
    throw new Error('Failed to create task after multiple attempts to filter missing columns');
  },

  async updateTask(id: string, updates: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    console.log('Supabase Update Request:', { id, updates });
    
    let currentUpdates = { ...updates };
    
    if (updates.title !== undefined) currentUpdates.title = sanitizeInput(updates.title);
    if (updates.description !== undefined) currentUpdates.description = sanitizeInput(updates.description);

    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      const { data, error } = await supabase
        .from('tasks')
        .update(currentUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
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
      
      // Audit Log
      await this.logAudit(user.id, 'UPDATE_TASK', 'task', { taskId: id, updates: Object.keys(updates) });

      console.log('Supabase Update Success:', data);
      return data as Task;
    }
    
    throw new Error('Failed to update task after multiple attempts to filter missing columns');
  },

  async deleteTask(id: string) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;

    // Audit Log
    await this.logAudit(user.id, 'DELETE_TASK', 'task', { taskId: id });
  },

  async logAudit(userId: string, action: string, entity: string, metadata: any = {}) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action,
        entity,
        metadata,
        timestamp: new Date().toISOString()
      }]);
    
    if (error) {
      console.warn('Error logging audit (table might be missing):', error.message);
    }
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== userId) {
      console.warn('Unauthorized profile fetch attempt');
      return null;
    }

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
