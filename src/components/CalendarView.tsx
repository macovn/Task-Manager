import { useTasks } from '../lib/hooks/useTasks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Zap, Target } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export default function CalendarView() {
  const { data: tasks = [] } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="flex flex-col gap-6">
      {/* Editorial Header */}
      <div className="relative h-48 bg-neutral-900 rounded-3xl overflow-hidden flex items-end p-8 shadow-2xl">
        {/* Oversized Background Number (Recipe 9) */}
        <div className="absolute top-[-40px] right-[-20px] text-[240px] font-bold text-white/5 leading-none select-none italic font-serif">
          {format(currentDate, 'MM')}
        </div>
        
        <div className="relative z-10 flex items-center justify-between w-full">
          <div>
            <p className="text-blue-400 font-mono text-xs font-bold tracking-[0.3em] uppercase mb-2">Operational Schedule</p>
            <h2 className="text-5xl font-bold text-white tracking-tighter">
              {format(currentDate, 'MMMM')} <span className="font-serif italic font-light text-neutral-500">{format(currentDate, 'yyyy')}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
            <button 
              onClick={prevMonth} 
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:text-blue-400 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={nextMonth} 
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-200/50 overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/50">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] italic font-serif">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(140px,auto)]">
          {days.map((day, idx) => {
            const dayTasks = tasks.filter(t => {
              const hasDueDate = t.due_date && isSameDay(new Date(t.due_date), day);
              const hasSuggestedDate = t.suggested_schedule && isSameDay(new Date((t.suggested_schedule as any).start), day);
              return (hasDueDate || hasSuggestedDate) && t.status !== 'done';
            });
            
            const completedToday = tasks.filter(t => 
              t.status === 'done' && t.completed_at && isSameDay(new Date(t.completed_at), day)
            ).length;

            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <div 
                key={idx} 
                className={cn(
                  "relative border-r border-b border-neutral-100 p-4 transition-all hover:bg-neutral-50 group flex flex-col min-h-[140px]",
                  !isCurrentMonth && "bg-neutral-50/40 opacity-40",
                  isTodayDate && "bg-blue-50/30"
                )}
              >
                {/* Day Number Overlay */}
                <span className={cn(
                  "text-sm font-mono font-bold mb-3 flex items-center justify-center w-8 h-8 rounded-xl transition-all",
                  isTodayDate ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" : "text-neutral-400 group-hover:text-neutral-900"
                )}>
                  {format(day, 'd')}
                </span>

                {/* Tasks List */}
                <div className="flex-1 space-y-1.5 min-h-0">
                  {dayTasks.slice(0, 3).map(task => (
                    <div 
                      key={task.id}
                      className={cn(
                        "group/item relative px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-2 transition-all hover:translate-x-1",
                        task.priority === 'high' ? "bg-red-50 border-red-100 text-red-700" :
                        task.is_key ? "bg-orange-50 border-orange-100 text-orange-700" :
                        "bg-blue-50 border-blue-100 text-blue-700"
                      )}
                    >
                      {task.is_key && <Target className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <p className="text-[9px] font-bold text-neutral-400 pl-2">
                      + {dayTasks.length - 3} MORE ACTIONS
                    </p>
                  )}
                </div>

                {/* Progress Indicators */}
                {completedToday > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 opacity-60">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(completedToday, 5) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Done</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
