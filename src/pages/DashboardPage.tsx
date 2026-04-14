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
  CalendarDays,
  Zap,
  Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import TableView from '../components/TableView';
import KanbanBoard from '../components/KanbanBoard';
import CalendarView from '../components/CalendarView';
import AddTaskModal from '../components/AddTaskModal';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { calculateFocusScore } from '../lib/analytics/focusScore';

import Sidebar from '../components/Sidebar';
import AdaptiveInsights from '../components/AdaptiveInsights';

import { useRiskAnalysis } from '../hooks/useRiskAnalysis';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { stats: riskStats } = useRiskAnalysis();
  const { view, setView, isAddTaskOpen, setAddTaskOpen, editingTask, setEditingTask } = useUIStore();
  const navigate = useNavigate();

  const focusScore = calculateFocusScore(tasks);
  const plannedTasks = tasks.filter(t => t.suggested_schedule);
  const completedPlannedTasks = plannedTasks.filter(t => t.status === 'done');

  const stats = [
    { label: 'Tổng số nhiệm vụ', value: tasks.length, icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Đã hoàn thành', value: tasks.filter(t => t.status === 'done').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Nhiệm vụ rủi ro', value: riskStats.atRiskCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Ngày quá tải', value: riskStats.overloadedDaysCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const handleCloseModal = () => {
    setAddTaskOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-neutral-200 px-8 flex items-center justify-between">
          <div className="relative w-96 hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhiệm vụ..." 
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
              Nhiệm vụ mới
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-2 gap-6">
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

              <div className="lg:col-span-1">
                <AdaptiveInsights />
              </div>
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
