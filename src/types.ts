export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  created_at: string;
  user_id: string;
  ai_priority_score: number;
  estimated_time: number;
  duration_estimate: number | null;
  energy_level: 'low' | 'medium' | 'high' | null;
  tags: string[];
  suggested_schedule: { start: string; end: string } | null;
}

export interface UserProfile {
  id: string;
  last_ai_plan_at: string | null;
  preferred_working_hours: { start: number; end: number };
  productivity_score: number;
  created_at: string;
}
