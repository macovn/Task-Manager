import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cron from 'node-cron';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { runDailyPlannerJob } from './jobs/dailyPlanner';
import { runRecurringTasksJob } from './jobs/recurringTasks';
import { calculatePriority } from './src/lib/ai/gemini';
import { canAssign, UserRole } from './src/lib/rbac';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// Initialize Supabase for Auth verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

// Helper for audit logging
const logAudit = async (userId: string, action: string, entity: string, metadata: any = {}) => {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action,
        entity,
        metadata,
        timestamp: new Date().toISOString()
      }]);
    if (error) console.warn('[Audit Log Error]', error.message);
  } catch (err) {
    console.error('[Audit Log Critical Error]', err);
  }
};

// Middleware to verify Supabase JWT
const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

const isAdminMiddleware = async (req: any, res: any, next: any) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Quyền truy cập bị từ chối. Yêu cầu quyền Quản trị viên.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xác thực hệ thống.' });
  }
};

// Rate limiter for AI endpoints - Combined User ID + IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  keyGenerator: (req: any) => {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return `${userId}-${ip}`;
  },
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const VALID_TASK_COLUMNS = [
  'id', 'title', 'description', 'status', 'priority', 'due_date',
  'assignee_id', 'created_at', 'user_id', 'ai_priority_score',
  'estimated_time', 'suggested_schedule', 'duration_estimate',
  'start_date', 'energy_level', 'tags', 'ai_last_scored_at',
  'ai_model', 'is_rescheduled', 'is_adjusted', 'paused_at',
  'total_elapsed', 'interruption_count', 'needs_attention',
  'started_at', 'completed_at', 'actual_duration', 'template_id'
];

