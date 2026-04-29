import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskTemplate } from '../../types';

async function fetchTemplates(token: string): Promise<TaskTemplate[]> {
  const res = await fetch('/api/admin/task-templates', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export function useTaskTemplates(token: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-templates'],
    queryFn: () => fetchTemplates(token!),
    enabled: !!token
  });

  const createMutation = useMutation({
    mutationFn: async (newTemplate: Partial<TaskTemplate>) => {
      const res = await fetch('/api/admin/task-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTemplate)
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskTemplate> & { id: string }) => {
      const res = await fetch(`/api/admin/task-templates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/task-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    }
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    createTemplate: createMutation,
    updateTemplate: updateMutation,
    deleteTemplate: deleteMutation
  };
}
