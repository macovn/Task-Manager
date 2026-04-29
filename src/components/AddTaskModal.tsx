import React, { useState, useEffect } from 'react';
import { useCreateTask } from '../lib/hooks/useCreateTask';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { Task, UserProfile } from '../types';
import { X, Loader2, Plus, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { canAssign } from '../lib/rbac';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export default function AddTaskModal({ isOpen, onClose, initialData }: AddTaskModalProps) {
  const { user, session, profile } = useAuth();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30');
  const [energyLevel, setEnergyLevel] = useState<Task['energy_level']>('medium');
  const [isKey, setIsKey] = useState(false);
  const [keyType, setKeyType] = useState<'month' | 'quarter'>('month');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!isOpen || !session) return;

    // Fetch all profiles for assignee list
    fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    .then(res => res.json())
    .then(data => {
      // Ensure data is an array
      const profilesData = Array.isArray(data) ? data : [];
      setAllProfiles(profilesData);
    })
    .catch(err => {
      console.error('Failed to fetch users:', err);
      setAllProfiles([]);
    });
  }, [isOpen, session]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority);
      setDueDate(initialData.due_date ? initialData.due_date.split('T')[0] : '');
      setStartDate(initialData.start_date ? initialData.start_date.split('T')[0] : '');
      setEstimatedTime(initialData.estimated_time.toString());
      setEnergyLevel(initialData.energy_level || 'medium');
      setIsKey(initialData.is_key || false);
      setKeyType(initialData.key_type || 'month');
      setTags(initialData.tags || []);
      setAssigneeId(initialData.assignee_id || user?.id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setStartDate('');
      setEstimatedTime('30');
      setEnergyLevel('medium');
      setIsKey(false);
      setKeyType('month');
      setTags([]);
      setAssigneeId(user?.id || '');
    }
  }, [initialData, isOpen, user]);

  const [assignableProfiles, setAssignableProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile || !allProfiles.length) return;
    
    console.log('Filtering assignable users for role:', profile.role);
    console.log('Current user profile:', profile);
    console.log('All available profiles:', allProfiles);

    const filtered = allProfiles.filter(p => {
      const isSelf = p.id === profile.id;
      const allowed = canAssign(profile.role, p.role, isSelf);
      if (isSelf) console.log(`Checking self assignment for ${p.email}: ${allowed}`);
      return allowed;
    });

    console.log('Assignable users count:', filtered.length);
    setAssignableProfiles(filtered);
  }, [profile, allProfiles]);

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      title,
      description,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      estimated_time: parseInt(estimatedTime),
      energy_level: energyLevel,
      tags,
      assignee_id: assigneeId,
      is_key: isKey,
      key_type: isKey ? keyType : null
    };

    try {
      if (initialData) {
        await updateTask.mutateAsync({
          id: initialData.id,
          ...taskData,
        });
      } else {
        await createTask.mutateAsync({
          ...taskData,
          status: 'todo'
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Task Submission Error:', err);
      alert(`Lỗi: ${err.message || 'Không thể lưu nhiệm vụ'}`);
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">
                {initialData ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Giao cho (Assignee)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Chọn người thực hiện</option>
                    {assignableProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id === user?.id ? 'Bản thân' : `${p.full_name || p.email || p.id.substring(0, 8)} (${p.role})`}
                      </option>
                    ))}
                  </select>
                </div>
                {assignableProfiles.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">Bạn không có quyền giao việc cho bất kỳ ai (bao gồm bản thân).</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Tiêu đề nhiệm vụ</label>
                <input
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Cần làm gì?"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                  placeholder="Thêm chi tiết..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Ưu tiên</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Mức năng lượng</label>
                   <select
                    value={energyLevel || 'medium'}
                    onChange={(e) => setEnergyLevel(e.target.value as Task['energy_level'])}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="low">Năng lượng thấp</option>
                    <option value="medium">Năng lượng trung bình</option>
                    <option value="high">Năng lượng cao</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Hạn chót</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Thời gian ước tính (phút)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="vd: 30, 60, 120"
                />
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isKey"
                    checked={isKey}
                    onChange={(e) => setIsKey(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                  />
                  <label htmlFor="isKey" className="text-sm font-bold text-neutral-700 cursor-pointer flex items-center gap-1.5">
                    🔥 Nhiệm vụ trọng tâm
                  </label>
                </div>

                {isKey && (
                  <div className="pl-7">
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Phân loại trọng tâm</label>
                    <div className="flex gap-2">
                       <button
                        type="button"
                        onClick={() => setKeyType('month')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          keyType === 'month' 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-blue-300'
                        }`}
                      >
                        Tháng
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeyType('quarter')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          keyType === 'quarter' 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-blue-300'
                        }`}
                      >
                        Quý
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Thẻ (Tags)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-800">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Thêm thẻ..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 text-neutral-600" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Cập nhật' : 'Tạo nhiệm vụ')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
