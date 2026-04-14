import React, { useState } from 'react';
import { useCreateTask } from '../lib/hooks/useCreateTask';
import { useUpdateTask } from '../lib/hooks/useUpdateTask';
import { Task } from '../types';
import { X, Loader2, Tag as TagIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Task | null;
}

export default function AddTaskModal({ isOpen, onClose, initialData }: AddTaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30');
  const [energyLevel, setEnergyLevel] = useState<Task['energy_level']>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  React.useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setPriority(initialData.priority);
      setDueDate(initialData.due_date ? initialData.due_date.split('T')[0] : '');
      setStartDate(initialData.start_date ? initialData.start_date.split('T')[0] : '');
      setEstimatedTime(initialData.estimated_time.toString());
      setEnergyLevel(initialData.energy_level || 'medium');
      setTags(initialData.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setStartDate('');
      setEstimatedTime('30');
      setEnergyLevel('medium');
      setTags([]);
    }
  }, [initialData, isOpen]);

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
      tags
    };

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
