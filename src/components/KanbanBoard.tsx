import { useState, useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { Task } from '../types';
import { CheckCircle2, Circle, Clock, GripVertical, Plus, Brain, Play, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusMode } from '../lib/hooks/useFocusMode';
import { analyzeTaskRisk } from '../lib/ai/riskEngine';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-neutral-100 text-neutral-700' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { id: 'done', title: 'Done', color: 'bg-green-100 text-green-700' },
] as const;

export default function KanbanBoard() {
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const { activeTaskId, startTask, completeTask } = useFocusMode();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyFilter, setKeyFilter] = useState<'all' | 'month' | 'quarter'>('all');

  const filteredTasks = useMemo(() => {
    if (keyFilter === 'all') return tasks;
    return tasks.filter(t => t.is_key && t.key_type === keyFilter);
  }, [tasks, keyFilter]);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[600px]">
      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
        <label className="text-sm font-bold text-neutral-600 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Lọc nhiệm vụ trọng tâm:
        </label>
        <select
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value as any)}
          className="text-sm font-bold bg-neutral-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500 py-1.5 pl-2 pr-8 outline-none"
        >
          <option value="all">Tất cả</option>
          <option value="month">Trọng tâm tháng</option>
          <option value="quarter">Trọng tâm quý</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex flex-col bg-neutral-50/50 rounded-2xl p-4 border border-neutral-200/50">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-neutral-900">{column.title}</h3>
              <span className="bg-neutral-200 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredTasks.filter(t => t.status === column.id).length}
              </span>
            </div>
            <button className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {filteredTasks
              .filter((task) => task.status === column.id)
              .map((task) => {
                const risk = analyzeTaskRisk(task, tasks);
                const isExpanded = expandedId === task.id;

                return (
                  <motion.div
                    layout
                    key={task.id}
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-wrap gap-2">
                        {task.is_key && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200"
                          )}>
                            <Flame className="w-2.5 h-2.5" />
                            {task.key_type === 'month' ? 'Trọng tâm tháng' : 'Trọng tâm quý'}
                          </span>
                        )}
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                          task.priority === 'high' ? "bg-red-50 text-red-600" :
                          task.priority === 'medium' ? "bg-amber-50 text-amber-600" :
                          "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1",
                          task.ai_priority_score > 80 ? "bg-red-600 text-white" :
                          task.ai_priority_score > 60 ? "bg-amber-500 text-white" :
                          "bg-blue-500 text-white"
                        )}>
                          <Brain className="w-2.5 h-2.5" />
                          {Math.round(task.ai_priority_score)}
                        </span>
                        {risk.risk_level !== 'low' && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
                            risk.risk_level === 'high' ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                          )}>
                            <AlertCircle className="w-2.5 h-2.5" />
                            Rủi ro: {risk.risk_level}
                          </span>
                        )}
                      {task.interruption_count > 2 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Khó
                        </span>
                      )}
                    </div>
                    <GripVertical className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-neutral-900 truncate">{task.title}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeTaskId === task.id ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); completeTask(task.id, task.estimated_time); }}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg border border-green-100"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); startTask(task.id); }}
                          disabled={!!activeTaskId}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className={cn(
                      "text-sm text-neutral-500 transition-all duration-300",
                      !isExpanded && "line-clamp-2"
                    )}>
                      {task.description || 'Không có mô tả'}
                    </p>
                    {task.description && task.description.length > 50 && (
                      <span className="text-[10px] font-bold text-blue-600 mt-1 inline-block">
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold border border-blue-200"
                        title={task.assignee?.full_name || task.assignee?.email || 'Chưa bàn giao'}
                      >
                        {task.assignee?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 
                         task.assignee?.email?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 truncate max-w-[80px]">
                        {task.assignee?.full_name?.split(' ').slice(-1)[0] || task.assignee?.email?.split('@')[0] || 'Chưa bàn giao'}
                      </span>
                    </div>
                    <select 
                      value={task.status}
                      onChange={(e) => { e.stopPropagation(); handleStatusChange(task.id, e.target.value as Task['status']); }}
                      className="text-xs bg-neutral-50 border-none rounded p-1 text-neutral-500 focus:ring-0 cursor-pointer"
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
