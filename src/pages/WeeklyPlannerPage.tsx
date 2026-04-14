import React from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Brain, AlertTriangle, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Task } from '../types';

export default function WeeklyPlannerPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const navigate = useNavigate();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (day: Date) => {
    return tasks.filter(t => {
      if (!t.suggested_schedule) return false;
      const start = parseISO((t.suggested_schedule as any).start);
      return isSameDay(start, day);
    }).sort((a, b) => b.ai_priority_score - a.ai_priority_score);
  };

  const calculateDailyLoad = (dayTasks: Task[]) => {
    return dayTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-neutral-200"
            >
              <ChevronLeft className="w-6 h-6 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Weekly Planner</h1>
              <p className="text-neutral-500">Week of {format(weekStart, 'MMMM do')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
            <Brain className="w-5 h-5" />
            <span className="font-bold text-sm">Smart Capacity Check</span>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const totalMinutes = calculateDailyLoad(dayTasks);
              const isOverloaded = totalMinutes > 480; // Over 8 hours

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={day.toISOString()}
                  className={cn(
                    "bg-white rounded-2xl border flex flex-col min-h-[400px] shadow-sm",
                    isOverloaded ? "border-red-200 ring-1 ring-red-100" : "border-neutral-200"
                  )}
                >
                  <div className={cn(
                    "p-4 border-b text-center",
                    isOverloaded ? "bg-red-50 border-red-100" : "bg-neutral-50 border-neutral-100"
                  )}>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                      {format(day, 'EEE')}
                    </p>
                    <p className="text-lg font-bold text-neutral-900">
                      {format(day, 'd')}
                    </p>
                    {isOverloaded && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[10px] font-bold">Overloaded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id}
                        className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-blue-200 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-blue-600">
                            {format(parseISO((task.suggested_schedule as any).start), 'HH:mm')}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400">
                            {task.estimated_time}m
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-neutral-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </h5>
                      </div>
                    ))}
                    {dayTasks.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-300 py-12">
                        <CalendarIcon className="w-6 h-6 mb-2 opacity-20" />
                        <span className="text-[10px] font-medium">Free Day</span>
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "p-3 border-t text-center",
                    isOverloaded ? "bg-red-50/50 border-red-100" : "bg-neutral-50/50 border-neutral-100"
                  )}>
                    <p className={cn(
                      "text-[10px] font-bold",
                      isOverloaded ? "text-red-600" : "text-neutral-500"
                    )}>
                      {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                    </p>
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