const sanitizeTaskData = (data: any) => {
  const sanitized: any = {};
  VALID_TASK_COLUMNS.forEach(col => {
    if (data[col] !== undefined) {
      sanitized[col] = data[col];
    }
  });

  // Fallback for is_key and key_type if columns are missing
  if (data.is_key !== undefined || data.key_type !== undefined) {
    const tags = data.tags || sanitized.tags || [];
    
    // Remove old system tags if any
    const filteredTags = tags.filter((t: string) => !t.startsWith('system:key:'));
    
    if (data.is_key === true) {
      filteredTags.push('system:key:true');
      if (data.key_type) {
        filteredTags.push(`system:key:type:${data.key_type}`);
      }
    }
    sanitized.tags = filteredTags;
  }

  return sanitized;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Cron Job Schedule (07:00 AM daily)
  cron.schedule('0 7 * * *', () => {
    runDailyPlannerJob();
  });

  // Recurring Tasks Job Schedule (00:01 AM daily)
  cron.schedule('1 0 * * *', () => {
    runRecurringTasksJob();
  });

  // Manual trigger for testing
  app.post('/api/admin/run-job', requireAuth, isAdminMiddleware, async (req: any, res) => {
    try {
      const { jobType } = req.body;
      
      if (jobType === 'recurring') {
        await runRecurringTasksJob();
      } else {
        await runDailyPlannerJob();
      }
      
      res.json({ message: 'Job started successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Template CRUD
  app.get('/api/admin/task-templates', requireAuth, isAdminMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('task_templates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/task-templates', requireAuth, isAdminMiddleware, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('task_templates').insert([req.body]).select().single();
      if (error) throw error;
      await logAudit(req.user.id, 'CREATE_TEMPLATE', 'task_template', { templateId: data.id });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/admin/task-templates/:id', requireAuth, isAdminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin.from('task_templates').update(req.body).eq('id', id).select().single();
      if (error) throw error;
      await logAudit(req.user.id, 'UPDATE_TEMPLATE', 'task_template', { templateId: id });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/task-templates/:id', requireAuth, isAdminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin.from('task_templates').delete().eq('id', id);
      if (error) throw error;
      await logAudit(req.user.id, 'DELETE_TEMPLATE', 'task_template', { templateId: id });
      res.json({ message: 'Template deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/score', requireAuth, aiLimiter, async (req: any, res) => {
    const { task, delayFactor } = req.body;
    
    try {
      const scoreData = await calculatePriority(task, delayFactor);
      res.json(scoreData);
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: 'Failed to calculate priority' });
    }
  });

  app.post('/api/ai/plan', requireAuth, aiLimiter, async (req: any, res) => {
    const { tasks } = req.body;
    
    try {
      const { generateDailyPlan } = await import('./src/lib/ai/gemini');
      const plan = await generateDailyPlan(tasks);
      res.json({ plan });
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: 'Failed to generate plan' });
    }
  });

  app.post('/api/ai/breakdown', requireAuth, aiLimiter, async (req: any, res) => {
    const { title } = req.body;
    
    try {
      const { generateSubtasks } = await import('./src/lib/ai/gemini');
      const subtasks = await generateSubtasks(title);
      res.json({ subtasks });
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: 'Failed to breakdown task' });
    }
  });

  app.post('/api/ai/eisenhower-action', requireAuth, aiLimiter, async (req: any, res) => {
    const { task, quadrant } = req.body;
    
    try {
      const { getEisenhowerActionSuggestion } = await import('./src/lib/ai/gemini');
      const suggestion = await getEisenhowerActionSuggestion(task, quadrant);
      res.json(suggestion);
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: 'Failed to get suggestion' });
    }
  });

  // Task Management with RBAC
  app.get('/api/tasks', requireAuth, async (req: any, res) => {
    const userId = req.user.id;
    try {
      const { data: tasks, error } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assignee_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(tasks);
    } catch (error: any) {
      console.error('[Fetch Tasks Error]', error);
      res.status(500).json({ error: 'Không thể lấy danh sách nhiệm vụ' });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: any, res) => {
    const taskData = req.body;
    const fromUserId = req.user.id;
    const toUserId = taskData.assignee_id || fromUserId;
    const isSelf = fromUserId === toUserId;

    try {
      // 1. Get fromRole
      const { data: fromProfile, error: fromError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', fromUserId)
        .single();
      
      if (fromError || !fromProfile) {
        return res.status(403).json({ error: 'User profile not found. Cannot verify role.' });
      }

      // 2. Get toRole (if different person)
      let toRole = fromProfile.role;
      if (!isSelf) {
        const { data: toProfile, error: toError } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', toUserId)
          .single();
        
        if (toError || !toProfile) {
          return res.status(400).json({ error: 'Assignee profile not found.' });
        }
        toRole = toProfile.role;
      }

      // 3. RBAC Check
      if (!canAssign(fromProfile.role as UserRole, toRole as UserRole, isSelf)) {
        return res.status(403).json({ error: `Permission denied: ${fromProfile.role} cannot assign task to ${toRole}` });
      }

      // 4. Create Task
      const sanitized = sanitizeTaskData(taskData);
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert([{ ...sanitized, user_id: fromUserId }])
        .select()
        .single();

      if (error) throw error;
      
      await logAudit(fromUserId, 'CREATE_TASK', 'task', { taskId: data.id, assigneeId: toUserId });
      res.json(data);
    } catch (error: any) {
      console.error('[RBAC Task Error]', error);
      res.status(500).json({ error: error.message || 'Failed to create task' });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fromUserId = req.user.id;

    try {
      const { data: existingTask, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('assignee_id, user_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingTask) return res.status(404).json({ error: 'Task not found' });

      // If assignee is changing, perform RBAC check
      if (updates.assignee_id && updates.assignee_id !== existingTask.assignee_id) {
        const toUserId = updates.assignee_id;
        const isSelf = fromUserId === toUserId;

        const { data: fromProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', fromUserId).single();
        const { data: toProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', toUserId).single();

        if (!fromProfile || !toProfile || !canAssign(fromProfile.role as UserRole, toProfile.role as UserRole, isSelf)) {
          return res.status(403).json({ error: 'Permission denied for reassignment' });
        }
      }

      const sanitized = sanitizeTaskData(updates);
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .update(sanitized)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Update Task Error]', error);
        throw error;
      }
      
      await logAudit(fromUserId, 'UPDATE_TASK', 'task', { taskId: id, updates: Object.keys(updates) });
      res.json(data);
    } catch (error: any) {
      console.error('[Update Task Catch]', error);
      res.status(500).json({ error: error.message || 'Failed to update task' });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      // Fetch task to check ownership
      const { data: task, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !task) return res.status(404).json({ error: 'Nhiệm vụ không tồn tại' });
      
      // Only creator can delete (or admin if we add that later)
      if (task.user_id !== userId) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa nhiệm vụ này' });
      }

      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await logAudit(userId, 'DELETE_TASK', 'task', { taskId: id });
      res.json({ message: 'Task deleted' });
    } catch (error: any) {
      console.error('[Delete Task Error]', error);
      res.status(500).json({ error: 'Không thể xóa nhiệm vụ' });
    }
  });

  app.get('/api/users/me', requireAuth, async (req: any, res) => {
    try {
      let { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Self-healing: Profile missing, create it
        const newProfileData: any = { 
          id: req.user.id, 
          role: 'nhan_vien', 
          full_name: req.user.user_metadata?.full_name || ''
        };
        
        // Only add email if it's likely to exist in schema (resilience)
        // We try to insert with email first, but we handle it
        try {
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert([{ ...newProfileData, email: req.user.email }])
            .select()
            .single();
          
          if (createError) {
             // If error is about missing column, try without email
             if (createError.message.includes('column "email" of relation "profiles" does not exist')) {
               const { data: fallbackProfile, error: fallbackError } = await supabaseAdmin
                 .from('profiles')
                 .insert([newProfileData])
                 .select()
                 .single();
               if (fallbackError) throw fallbackError;
               profile = fallbackProfile;
             } else {
               throw createError;
             }
          } else {
            profile = newProfile;
          }
        } catch (innerErr) {
          throw innerErr;
        }
      } else if (error) {
        throw error;
      }

      res.json(profile);
    } catch (error: any) {
      console.error('[Profile Me Error]', error);
      res.status(500).json({ error: 'Failed to fetch your profile' });
    }
  });

  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      // Fetch all user profiles. We select fields explicitly. 
      // If email doesn't exist in DB yet, this might fail, so we fetch * and handle in JS if needed
      // or we just fetch id, role, full_name, email (assuming we added it)
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*');
      
      if (error) {
        console.error('[Users List Supabase Error]', error);
        throw error;
      }
      res.json(profiles);
    } catch (error: any) {
      console.error('[Users List Route Error]', error);
      res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
  });

  // Admin User Management Endpoints
  app.get('/api/admin/users', requireAuth, isAdminMiddleware, async (req, res) => {
    try {
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
      if (profileError) throw profileError;

      const mergedUsers = users.map(u => {
        const prof = profiles.find(p => p.id === u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: prof?.full_name || '',
          role: prof?.role || 'nhan_vien'
        };
      });
      res.json(mergedUsers);
    } catch (error: any) {
      res.status(500).json({ error: 'Không thể lấy danh sách người dùng' });
    }
  });

  app.post('/api/admin/users/create', requireAuth, isAdminMiddleware, async (req: any, res) => {
    const { email, password, role, full_name } = req.body;
    try {
      // 1. Create in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) throw authError;

      // 2. Create in Profiles
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{ id: authData.user.id, role, full_name }])
        .select()
        .single();

      if (profileError) throw profileError;

      await logAudit(req.user.id, 'ADMIN_CREATE_USER', 'user', { createdId: authData.user.id, role });
      res.json({ user: authData.user, profile: profileData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/admin/users/:id', requireAuth, isAdminMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const { role, full_name, email, password } = req.body;
    
    console.log(`[Admin Update User] Request from ${req.user.email} -> Target ID: ${id}, Role: ${role}, Name: ${full_name}, Email: ${email}`);

    try {
      // 1. Update Auth if email or password provided
      if (email || password) {
        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (email) updateData.email_confirm = true; // Auto-confirm if admin sets it

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
        if (authError) throw authError;
      }

      // 2. Update Profile
      const profileUpdates: any = {};
      if (role) profileUpdates.role = role;
      if (full_name !== undefined) profileUpdates.full_name = full_name;

      const updateData = { id, ...profileUpdates };
      let finalData = null;

      if (email) {
        const { data, error: upsertError } = await supabaseAdmin.from('profiles').upsert({ ...updateData, email }).select().single();
        if (upsertError && upsertError.message.includes('column "email" of relation "profiles" does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from('profiles').upsert(updateData).select().single();
          if (fallbackError) return res.status(500).json({ error: fallbackError.message });
          finalData = fallbackData;
        } else if (upsertError) {
          return res.status(500).json({ error: upsertError.message });
        } else {
          finalData = data;
        }
      } else {
        const { data, error } = await supabaseAdmin.from('profiles').upsert(updateData).select().single();
        if (error) return res.status(500).json({ error: error.message });
        finalData = data;
      }

      await logAudit(req.user.id, 'ADMIN_UPDATE_USER', 'user', { targetId: id, updates: profileUpdates });
      res.json(finalData);
    } catch (error: any) {
      console.error('[Admin Update User Critical] Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, isAdminMiddleware, async (req: any, res) => {
    const { id } = req.params;
    console.log(`[Admin Delete User] Request from ${req.user.email} -> Target ID: ${id}`);
    
    try {
      // 1. Delete from Profiles first to avoid orphan check issues (though usually Auth is first)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.warn('[Admin Delete User Warning] Profile delete error:', profileError.message);
      }

      // 2. Delete from Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.error('[Admin Delete User Error] Auth delete failed:', authError);
        throw authError;
      }

      await logAudit(req.user.id, 'ADMIN_DELETE_USER', 'user', { targetId: id });
      console.log(`[Admin Delete User Success] Deleted ID ${id}`);
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('[Admin Delete User Critical] Exception:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
