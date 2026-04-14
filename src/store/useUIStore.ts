import { create } from 'zustand';
import { Task } from '../types';

type ViewType = 'table' | 'kanban' | 'calendar';

interface UIState {
  view: ViewType;
  setView: (view: ViewType) => void;
  isAddTaskOpen: boolean;
  setAddTaskOpen: (open: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'kanban',
  setView: (view) => set({ view }),
  isAddTaskOpen: false,
  setAddTaskOpen: (open) => set({ isAddTaskOpen: open }),
  editingTask: null,
  setEditingTask: (task) => set({ editingTask: task }),
}));
