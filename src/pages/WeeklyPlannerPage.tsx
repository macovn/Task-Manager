import React, { useState, useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { format, startOfWeek, addDays, isSameDay, parseISO, isWithinInterval, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Brain, Sparkles, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Sidebar from '../components/Sidebar';
import { useScheduler } from '../lib/hooks/useScheduler';

export default function WeeklyPlannerPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { schedule: fullSchedule, getDaySchedule } = useScheduler();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekSchedule = useMemo(() => {
    return fullSchedule.filter(s => {
      const date = parseISO(s.start_time);
      return isWithinInterval(date, {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      });
    });
  }, [fullSchedule, currentWeekStart]);

  const handleGenerateWeek = async () => {
    if (weekSchedule.length === 0) return;
    setIsPlanning(true);
    try {
      for (const item of weekSchedule) {
        await updateTask.mutateAsync({
          id: item.task_id,
          suggested_schedule: {
            start: item.start_time,
            end: item.end_time
          }
        });
      }
    } catch (err) {
      setError('Không thể đồng bộ kế hoạch tuần');
    } finally {
      setIsPlanning(false);
    }
  };

  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Lập kế hoạch tuần</h1>
              <p className="text-neutral-500 font-medium">
                {format(currentWeekStart, 'd MMM')} – {format(addDays(currentWeekStart, 6), 'd MMM, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-1 shadow-sm">
                <button onClick={prevWeek} className="p-2 hover:bg-neutral-50 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-neutral-600" />
                </button>
                <button 
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="px-4 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Hôm nay
                </button>
                <button onClick={nextWeek} className="p-2 hover:bg-neutral-50 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-neutral-600" />
                </button>
              </div>

              <button
                onClick={handleGenerateWeek}
                disabled={isPlanning || weekSchedule.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Tạo kế hoạch tuần
              </button>
            </div>
          </header>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Weekly Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const dayTasks = weekSchedule.filter(s => isSameDay(parseISO(s.start_time), day));
              const totalMinutes = dayTasks.reduce((acc, s) => {
                return acc + (parseISO(s.end_time).getTime() - parseISO(s.start_time).getTime()) / 60000;
              }, 0);
              const loadPercentage = Math.min((totalMinutes / 480) * 100, 100);

              return (
                <div key={idx} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-col items-center gap-3">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{format(day, 'EEE')}</p>
                    <p className={cn(
                      "text-lg font-bold",
                      isSameDay(day, new Date()) ? "text-blue-600" : "text-neutral-900"
                    )}>{format(day, 'd')}</p>
                  </div>
                  
                  <div className="w-full h-32 bg-neutral-50 rounded-xl relative overflow-hidden flex flex-col justify-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${loadPercentage}%` }}
                      className={cn(
                        "w-full transition-all duration-500",
                        loadPercentage > 90 ? "bg-red-500" : loadPercentage > 60 ? "bg-amber-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-neutral-500">{Math.round(totalMinutes)}p</p>
                    <p className="text-[9px] text-neutral-400 uppercase">{dayTasks.length} nhiệm vụ</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed View */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {weekDays.map((day, idx) => {
              const dayTasks = weekSchedule.filter(s => isSameDay(parseISO(s.start_time), day));
              
              return (
                <div key={idx} className={cn(
                  "bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]",
                  isSameDay(day, new Date()) && "ring-2 ring-blue-600 ring-offset-2"
                )}>
                  <div className={cn(
                    "px-6 py-4 border-b border-neutral-100 flex items-center justify-between",
                    isSameDay(day, new Date()) ? "bg-blue-600 text-white" : "bg-neutral-50"
                  )}>
                    <div>
                      <h3 className="font-bold">{format(day, 'EEEE')}</h3>
                      <p className={cn("text-xs font-medium", isSameDay(day, new Date()) ? "text-blue-100" : "text-neutral-500")}>
                        {format(day, 'd MMMM')}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      isSameDay(day, new Date()) ? "bg-white/20" : "bg-neutral-200 text-neutral-600"
                    )}>
                      {dayTasks.length} Nhiệm vụ
                    </span>
                  </div>

                  <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/30">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-300 py-12">
                        <CalendarIcon className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-medium">Ngày nghỉ</p>
                      </div>
                    ) : (
                      dayTasks.map((item, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm hover:border-blue-200 transition-all group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-blue-600">
                              {format(parseISO(item.start_time), 'HH:mm')}
                            </span>
                            <span className="text-[9px] font-bold text-neutral-400 uppercase">
                              {Math.round((parseISO(item.end_time).getTime() - parseISO(item.start_time).getTime()) / 60000)}p
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-800 group-hover:text-blue-600 transition-colors truncate">
                            {item.title}
                          </h4>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
