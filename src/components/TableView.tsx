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
  AlertCircle
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof Task | 'priority_val'; direction: 'asc' | 'desc' }>({ 
    key: 'ai_priority_score', 
    direction: 'desc' 
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

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
  }, [tasks, statusFilter, priorityFilter, keyFilter, sortConfig, startDate, endDate]);

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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-bold bg-neutral-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 pl-2 pr-8 outline-none"
            >
              <option value="all">All Status</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-sm font-bold bg-neutral-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 py-1.5 pl-2 pr-8 outline-none"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select 
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value as any)}
            className="text-sm font-bold bg-neutral-50 border-none rounded-lg focus:ring-2 focus:ring-orange-500 py-1.5 pl-2 pr-8 outline-none"
          >
            <option value="all">Tất cả nhiệm vụ</option>
            <option value="month">Trọng tâm tháng</option>
            <option value="quarter">Trọng tâm quý</option>
          </select>

          <div className="flex items-center gap-2 bg-neutral-50 rounded-lg px-2 py-1 border border-neutral-100">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold bg-transparent border-none outline-none"
            />
            <span className="text-neutral-300">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold bg-transparent border-none outline-none"
            />
          </div>

          {(statusFilter !== 'all' || priorityFilter !== 'all' || keyFilter !== 'all' || startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-sm text-neutral-500 font-bold">
          Showing {filteredAndSortedTasks.length} tasks
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider min-w-[300px]">
                  <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-neutral-900 transition-colors">
                    Title <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('priority_val')} className="flex items-center gap-1 hover:text-neutral-900 transition-colors">
                    Priority <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('ai_priority_score')} className="flex items-center gap-1 hover:text-neutral-900 transition-colors">
                    AI Score <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Người thực hiện</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Energy</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('due_date')} className="flex items-center gap-1 hover:text-neutral-900 transition-colors">
                    Due Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No tasks found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map((task) => {
                  const risk = analyzeTaskRisk(task, tasks);
                  return (
                    <tr key={task.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4 min-w-[300px]" title={task.title}>
                        <div className="flex flex-col">
                          <div className="font-bold text-neutral-900 whitespace-normal break-words">
                            {task.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {task.is_key && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md border border-orange-200">
                                <Zap className="w-2.5 h-2.5" />
                                {task.key_type === 'month' ? 'Trọng tâm tháng' : 'Trọng tâm quý'}
                              </span>
                            )}
                            {risk.risk_level !== 'low' && (
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                risk.risk_level === 'high' ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                              )}>
                                <AlertCircle className="w-2.5 h-2.5" />
                                Rủi ro: {risk.risk_level}
                              </span>
                            )}
                            {task.interruption_count > 2 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Nhiệm vụ khó
                            </span>
                          )}
                          {task.is_adjusted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-md">
                              Đã điều chỉnh
                            </span>
                          )}
                          {task.tags?.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-md">
                              <TagIcon className="w-2 h-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.status}
                        onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.value as any })}
                        className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full border-none focus:ring-2 outline-none cursor-pointer appearance-none",
                          task.status === 'done' ? "bg-green-100 text-green-700" :
                          task.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                          "bg-neutral-100 text-neutral-700"
                        )}
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask.mutate({ id: task.id, priority: e.target.value as any })}
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border-none focus:ring-2 outline-none cursor-pointer appearance-none",
                          task.priority === 'high' ? "bg-red-50 text-red-600" :
                          task.priority === 'medium' ? "bg-amber-50 text-amber-600" :
                          "bg-blue-50 text-blue-600"
                        )}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              task.ai_priority_score > 80 ? "bg-red-500" :
                              task.ai_priority_score > 60 ? "bg-amber-500" :
                              "bg-blue-500"
                            )}
                            style={{ width: `${task.ai_priority_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-neutral-600">{Math.round(task.ai_priority_score)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">
                          {task.assignee?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 
                           task.assignee?.email?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="text-sm font-medium text-neutral-700">
                          {task.assignee?.full_name || task.assignee?.email || 'Chưa bàn giao'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {task.energy_level ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-neutral-600">
                          <Zap className={cn(
                            "w-3 h-3",
                            task.energy_level === 'high' ? "text-amber-500 fill-amber-500" :
                            task.energy_level === 'medium' ? "text-amber-500" :
                            "text-neutral-300"
                          )} />
                          <span className="capitalize">{task.energy_level}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 font-bold">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeTaskId === task.id ? (
                          <button 
                            onClick={() => completeTask(task.id, task.estimated_time)}
                            className="p-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-600 transition-all"
                            title="Hoàn thành"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => startTask(task.id)}
                            disabled={!!activeTaskId}
                            className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-600 transition-all disabled:opacity-50"
                            title="Bắt đầu Focus"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingTask(task)}
                          className="p-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-neutral-200 rounded-xl text-neutral-500 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteTask.mutate(task.id)}
                          className="p-2 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl text-red-500 transition-all"
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
