export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  created_at: string;
  user_id: string;
  ai_priority_score: number;
  ai_last_scored_at?: string;
  ai_model?: string;
  estimated_time: number;
  duration_estimate: number | null;
  energy_level: 'low' | 'medium' | 'high' | null;
  tags: string[];
  suggested_schedule: { start: string; end: string } | null;
  is_rescheduled: boolean;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  actual_duration: number | null;
  total_elapsed: number;
  interruption_count: number;
  needs_attention: boolean;
  is_adjusted: boolean;
}

export interface UserProfile {
  id: string;
  last_ai_plan_at: string | null;
  preferred_working_hours: { start: number; end: number };
  productivity_score: number;
  created_at: string;
}
