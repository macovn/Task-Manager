import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cron from 'node-cron';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { runDailyPlannerJob } from './jobs/dailyPlanner';
import { calculatePriority } from './src/lib/ai/gemini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase for Auth verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

// Rate limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Cron Job Schedule (07:00 AM daily)
  cron.schedule('0 7 * * *', () => {
    runDailyPlannerJob();
  });

  // Manual trigger for testing
  app.post('/api/admin/run-job', async (req, res) => {
    try {
      // Secret key check for admin job
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await runDailyPlannerJob();
      res.json({ message: 'Job started successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/ai/score', requireAuth, aiLimiter, async (req: any, res) => {
    const { task, delayFactor } = req.body;
    console.log(`[Server AI] Scoring task: ${task.title} for user: ${req.user.id}`);
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
    console.log(`[Server AI] Planning ${tasks.length} tasks for user: ${req.user.id}`);
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
    console.log(`[Server AI] Breaking down: ${title} for user: ${req.user.id}`);
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
    console.log(`[Server AI] Eisenhower action for: ${task.title} for user: ${req.user.id}`);
    try {
      const { getEisenhowerActionSuggestion } = await import('./src/lib/ai/gemini');
      const suggestion = await getEisenhowerActionSuggestion(task, quadrant);
      res.json(suggestion);
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: 'Failed to get suggestion' });
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
