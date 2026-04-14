import React, { useState, useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase/client';
import { format, isToday, parseISO, addMinutes, setHours, setMinutes, isSameDay } from 'date-fns';
import { Brain, Clock, Calendar as CalendarIcon, ChevronLeft, Sparkles, Loader2, X, ListChecks, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateDailyPlan, generateSubtasks } from '../lib/ai/gemini';
import { Task } from '../types';
import { useScheduler } from '../lib/hooks/useScheduler';

import Sidebar from '../components/Sidebar';

export default function DailyPlannerPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getDaySchedule, schedule: fullSchedule } = useScheduler();
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [aiPlan, setAiPlan] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [breakdownResults, setBreakdownResults] = useState<{ taskId: string, subtasks: string[] } | null>(null);
  const [lastPlannedAt, setLastPlannedAt] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

  const todaySchedule = useMemo(() => getDaySchedule(new Date()), [fullSchedule]);

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
        setInsight(`AI đã học được thời gian làm việc tốt nhất của bạn: ${start}:00–${end}:00`);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAIPlan = async () => {
    setIsPlanning(true);
    setError(null);
    try {
      const plan = await generateDailyPlan(todayTasks);
      if (!plan || plan.length === 0) throw new Error('Không thể tạo kế hoạch AI');
      setAiPlan(plan);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo kế hoạch AI');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!aiPlan) return;
    
    try {
      for (const planItem of aiPlan) {
        await updateTask.mutateAsync({
          id: planItem.task_id,
          suggested_schedule: {
            start: planItem.start,
            end: planItem.end
          }
        });
      }
      setAiPlan(null);
    } catch (err: any) {
      setError('Không thể áp dụng kế hoạch AI cho một số nhiệm vụ');
    }
  };

  const handleApplySmartSchedule = async () => {
    if (todaySchedule.length === 0) return;
    setIsPlanning(true);
    try {
      for (const item of todaySchedule) {
        await updateTask.mutateAsync({
          id: item.task_id,
          suggested_schedule: {
            start: item.start_time,
            end: item.end_time
          }
        });
      }
    } catch (err) {
      setError('Không thể đồng bộ lịch trình');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleBreakdown = async (task: Task) => {
    setIsBreakingDown(task.id);
    try {
      const subtasks = await generateSubtasks(task.title);
      if (!subtasks || subtasks.length === 0) throw new Error('Không thể chia nhỏ nhiệm vụ');
      setBreakdownResults({ taskId: task.id, subtasks });
    } catch (err: any) {
      setError('Không thể chia nhỏ nhiệm vụ');
    } finally {
      setIsBreakingDown(null);
    }
  };

  const todayTasks = tasks
    .filter(t => {
      if (t.status === 'done' || t.status === 'archived') return false;
      if (t.suggested_schedule) {
        const start = parseISO((t.suggested_schedule as any).start);
        if (isToday(start)) return true;
      }
      if (t.due_date) {
        const due = parseISO(t.due_date);
        if (isToday(due)) return true;
      }
      return false;
    })
    .sort((a, b) => b.ai_priority_score - a.ai_priority_score);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Lập kế hoạch ngày</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-neutral-500 font-medium">{format(new Date(), 'EEEE, d MMMM')}</p>
                {lastPlannedAt && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100 flex items-center gap-1">
                    <Sparkles className="w-2 h-2" />
                    Đã tối ưu bởi AI
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white border border-neutral-200 rounded-xl p-1 flex items-center shadow-sm">
                <button 
                  onClick={() => setViewMode('timeline')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'timeline' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleApplySmartSchedule}
                disabled={isPlanning || todaySchedule.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Tạo kế hoạch ngày
              </button>
            </div>
          </header>

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
          ) : viewMode === 'timeline' ? (
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Chế độ dòng thời gian
                </h3>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  {todaySchedule.length} Nhiệm vụ đã lên lịch
                </span>
              </div>
              <div className="p-8 relative">
                {/* Timeline Grid */}
                <div className="absolute left-24 top-8 bottom-8 w-px bg-neutral-100" />
                
                <div className="space-y-12 relative">
                  {todaySchedule.length === 0 ? (
                    <div className="py-20 text-center">
                      <CalendarIcon className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                      <p className="text-neutral-400 font-medium">Không có nhiệm vụ nào được lên lịch cho hôm nay.</p>
                      <p className="text-xs text-neutral-400 mt-1">Nhấp vào "Tạo kế hoạch ngày" để tạo kế hoạch thông minh.</p>
                    </div>
                  ) : (
                    todaySchedule.map((item, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={item.task_id} 
                        className="flex gap-8 group"
                      >
                        <div className="w-16 pt-1 text-right">
                          <span className="text-sm font-bold text-neutral-900">
                            {format(parseISO(item.start_time), 'HH:mm')}
                          </span>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">
                            {format(parseISO(item.start_time), 'aaa')}
                          </p>
                        </div>
                        
                        <div className="relative flex-1">
                          <div className="absolute -left-[37px] top-2.5 w-3 h-3 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-1 ring-blue-100" />
                          <div className="bg-neutral-50 group-hover:bg-blue-50/50 p-5 rounded-2xl border border-neutral-100 group-hover:border-blue-100 transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-neutral-900 group-hover:text-blue-700 transition-colors">
                                {item.title}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-1 bg-white rounded-lg border border-neutral-100 text-neutral-500">
                                {format(parseISO(item.start_time), 'HH:mm')} - {format(parseISO(item.end_time), 'HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-xs text-neutral-400">
                                <Clock className="w-3 h-3" />
                                {Math.round((parseISO(item.end_time).getTime() - parseISO(item.start_time).getTime()) / 60000)} phút
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {todayTasks.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 shadow-sm">
                  <CalendarIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Không có nhiệm vụ nào cho hôm nay</h3>
                  <p className="text-neutral-500">Hãy thử tạo một nhiệm vụ mới hoặc lên lịch lại các nhiệm vụ hiện có.</p>
                </div>
              ) : (
                todayTasks.map((task, idx) => {
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
                            {task.estimated_time || 0}p
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
                              Điểm: {Math.round(task.ai_priority_score)}
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
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>

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
                      <h2 className="text-xl font-bold text-neutral-900">Kế hoạch AI của bạn</h2>
                      <p className="text-xs text-neutral-500">Được tối ưu hóa cho năng suất tối đa</p>
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
                    Đóng
                  </button>
                  <button 
                    onClick={handleApplyPlan}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-200"
                  >
                    Áp dụng kế hoạch
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
                    <h2 className="text-xl font-bold text-neutral-900">Chia nhỏ bởi AI</h2>
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
                    Đã hiểu
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
