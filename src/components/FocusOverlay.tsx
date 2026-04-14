import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Square, CheckCircle, Pause, Play } from 'lucide-react';
import { useFocusMode } from '../lib/hooks/useFocusMode';
import { useTasks } from '../lib/hooks/useTasks';
import { cn } from '../lib/utils';

export default function FocusOverlay() {
  const { activeTaskId, elapsedTime, isPaused, completeTask, stopTask, pauseTask, resumeTask } = useFocusMode();
  const { data: tasks = [] } = useTasks();

  const activeTask = useMemo(() => 
    tasks.find(t => t.id === activeTaskId), 
    [tasks, activeTaskId]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeTask) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4"
      >
        <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-2xl border border-neutral-800 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              isPaused ? "bg-amber-600" : "bg-blue-600 animate-pulse"
            )}>
              <Timer className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                {isPaused ? 'Đang tạm dừng' : 'Đang thực hiện'}
              </p>
              <h4 className="font-bold truncate max-w-[200px]">{activeTask.title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Thời gian</p>
              <p className={cn(
                "text-2xl font-mono font-bold transition-colors",
                isPaused ? "text-amber-400" : "text-blue-400"
              )}>{formatTime(elapsedTime)}</p>
            </div>

            <div className="flex items-center gap-2">
              {isPaused ? (
                <button 
                  onClick={() => resumeTask(activeTask.id)}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                  title="Tiếp tục"
                >
                  <Play className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button 
                  onClick={() => pauseTask(activeTask.id)}
                  className="p-3 bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
                  title="Tạm dừng"
                >
                  <Pause className="w-5 h-5 text-white" />
                </button>
              )}
              <button 
                onClick={stopTask}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
                title="Dừng"
              >
                <Square className="w-5 h-5 text-neutral-400" />
              </button>
              <button 
                onClick={() => completeTask(activeTask.id, activeTask.estimated_time)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
              >
                <CheckCircle className="w-5 h-5" />
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
