import React, { useState } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase/client';
import { format, isToday, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { Brain, Clock, Calendar as CalendarIcon, ChevronLeft, Sparkles, Loader2, X, ListChecks, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateDailyPlan, generateSubtasks } from '../lib/ai/gemini';

export default function DailyPlannerPage() {
  const { tasks, isLoading, updateTask } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPlanning, setIsPlanning] = useState(false);
  const [aiPlan, setAiPlan] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [breakdownResults, setBreakdownResults] = useState<{ taskId: string, subtasks: string[] } | null>(null);
  const [lastPlannedAt, setLastPlannedAt] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data?.last_ai_plan_at) {
        setLastPlannedAt(data.last_ai_plan_at);
      }
      if (data?.preferred_working_hours) {
        const { start, end } = data.preferred_working_hours;
        setInsight(`AI learned your best working time: ${start}:00–${end}:00`);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAIPlan = async () => {
    setIsPlanning(true);
    setError(null);
    try {
      const plan = await generateDailyPlan(todayTasks);
      if (!plan || plan.length === 0) throw new Error('Failed to generate AI plan');
      setAiPlan(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI plan');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!aiPlan) return;
    
    try {
      for (const planItem of aiPlan) {
        console.log(`Applying plan for task_id: ${planItem.task_id}`);
        try {
          await updateTask.mutateAsync({
            id: planItem.task_id,
            suggested_schedule: {
              start: planItem.start,
              end: planItem.end
            }
          });
        } catch (err) {
          console.error(`Failed to update task ${planItem.task_id}:`, err);
          throw err;
        }
      }
      setAiPlan(null);
    } catch (err: any) {
      setError('Failed to apply AI plan to some tasks');
    }
  };

  const handleBreakdown = async (task: Task) => {
    setIsBreakingDown(task.id);
    try {
      const subtasks = await generateSubtasks(task.title);
      if (!subtasks || subtasks.length === 0) throw new Error('Failed to break down task');
      setBreakdownResults({ taskId: task.id, subtasks });
    } catch (err: any) {
      setError('Failed to break down task');
    } finally {
      setIsBreakingDown(null);
    }
  };

  const todayTasks = tasks
    .filter(t => {
      // Include if already scheduled for today
      if (t.suggested_schedule) {
        const start = parseISO((t.suggested_schedule as any).start);
        if (isToday(start)) return true;
      }
      // OR if due today
      if (t.due_date) {
        const due = parseISO(t.due_date);
        if (isToday(due)) return true;
      }
      return false;
    })
    .sort((a, b) => b.ai_priority_score - a.ai_priority_score);

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-neutral-200"
            >
              <ChevronLeft className="w-6 h-6 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Daily Planner</h1>
              <div className="flex items-center gap-2">
                <p className="text-neutral-500">{format(new Date(), 'EEEE, MMMM do')}</p>
                {lastPlannedAt && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100 flex items-center gap-1">
                    <Sparkles className="w-2 h-2" />
                    AI planned your day at {format(parseISO(lastPlannedAt), 'HH:mm')}
                  </span>
                )}
                {insight && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100 flex items-center gap-1">
                    <Brain className="w-2 h-2" />
                    {insight}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAIPlan}
              disabled={isPlanning || todayTasks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
            >
              {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Plan My Day
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Brain className="w-5 h-5" />
              <span className="font-bold text-sm">AI Optimized</span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {aiPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-neutral-200">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900">Your AI-Generated Plan</h2>
                      <p className="text-xs text-neutral-500">Optimized for maximum productivity</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAiPlan(null)}
                    className="p-2 hover:bg-white rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  {aiPlan.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="w-32 font-bold text-blue-600 text-xs">
                        {format(parseISO(item.start), 'HH:mm')} - {format(parseISO(item.end), 'HH:mm')}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-neutral-500 italic">"{item.reason}"</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                  <button 
                    onClick={() => setAiPlan(null)}
                    className="px-6 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleApplyPlan}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-200"
                  >
                    Apply Plan
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {breakdownResults && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ListChecks className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-neutral-900">AI Breakdown</h2>
                  </div>
                  <button onClick={() => setBreakdownResults(null)}>
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {breakdownResults.subtasks.map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                      <span className="text-sm text-neutral-700">{sub}</span>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end">
                  <button 
                    onClick={() => setBreakdownResults(null)}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 shadow-sm">
            <CalendarIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No tasks scheduled for today</h3>
            <p className="text-neutral-500">Try creating a new task with an estimated time to see AI suggestions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTasks.map((task, idx) => {
              const schedule = task.suggested_schedule as any;
              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={task.id}
                  className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-24 flex flex-col items-center justify-center border-r border-neutral-100 pr-6">
                      <span className="text-sm font-bold text-blue-600">
                        {schedule?.start ? format(parseISO(schedule.start), 'HH:mm') : '--:--'}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {task.estimated_time || 0}m
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-neutral-900">{task.title}</h4>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          task.ai_priority_score > 80 ? "bg-red-50 text-red-600 border border-red-100" :
                          task.ai_priority_score > 60 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          Score: {Math.round(task.ai_priority_score)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-500 line-clamp-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleBreakdown(task)}
                        disabled={isBreakingDown === task.id}
                        className="p-2 bg-neutral-50 hover:bg-blue-50 text-neutral-600 hover:text-blue-600 rounded-xl transition-all border border-neutral-200 hover:border-blue-200"
                        title="AI Breakdown"
                      >
                        {isBreakingDown === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                      </button>
                      <button className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-sm font-bold rounded-xl transition-colors">
                        Reschedule
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
