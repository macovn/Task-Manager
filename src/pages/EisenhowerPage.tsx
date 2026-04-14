import React, { useState, useEffect } from 'react';
import { useEisenhower } from '../lib/hooks/useEisenhower';
import { useUIStore } from '../store/useUIStore';
import Sidebar from '../components/Sidebar';
import AddTaskModal from '../components/AddTaskModal';
import { Task } from '../types';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AlertCircle, Clock, CheckCircle2, Trash2, Plus, Sparkles, UserPlus, Archive, Calendar } from 'lucide-react';
import { getEisenhowerActionSuggestion } from '../lib/ai/gemini';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';

export default function EisenhowerPage() {
  const { quadrants, isLoading } = useEisenhower();
  const { isAddTaskOpen, setAddTaskOpen, editingTask, setEditingTask } = useUIStore();

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
  };

  const handleCloseModal = () => {
    setAddTaskOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-neutral-200 px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Ma trận Eisenhower</h1>
            <p className="text-sm text-neutral-500">Ưu tiên các nhiệm vụ của bạn theo mức độ khẩn cấp và quan trọng</p>
          </div>
          <button 
            onClick={() => setAddTaskOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nhiệm vụ mới
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto h-full min-h-[800px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <Quadrant 
                  id="q1"
                  title="LÀM NGAY"
                  subtitle="Khẩn cấp & Quan trọng"
                  tasks={quadrants.q1}
                  color="red"
                  icon={<AlertCircle className="w-5 h-5" />}
                  onTaskClick={handleTaskClick}
                  actionLabel="Làm ngay"
                />
                <Quadrant 
                  id="q2"
                  title="LÊN LỊCH"
                  subtitle="Không khẩn cấp & Quan trọng"
                  tasks={quadrants.q2}
                  color="blue"
                  icon={<Clock className="w-5 h-5" />}
                  onTaskClick={handleTaskClick}
                  actionLabel="Lên lịch nhiệm vụ"
                />
                <Quadrant 
                  id="q3"
                  title="ỦY QUYỀN"
                  subtitle="Khẩn cấp & Không quan trọng"
                  tasks={quadrants.q3}
                  color="amber"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  onTaskClick={handleTaskClick}
                  actionLabel="Ủy quyền"
                />
                <Quadrant 
                  id="q4"
                  title="LOẠI BỎ"
                  subtitle="Không khẩn cấp & Không quan trọng"
                  tasks={quadrants.q4}
                  color="neutral"
                  icon={<Trash2 className="w-5 h-5" />}
                  onTaskClick={handleTaskClick}
                  actionLabel="Lưu trữ / Xóa"
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <AddTaskModal 
        isOpen={isAddTaskOpen || !!editingTask} 
        onClose={handleCloseModal}
        initialData={editingTask}
      />
    </div>
  );
}

interface QuadrantProps {
  id: string;
  title: string;
  subtitle: string;
  tasks: Task[];
  color: 'red' | 'blue' | 'amber' | 'neutral';
  icon: React.ReactNode;
  onTaskClick: (task: Task) => void;
  actionLabel: string;
}

function Quadrant({ id, title, subtitle, tasks, color, icon, onTaskClick, actionLabel }: QuadrantProps) {
  const headerClasses = {
    red: "bg-red-600",
    blue: "bg-blue-600",
    amber: "bg-amber-600",
    neutral: "bg-neutral-600"
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className={cn("px-6 py-4 flex items-center justify-between text-white shrink-0", headerClasses[color])}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-bold leading-none">{title}</h3>
            <p className="text-[10px] opacity-80 uppercase tracking-wider mt-1 font-medium">{subtitle}</p>
          </div>
        </div>
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/50">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
            <p className="text-sm font-medium">No tasks in this quadrant</p>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              idx={idx} 
              quadrantId={id} 
              onTaskClick={onTaskClick}
              actionLabel={actionLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  key?: string;
  task: Task;
  idx: number;
  quadrantId: string;
  onTaskClick: (task: Task) => void;
  actionLabel: string;
}

function TaskCard({ task, idx, quadrantId, onTaskClick, actionLabel }: TaskCardProps) {
  const [suggestion, setSuggestion] = useState<{ action: string, explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const updateTask = useUpdateTask();

  useEffect(() => {
    const fetchSuggestion = async () => {
      setLoading(true);
      const res = await getEisenhowerActionSuggestion(task, quadrantId);
      setSuggestion(res);
      setLoading(false);
    };
    fetchSuggestion();
  }, [task.id, quadrantId]);

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quadrantId === 'q4') {
      if (confirm('Archive this task?')) {
        await updateTask.mutateAsync({ id: task.id, status: 'archived' });
      }
    } else if (quadrantId === 'q2' || quadrantId === 'q3') {
      onTaskClick(task);
    }
  };

  const ActionIcon = () => {
    if (quadrantId === 'q1') return <Sparkles className="w-3 h-3" />;
    if (quadrantId === 'q2') return <Calendar className="w-3 h-3" />;
    if (quadrantId === 'q3') return <UserPlus className="w-3 h-3" />;
    if (quadrantId === 'q4') return <Archive className="w-3 h-3" />;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={() => onTaskClick(task)}
      className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-neutral-900 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">
              {task.title}
            </h4>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                task.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                "bg-blue-50 text-blue-600 border border-blue-100"
              )}>
                {task.priority}
              </span>
              {task.due_date && (
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(parseISO(task.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI Suggestion Layer */}
        <div className="bg-blue-50/50 rounded-xl p-2 border border-blue-100/50">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">AI Suggestion</span>
          </div>
          {loading ? (
            <div className="h-4 w-24 bg-blue-100 animate-pulse rounded" />
          ) : (
            <div className="group/tip relative">
              <p className="text-[11px] font-bold text-neutral-700">{suggestion?.action}</p>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block z-50 w-48 bg-neutral-900 text-white text-[10px] p-2 rounded-lg shadow-xl">
                {suggestion?.explanation}
                <div className="absolute top-full left-4 border-8 border-transparent border-t-neutral-900" />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleAction}
          className={cn(
            "w-full py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all",
            quadrantId === 'q1' ? "bg-red-50 text-red-600 border border-red-100 cursor-default" :
            quadrantId === 'q2' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" :
            quadrantId === 'q3' ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm" :
            "bg-neutral-200 text-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent"
          )}
        >
          <ActionIcon />
          {actionLabel}
        </button>
      </div>
    </motion.div>
  );
}
