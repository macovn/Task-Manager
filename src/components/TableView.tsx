import { useState, useMemo } from 'react';
import { useTasks } from '../lib/hooks/useTasks';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { useDeleteTask } from '../lib/hooks/useDeleteTask';
import { useUIStore } from '../store/useUIStore';
import { Task } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  Edit2, 
  Filter, 
  ArrowUpDown, 
  ChevronDown,
  Calendar,
  Zap,
  Tag as TagIcon,
  Play,
  CheckCircle,
  AlertCircle,
  Brain,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useFocusMode } from '../lib/hooks/useFocusMode';
import { analyzeTaskRisk } from '../lib/ai/riskEngine';

export default function TableView() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { setEditingTask } = useUIStore();
  const { activeTaskId, startTask, completeTask } = useFocusMode();

  // Filters & Sorting State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [keyFilter, setKeyFilter] = useState<'all' | 'month' | 'quarter'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Task | 'priority_val'; direction: 'asc' | 'desc' }>({ 
    key: 'ai_priority_score', 
    direction: 'desc' 
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Filter by Priority
    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter);
    }

    // Filter by Key Task
    if (keyFilter !== 'all') {
      result = result.filter(t => t.is_key && t.key_type === keyFilter);
    }

    // Filter by Date Range
    if (startDate && endDate) {
      result = result.filter(t => {
        if (!t.due_date) return false;
        const date = parseISO(t.due_date);
        return isWithinInterval(date, {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate))
        });
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Task];
      let bValue: any = b[sortConfig.key as keyof Task];

      if (sortConfig.key === 'priority_val') {
        const priorityMap = { low: 1, medium: 2, high: 3 };
        aValue = priorityMap[a.priority as keyof typeof priorityMap] || 0;
        bValue = priorityMap[b.priority as keyof typeof priorityMap] || 0;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, statusFilter, priorityFilter, keyFilter, sortConfig, startDate, endDate, searchQuery]);

  const toggleSort = (key: keyof Task | 'priority_val') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setKeyFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Control Bar: Technical Dashboard Style */}
      <div className="bg-neutral-900 text-white p-5 rounded-2xl shadow-xl border border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Search Box */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors group-focus-within:text-blue-400" />
              <input 
                type="text"
                placeholder="Tìm kiếm nhiệm vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-sm rounded-xl py-2 pl-10 pr-4 w-64 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
            </div>

            <div className="h-8 w-px bg-neutral-700" />

            {/* Quick Filters */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">Status</span>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 cursor-pointer text-neutral-300"
                >
                  <option value="all" className="bg-neutral-800">All</option>
                  <option value="todo" className="bg-neutral-800">Todo</option>
                  <option value="in_progress" className="bg-neutral-800">Process</option>
                  <option value="done" className="bg-neutral-800">Done</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">Priority</span>
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 cursor-pointer text-neutral-300"
                >
                  <option value="all" className="bg-neutral-800">All</option>
                  <option value="high" className="bg-neutral-800">High</option>
                  <option value="medium" className="bg-neutral-800">Med</option>
                  <option value="low" className="bg-neutral-800">Low</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 italic">Key Task</span>
                <select 
                  value={keyFilter}
                  onChange={(e) => setKeyFilter(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 cursor-pointer text-orange-400"
                >
                  <option value="all" className="bg-neutral-800">All</option>
                  <option value="month" className="bg-neutral-800">Month</option>
                  <option value="quarter" className="bg-neutral-800">Quarter</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(statusFilter !== 'all' || priorityFilter !== 'all' || keyFilter !== 'all' || startDate || endDate || searchQuery) && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest underline underline-offset-4 decoration-neutral-700"
              >
                Clear Filters
              </button>
            )}
            <div className="px-3 py-1 bg-neutral-800 rounded-lg border border-neutral-700">
              <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                Records: {filteredAndSortedTasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Precise and scannable */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xl shadow-neutral-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200">
                <th className="px-8 py-5">
                  <button onClick={() => toggleSort('title')} className="flex items-center gap-2 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors">
                    Nhiệm vụ <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-5">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-2 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors">
                    Trạng thái
                  </button>
                </th>
                <th className="px-6 py-5">
                  <button onClick={() => toggleSort('priority_val')} className="flex items-center gap-2 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors">
                    Prior <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-5">
                  <button onClick={() => toggleSort('ai_priority_score')} className="flex items-center gap-2 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors">
                    Score <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-5 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest">Assignee</th>
                <th className="px-6 py-5">
                  <button onClick={() => toggleSort('due_date')} className="flex items-center gap-2 text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors">
                    D-Line <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-8 py-5 text-right text-[11px] font-serif italic font-bold text-neutral-400 uppercase tracking-widest">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 italic-rows">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <p className="text-sm font-medium text-neutral-400 italic">No task metrics detected in current dataset.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const risk = analyzeTaskRisk(task, tasks);
                  return (
                    <tr key={task.id} className="hover:bg-neutral-50 transition-all group">
                      <td className="px-8 py-4 min-w-[320px]">
                        <div className="flex flex-col max-w-lg">
                          <div className="font-bold text-neutral-900 leading-tight mb-1 cursor-default">
                            {task.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.is_key && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-600 text-white rounded uppercase tracking-tighter">
                                KEY:{task.key_type?.toUpperCase()}
                              </span>
                            )}
                            {risk.risk_level === 'high' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-600 text-white rounded uppercase tracking-tighter">
                                RISK:CRITICAL
                              </span>
                            )}
                            {task.tags?.map(tag => (
                              <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded border border-neutral-200">
                                {tag.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border",
                          task.status === 'done' ? "bg-green-50 border-green-100 text-green-700" :
                          task.status === 'in_progress' ? "bg-blue-50 border-blue-100 text-blue-700 animate-pulse" :
                          "bg-neutral-50 border-neutral-200 text-neutral-600"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            task.status === 'done' ? "bg-green-500" :
                            task.status === 'in_progress' ? "bg-blue-500" :
                            "bg-neutral-400"
                          )} />
                          {task.status.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                          task.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                          task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-neutral-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={cn(
                                "h-full transition-all duration-700 ease-out",
                                task.ai_priority_score > 80 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                task.ai_priority_score > 60 ? "bg-amber-500" :
                                "bg-blue-500"
                              )}
                              style={{ width: `${task.ai_priority_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-neutral-500">{Math.round(task.ai_priority_score)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200 shrink-0">
                            {task.assignee?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                          </div>
                          <span className="text-[13px] font-medium text-neutral-700 truncate max-w-[120px]">
                            {task.assignee?.full_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono font-bold text-neutral-600">
                          {task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '---- / -- / --'}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          {activeTaskId === task.id ? (
                            <button 
                              onClick={() => completeTask(task.id, task.estimated_time)}
                              className="p-2 bg-green-500 text-white rounded-xl shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95"
                              title="Sync Completion"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => startTask(task.id)}
                              disabled={!!activeTaskId}
                              className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 shadow-none"
                              title="Engage Focus"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingTask(task)}
                            className="p-2 bg-neutral-100 text-neutral-500 rounded-xl hover:bg-neutral-800 hover:text-white transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteTask.mutate(task.id)}
                            className="p-2 bg-neutral-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
