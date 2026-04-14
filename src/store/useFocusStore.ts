import { create } from 'zustand';

interface FocusState {
  activeTaskId: string | null;
  elapsedTime: number;
  isPaused: boolean;
  setActiveTaskId: (id: string | null) => void;
  setElapsedTime: (time: number | ((prev: number) => number)) => void;
  setIsPaused: (paused: boolean) => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  activeTaskId: null,
  elapsedTime: 0,
  isPaused: false,
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setElapsedTime: (time) => set((state) => ({ 
    elapsedTime: typeof time === 'function' ? time(state.elapsedTime) : time 
  })),
  setIsPaused: (paused) => set({ isPaused: paused }),
}));
