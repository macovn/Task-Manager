import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../lib/hooks/useTasks';
import { useUIStore } from '../store/useUIStore';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  Kanban, 
  Calendar as CalendarIcon, 
  Plus, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Bell,
  User,
  Brain,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import TableView from '../components/TableView';
import KanbanBoard from '../components/KanbanBoard';
import CalendarView from '../components/CalendarView';
import AddTaskModal from '../components/AddTaskModal';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { view, setView, isAddTaskOpen, setAddTaskOpen, editingTask, setEditingTask } = useUIStore();
  const navigate = useNavigate();

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending', value: tasks.filter(t => t.status === 'todo').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const handleCloseModal = () => {
    setAddTaskOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* ... sidebar ... */}
      <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col">
        {/* ... existing sidebar content ... */}
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <CheckCircle2 className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl text-neutral-900 tracking-tight">TaskFlow</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView('kanban')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              view === 'kanban' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <Kanban className="w-5 h-5" />
            Kanban Board
          </button>
          <button 
            onClick={() => setView('table')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              view === 'table' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <TableIcon className="w-5 h-5" />
            Table View
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              view === 'calendar' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendar
          </button>

          <div className="pt-4 pb-2">
            <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Smart Tools</p>
            <button 
              onClick={() => navigate('/planner/daily')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-neutral-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Brain className="w-5 h-5" />
              Daily Planner
            </button>
            <button 
              onClick={() => navigate('/planner/weekly')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-neutral-500 hover:bg-purple-50 hover:text-purple-600"
            >
              <CalendarDays className="w-5 h-5" />
              Weekly Planner
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-neutral-200 px-8 flex items-center justify-between">
          <div className="relative w-96 hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-neutral-500 hover:bg-neutral-50 rounded-xl transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={() => setAddTaskOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New Task
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={stat.label} 
                  className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Active View */}
            <div className="min-h-[500px]">
              {view === 'table' && <TableView />}
              {view === 'kanban' && <KanbanBoard />}
              {view === 'calendar' && <CalendarView />}
            </div>
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
