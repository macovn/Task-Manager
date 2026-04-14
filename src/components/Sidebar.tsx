import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../store/useUIStore';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  Kanban, 
  Calendar as CalendarIcon, 
  LogOut, 
  CheckCircle2, 
  User,
  Brain,
  CalendarDays,
  Grid2X2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { view, setView } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isPlanner = location.pathname.startsWith('/planner');
  const isEisenhower = location.pathname === '/eisenhower';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <CheckCircle2 className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl text-neutral-900 tracking-tight">TaskFlow</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="pb-2">
          <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Chế độ xem</p>
          <button 
            onClick={() => {
              if (!isDashboard) navigate('/dashboard');
              setView('kanban');
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              isDashboard && view === 'kanban' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <Kanban className="w-5 h-5" />
            Bảng Kanban
          </button>
          <button 
            onClick={() => {
              if (!isDashboard) navigate('/dashboard');
              setView('table');
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              isDashboard && view === 'table' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <TableIcon className="w-5 h-5" />
            Dạng bảng
          </button>
          <button 
            onClick={() => {
              if (!isDashboard) navigate('/dashboard');
              setView('calendar');
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              isDashboard && view === 'calendar' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <CalendarIcon className="w-5 h-5" />
            Lịch
          </button>
        </div>

        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Công cụ thông minh</p>
          <button 
            onClick={() => navigate('/planner/daily')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              location.pathname === '/planner/daily' ? "bg-blue-50 text-blue-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <Brain className="w-5 h-5" />
            Lập kế hoạch ngày
          </button>
          <button 
            onClick={() => navigate('/planner/weekly')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              location.pathname === '/planner/weekly' ? "bg-purple-50 text-purple-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <CalendarDays className="w-5 h-5" />
            Lập kế hoạch tuần
          </button>
          <button 
            onClick={() => navigate('/eisenhower')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
              isEisenhower ? "bg-amber-50 text-amber-600" : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <Grid2X2 className="w-5 h-5" />
            Ma trận Eisenhower
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <div className="px-4 py-2 mb-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tác giả</p>
          <p className="text-sm font-bold text-neutral-900">Trương Thái Nguyên</p>
        </div>
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
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
