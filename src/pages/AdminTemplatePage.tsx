import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TaskTemplate } from '../types';
import { Plus, Trash2, Loader2, X, AlertCircle, CheckCircle2, ArrowLeft, ChevronRight, Edit2, Calendar, User, FileText, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Navigate, Link } from 'react-router-dom';
import { useTaskTemplates } from '../lib/hooks/useTaskTemplates';

export default function AdminTemplatePage() {
  const { session, profile, loading: authLoading } = useAuth();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates(session?.access_token || null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'monthly' as 'monthly' | 'quarterly',
    due_day: 1,
    assigned_to: '',
    is_active: true
  });

  const [users, setUsers] = useState<{ id: string, full_name: string, email: string }[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    if (session) fetchUsers();
  }, [session]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const handleOpenModal = (template?: TaskTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        title: template.title,
        description: template.description || '',
        frequency: template.frequency,
        due_day: template.due_day,
        assigned_to: template.assigned_to,
        is_active: template.is_active
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        title: '',
        description: '',
        frequency: 'monthly',
        due_day: 1,
        assigned_to: profile.id, // Default to self
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({ id: selectedTemplate.id, ...formData });
        setSuccess('Cập nhật mẫu nhiệm vụ thành công!');
      } else {
        await createTemplate.mutateAsync(formData);
        setSuccess('Tạo mẫu nhiệm vụ thành công!');
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá mẫu này?')) return;
    try {
      await deleteTemplate.mutateAsync(id);
      setSuccess('Xoá mẫu thành công!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunJob = async () => {
    if (!confirm('Bạn có muốn chạy job tạo nhiệm vụ định kỳ ngay bây giờ không?')) return;
    try {
      const res = await fetch('/api/admin/run-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ jobType: 'recurring' })
      });
      if (res.ok) {
        setSuccess('Job đã được kích hoạt!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Failed to run job');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-2">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-blue-600 transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại Dashboard</span>
        </Link>
        
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
          <span>Hệ thống</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-900">Mẫu nhiệm vụ định kỳ</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 text-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mẫu nhiệm vụ định kỳ</h1>
          <p className="text-neutral-500">Tự động tạo nhiệm vụ vào đầu tháng hoặc đầu quý.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRunJob}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-all border border-neutral-200"
          >
            <Repeat className="w-4 h-4" />
            Chạy Job Ngay
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            Tạo mẫu mới
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <motion.div
              layout
              key={template.id}
              className={cn(
                "group bg-white p-5 rounded-2xl border transition-all duration-300 relative",
                template.is_active ? "border-neutral-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50" : "border-neutral-200 opacity-60 grayscale"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-2 rounded-xl",
                  template.frequency === 'monthly' ? "bg-orange-50 text-orange-600" : "bg-purple-50 text-purple-600"
                )}>
                  <Repeat className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenModal(template)}
                    className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-neutral-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-1">
                {template.title}
              </h3>
              <p className="text-sm text-neutral-500 mb-4 line-clamp-2 h-10">
                {template.description || 'Không có mô tả'}
              </p>

              <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Tần suất
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md",
                    template.frequency === 'monthly' ? "text-orange-600 bg-orange-50" : "text-purple-600 bg-purple-50"
                  )}>
                    {template.frequency === 'monthly' ? 'Hàng tháng' : 'Hàng quý'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Hạn chót (Ngày)
                  </span>
                  <span className="text-neutral-900">Ngày {template.due_day}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Người thực hiện
                  </span>
                  <span className="text-neutral-900 line-clamp-1 max-w-[120px]">
                    {users.find(u => u.id === template.assigned_to)?.full_name || 'Hệ thống'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
              <FileText className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-500 font-bold">Chưa có mẫu nhiệm vụ nào</p>
              <button 
                onClick={() => handleOpenModal()}
                className="mt-4 text-blue-600 hover:underline font-bold"
              >
                Tạo mẫu đầu tiên ngay
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-900">
                  {selectedTemplate ? 'Chỉnh sửa mẫu' : 'Tạo mẫu mới'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-neutral-100 rounded-full">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Tiêu đề nhiệm vụ</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Báo cáo công việc..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Chi tiết về nhiệm vụ này..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Tần suất</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({...formData, frequency: e.target.value as any})}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="monthly">Hàng tháng</option>
                      <option value="quarterly">Hàng quý</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Hạn chót (Ngày)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={31}
                      value={formData.due_day}
                      onChange={(e) => setFormData({...formData, due_day: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Người thực hiện</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded border-neutral-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-neutral-700">Đang hoạt động</label>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-neutral-200 font-bold rounded-xl hover:bg-neutral-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
