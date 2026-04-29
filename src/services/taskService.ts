import { getSupabaseClient } from '../lib/supabase/client';
import { Task } from '../types';
import { sanitizeInput } from '../lib/utils';

export const taskService = {
  async fetchTasks() {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) throw new Error('Unauthorized');

    // 1. Fetch tasks from API
    const response = await fetch('/api/tasks', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const tasks = await response.json();
    if (!tasks || tasks.length === 0) return [];

    // 2. Fetch all users from the API (for joining)
    let profileMap = new Map();
    try {
      const usersResponse = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        profileMap = new Map(users.map((u: any) => [u.id, u]));
      }
    } catch (err) {
      console.warn('[fetchTasks] Error fetching users for join:', err);
    }

    const tasksWithAssignee = tasks.map((task: any) => {
      const profile = task.assignee_id ? profileMap.get(task.assignee_id) : null;
      
      // Decode is_key and key_type from tags if missing as columns
      let is_key = !!task.is_key;
      let key_type = task.key_type;
      
      if (task.tags && Array.isArray(task.tags)) {
        if (task.tags.includes('system:key:true')) {
          is_key = true;
        }
        const typeTag = task.tags.find((t: string) => t.startsWith('system:key:type:'));
        if (typeTag) {
          key_type = typeTag.replace('system:key:type:', '') as any;
        }
      }

      return {
        ...task,
        is_key,
        key_type,
        assignee: profile ? {
          id: profile.id,
          full_name: profile.full_name || null,
          role: profile.role || null,
          email: profile.email || null
        } : null
      };
    });

    return tasksWithAssignee as Task[];
  },

  async createTask(task: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create task');
    }

    return await response.json() as Task;
  },

  async updateTask(id: string, updates: Partial<Task>) {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update task');
    }

    return await response.json() as Task;
  },

  async deleteTask(id: string) {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete task');
    }
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
