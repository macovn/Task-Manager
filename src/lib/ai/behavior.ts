import { supabaseAdmin } from '../../../jobs/supabase-server';

export interface UserPattern {
  preferred_start: number;
  preferred_end: number;
  completion_rate: number;
  delay_factor: number;
}

export async function getUserPatterns(userId: string): Promise<UserPattern> {
  try {
    // 1. Fetch profile for base patterns
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. Fetch recent events to analyze behavior
    const { data: events } = await supabaseAdmin
      .from('task_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!events || events.length === 0) {
      return {
        preferred_start: profile?.preferred_working_hours?.start || 9,
        preferred_end: profile?.preferred_working_hours?.end || 17,
        completion_rate: 1.0,
        delay_factor: 1.0
      };
    }

    // Analyze completion hours
    const completionHours = events
      .filter(e => e.event_type === 'task_completed')
      .map(e => new Date(e.created_at).getHours());

    const delays = events.filter(e => e.event_type === 'task_delayed').length;
    const completions = events.filter(e => e.event_type === 'task_completed').length;

    // Simple heuristic for preferred hours (most frequent completion hours)
    let bestStart = profile?.preferred_working_hours?.start || 9;
    if (completionHours.length > 0) {
      const counts: Record<number, number> = {};
      completionHours.forEach(h => counts[h] = (counts[h] || 0) + 1);
      const sortedHours = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      bestStart = parseInt(sortedHours[0][0]);
    }

    return {
      preferred_start: bestStart,
      preferred_end: Math.min(bestStart + 8, 22),
      completion_rate: completions / (completions + delays || 1),
      delay_factor: 1 + (delays / (completions + delays || 1))
    };
  } catch (error) {
    console.error('Error getting user patterns:', error);
    return { preferred_start: 9, preferred_end: 17, completion_rate: 1.0, delay_factor: 1.0 };
  }
}

export async function logTaskEvent(userId: string, taskId: string, type: string, value: any = {}) {
  const { error } = await supabaseAdmin
    .from('task_events')
    .insert([{
      user_id: userId,
      task_id: taskId,
      event_type: type,
      value
    }]);
  
  if (error) console.error('Error logging task event:', error);
}
