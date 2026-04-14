import { useTasks, Task } from '../hooks/useTasks';
import { useUIStore } from '../store/useUIStore';
import { CheckCircle2, Circle, Clock, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function TableView() {
  const { tasks, deleteTask } = useTasks();
  const { setEditingTask } = useUIStore();

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-bottom border-neutral-200">
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Title</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">AI Score</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Est. Time</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Due Date</th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                No tasks found. Create one to get started!
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="hover:bg-neutral-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-900">{task.title}</span>
                    <span className="text-sm text-neutral-500 line-clamp-1">{task.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                    task.status === 'done' ? "bg-green-100 text-green-700" :
                    task.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                    "bg-neutral-100 text-neutral-700"
                  )}>
                    {task.status === 'done' ? <CheckCircle2 className="w-3 h-3" /> :
                     task.status === 'in_progress' ? <Clock className="w-3 h-3" /> :
                     <Circle className="w-3 h-3" />}
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    task.ai_priority_score > 80 ? "bg-red-50 text-red-600 border border-red-100" :
                    task.ai_priority_score > 60 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                    "bg-blue-50 text-blue-600 border border-blue-100"
                  )}>
                    {Math.round(task.ai_priority_score)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    task.priority === 'high' ? "text-red-600" :
                    task.priority === 'medium' ? "text-amber-600" :
                    "text-blue-600"
                  )}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">
                  {task.estimated_time}m
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteTask.mutate(task.id)}
                      className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
