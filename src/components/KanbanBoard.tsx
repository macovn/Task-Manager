import { useState, useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { Task } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  GripVertical, 
  Plus, 
  Brain, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Flame,
  MoreVertical,
  Calendar as CalendarIcon,
  Tag as TagIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusMode } from '../lib/hooks/useFocusMode';
import { analyzeTaskRisk } from '../lib/ai/riskEngine';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-neutral-100 text-neutral-700', icon: Circle },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { id: 'done', title: 'Done', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
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
    <div className="flex flex-col gap-8 h-full">
      {/* Search and Filters */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phân loại</p>
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value as any)}
                className="text-sm font-bold bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-neutral-900"
              >
                <option value="all">Tất cả nhiệm vụ</option>
                <option value="month">Nhiệm vụ trọng tâm tháng</option>
                <option value="quarter">Nhiệm vụ trọng tâm quý</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tổng số</p>
          <p className="text-sm font-mono font-bold text-neutral-900">{filteredTasks.length} nhiệm vụ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex flex-col min-w-[320px] h-full">
          {/* Column Header */}
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                column.id === 'todo' ? "bg-neutral-50 border-neutral-200 text-neutral-400" :
                column.id === 'in_progress' ? "bg-blue-50 border-blue-100 text-blue-500" :
                "bg-green-50 border-green-100 text-green-500"
              )}>
                <column.icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 tracking-tight">{column.title}</h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  {filteredTasks.filter(t => t.status === column.id).length} items
                </p>
              </div>
            </div>
            <button className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Kanban Cards */}
          <div className="flex-1 space-y-4 min-h-[500px]">
            <AnimatePresence mode="popLayout">
              {filteredTasks
                .filter((task) => task.status === column.id)
                .map((task) => {
                  const risk = analyzeTaskRisk(task, tasks);
                  const isExpanded = expandedId === task.id;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={task.id}
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      className={cn(
                        "group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all duration-300 cursor-pointer relative overflow-hidden",
                        isExpanded ? "ring-2 ring-blue-500/10 shadow-lg scale-[1.02] z-10" : "hover:border-neutral-300 hover:shadow-md"
                      )}
                    >
                      {/* Priority Indicator Stripe */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        task.priority === 'high' ? "bg-red-500" :
                        task.priority === 'medium' ? "bg-amber-500" :
                        "bg-blue-500"
                      )} />

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1.5 pr-6">
                          {task.is_key && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" />
                              {task.key_type === 'month' ? 'THÁNG' : 'QUÝ'}
                            </span>
                          )}
                          <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1",
                            task.ai_priority_score > 80 ? "bg-red-50 border-red-100 text-red-600" :
                            task.ai_priority_score > 60 ? "bg-amber-50 border-amber-100 text-amber-600" :
                            "bg-blue-50 border-blue-100 text-blue-600"
                          )}>
                            <Brain className="w-2.5 h-2.5" />
                            {Math.round(task.ai_priority_score)}
                          </div>
                          {risk.risk_level === 'high' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              RỦI RO
                            </span>
                          )}
                        </div>
                        <button 
                          className="p-1 text-neutral-300 hover:text-neutral-500 transition-colors absolute top-4 right-3"
                          onClick={(e) => { e.stopPropagation(); /* Options menu */ }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className={cn(
                          "font-bold text-neutral-900 leading-tight transition-all",
                          isExpanded ? "text-lg" : "text-[15px] line-clamp-2"
                        )}>
                          {task.title}
                        </h4>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3"
                            >
                              <p className="text-sm text-neutral-500 leading-relaxed font-medium mb-3">
                                {task.description || 'Không có mô tả chi tiết cho nhiệm vụ này.'}
                              </p>
                              
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {task.tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded flex items-center gap-1">
                                      <TagIcon className="w-2.5 h-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] text-blue-600 font-bold border border-blue-100 shadow-sm"
                            title={task.assignee?.full_name || task.assignee?.email || 'Chưa bàn giao'}
                          >
                            {task.assignee?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 
                             task.assignee?.email?.slice(0, 2).toUpperCase() || '??'}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 leading-none mb-1">DUE DATE</p>
                            <p className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                              <CalendarIcon className="w-2.5 h-2.5 text-neutral-300" />
                              {task.due_date ? format(new Date(task.due_date), 'dd/MM') : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeTaskId === task.id ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); completeTask(task.id, task.estimated_time); }}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-200 flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Hoàn thành
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startTask(task.id); }}
                                disabled={!!activeTaskId}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg border border-blue-100 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-blue-50 disabled:hover:text-blue-600",
                                  "opacity-0 group-hover:opacity-100"
                                )}
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                              <select 
                                value={task.status}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => { e.stopPropagation(); handleStatusChange(task.id, e.target.value as Task['status']); }}
                                className="text-[11px] font-bold bg-neutral-50 border-none rounded-lg px-2 py-1.5 text-neutral-500 focus:ring-0 cursor-pointer appearance-none"
                              >
                                {COLUMNS.map(col => (
                                  <option key={col.id} value={col.id}>{col.title}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
            
            {filteredTasks.filter(t => t.status === column.id).length === 0 && (
              <div className="h-24 border-2 border-dashed border-neutral-200 rounded-2xl flex items-center justify-center flex-col gap-1">
                <p className="text-xs font-bold text-neutral-300">TRỐNG</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
