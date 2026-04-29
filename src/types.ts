export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
  };
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
  is_key: boolean;
  key_type: 'month' | 'quarter' | null;
  template_id: string | null;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  frequency: 'monthly' | 'quarterly';
  due_day: number;
  assigned_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'giam_doc' | 'pho_giam_doc' | 'truong_phong' | 'pho_truong_phong' | 'nhan_vien';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  last_ai_plan_at: string | null;
  preferred_working_hours: { start: number; end: number };
  productivity_score: number;
  created_at: string;
}
