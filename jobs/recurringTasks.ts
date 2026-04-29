import { supabaseAdmin } from './supabase-server';
import { startOfMonth, setDate, format } from 'date-fns';

export async function runRecurringTasksJob() {
  console.log(`[${new Date().toISOString()}] Starting Recurring Tasks Cron Job...`);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1; // 1-12

  // Only run on the 1st of the month
  if (dayOfMonth !== 1) {
    console.log('Today is not the 1st of the month. Skipping recurring task generation.');
    return;
  }

  try {
    // 1. Fetch active templates
    const { data: templates, error: fetchError } = await supabaseAdmin
      .from('task_templates')
      .select('*')
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${templates?.length || 0} active templates.`);

    for (const template of templates || []) {
      const isQuarterly = template.frequency === 'quarterly';
      const isQuarterStart = [1, 4, 7, 10].includes(month);

      if (isQuarterly && !isQuarterStart) {
        continue;
      }

      // Generate task
      console.log(`Generating task from template: ${template.title}`);

      const dueDate = setDate(startOfMonth(now), template.due_day || 1);
      
      const { error: insertError } = await supabaseAdmin
        .from('tasks')
        .insert([{
          title: template.title,
          description: template.description,
          assignee_id: template.assigned_to,
          user_id: template.assigned_to, // Assuming template owner or assigned user
          status: 'todo',
          priority: 'medium',
          due_date: dueDate.toISOString(),
          template_id: template.id,
          ai_priority_score: 50, // Default
          is_key: false // Default
        }]);

      if (insertError) {
        console.error(`Error creating task for template ${template.id}:`, insertError);
      } else {
        console.log(`Successfully created task for template ${template.id}`);
      }
    }

    console.log(`[${new Date().toISOString()}] Recurring Tasks Cron Job Completed.`);
  } catch (error) {
    console.error('Critical Error in Recurring Tasks Job:', error);
  }
}
