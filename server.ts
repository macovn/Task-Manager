import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cron from 'node-cron';
import { runDailyPlannerJob } from './jobs/dailyPlanner';
import { calculatePriority } from './src/lib/ai/gemini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      // In a real app, add secret key check here
      await runDailyPlannerJob();
      res.json({ message: 'Job started successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/score', async (req, res) => {
    const { task, delayFactor } = req.body;
    console.log(`[Server AI] Scoring task: ${task.title}`);
    try {
      const scoreData = await calculatePriority(task, delayFactor);
      res.json(scoreData);
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/plan', async (req, res) => {
    const { tasks } = req.body;
    console.log(`[Server AI] Planning ${tasks.length} tasks`);
    try {
      const { generateDailyPlan } = await import('./src/lib/ai/gemini');
      const plan = await generateDailyPlan(tasks);
      res.json({ plan });
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/breakdown', async (req, res) => {
    const { title } = req.body;
    console.log(`[Server AI] Breaking down: ${title}`);
    try {
      const { generateSubtasks } = await import('./src/lib/ai/gemini');
      const subtasks = await generateSubtasks(title);
      res.json({ subtasks });
    } catch (error: any) {
      console.error('[Server AI Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/eisenhower-action', async (req, res) => {
    const { task, quadrant } = req.body;
    console.log(`[Server AI] Eisenhower action for: ${task.title}`);
    try {
      const { getEisenhowerActionSuggestion } = await import('./src/lib/ai/gemini');
      const suggestion = await getEisenhowerActionSuggestion(task, quadrant);
      res.json(suggestion);
    } catch (error: any) {
      console.error('[Server AI Error]', error);
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
