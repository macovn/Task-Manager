import { supabaseAdmin } from './supabase-server';
import { generateDailyPlanServer } from '../src/lib/ai/gemini-server';
import { getUserPatterns, logTaskEvent } from '../src/lib/ai/behavior';
import { addDays, startOfDay } from 'date-fns';

export async function runDailyPlannerJob() {
  console.log(`[${new Date().toISOString()}] Starting Daily Planner Cron Job...`);

  try {
    // 1. Fetch all users
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (profileError) throw profileError;

    console.log(`Found ${profiles.length} users to process.`);

    for (const profile of profiles) {
      const userId = profile.id;
      try {
        console.log(`Processing user: ${userId}`);

        // 2. Self-Optimization: Learn from behavior
        const patterns = await getUserPatterns(userId);
        console.log(`Learned patterns for ${userId}:`, patterns);

        // Update profile with new insights
        await supabaseAdmin
          .from('profiles')
          .update({
            preferred_working_hours: { start: patterns.preferred_start, end: patterns.preferred_end },
            productivity_score: patterns.delay_factor
          })
          .eq('id', userId);

        // 3. Reschedule Logic: Overdue tasks -> Today
        const today = startOfDay(new Date());
        const { data: overdueTasks, error: overdueError } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'done')
          .lt('due_date', today.toISOString());

        if (overdueError) throw overdueError;

        if (overdueTasks && overdueTasks.length > 0) {
          console.log(`Rescheduling ${overdueTasks.length} overdue tasks for user ${userId}`);
          const tomorrow = addDays(today, 1).toISOString();
          
          for (const task of overdueTasks) {
            // Log delay event
            await logTaskEvent(userId, task.id, 'task_delayed', { original_due: task.due_date });

            await supabaseAdmin
              .from('tasks')
              .update({ due_date: tomorrow })
              .eq('id', task.id);
          }
        }

        // 4. Fetch tasks for today to plan
        const { data: todayTasks, error: fetchError } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'done')
          .gte('due_date', today.toISOString())
          .lt('due_date', addDays(today, 1).toISOString());

        if (fetchError) throw fetchError;

        if (todayTasks && todayTasks.length > 0) {
          // 5. Generate AI Plan (Gemini)
          const plan = await generateDailyPlanServer(todayTasks);
          
          if (plan && plan.length > 0) {
            // 6. Apply Plan
            for (const item of plan) {
              await supabaseAdmin
                .from('tasks')
                .update({
                  suggested_schedule: {
                    start: item.start,
                    end: item.end
                  }
                })
                .eq('id', item.task_id);
            }
          }
        }

        // 7. Update AI Status
        await supabaseAdmin
          .from('profiles')
          .update({ last_ai_plan_at: new Date().toISOString() })
          .eq('id', userId);

      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
      }
    }

    console.log(`[${new Date().toISOString()}] Daily Planner Cron Job Completed.`);
  } catch (error) {
    console.error('Critical Error in Daily Planner Job:', error);
  }
}
