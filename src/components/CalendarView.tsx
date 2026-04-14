import { useTasks } from '../hooks/useTasks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export default function CalendarView() {
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 rounded-lg transition-colors">
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[120px]">
        {days.map((day, idx) => {
          const dayTasks = tasks.filter(t => {
            const hasDueDate = t.due_date && isSameDay(new Date(t.due_date), day);
            const hasSuggestedDate = t.suggested_schedule && isSameDay(new Date((t.suggested_schedule as any).start), day);
            return hasDueDate || hasSuggestedDate;
          });
          const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

          return (
            <div 
              key={idx} 
              className={cn(
                "border-r border-b border-neutral-100 p-2 transition-colors hover:bg-neutral-50/50",
                !isCurrentMonth && "bg-neutral-50/30 text-neutral-400"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) && "bg-blue-600 text-white"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                      task.status === 'done' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
