import { useTasks } from '../lib/hooks/useTasks';
import { analyzeBehavior } from '../lib/adaptive/behaviorModel';
import { calculatePerformance } from '../lib/adaptive/performanceEngine';
import { motion } from 'motion/react';
import { Brain, Zap, Target, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdaptiveInsights() {
  const { data: tasks = [] } = useTasks();
  const insights = analyzeBehavior(tasks);
  const performance = calculatePerformance(tasks, insights);

  if (insights.total_completed < 3) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-neutral-900">AI Adaptive Insights</h3>
        </div>
        <p className="text-sm text-neutral-500">
          Hoàn thành thêm {3 - insights.total_completed} nhiệm vụ nữa để AI có đủ dữ liệu phân tích hành vi của bạn.
        </p>
      </div>
    );
  }

  const stats = [
    { label: 'Tốc độ', value: `${Math.round(performance.speed_score)}%`, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Tập trung', value: `${Math.round(performance.focus_score)}%`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tin cậy', value: `${Math.round(performance.reliability_score)}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <h3 className="font-bold text-neutral-900">AI Adaptive Insights</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
            Self-Learning Active
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">{stat.label}</p>
              <p className="text-lg font-bold text-neutral-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Khuyến nghị từ AI</h4>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-neutral-900">Khung giờ vàng</p>
                <p className="text-xs text-neutral-500">
                  Bạn làm việc hiệu quả nhất vào buổi <span className="font-bold text-blue-600 capitalize">{insights.best_time_block}</span>. 
                  Hệ thống sẽ ưu tiên xếp các việc quan trọng vào lúc này.
                </p>
              </div>
            </div>

            {insights.avg_speed < 0.8 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-neutral-900">Điều chỉnh thời gian</p>
                  <p className="text-xs text-neutral-500">
                    Bạn thường mất nhiều thời gian hơn dự kiến (+{( (1/insights.avg_speed - 1) * 100).toFixed(0)}%). 
                    AI đã tự động tăng thời gian ước tính cho các nhiệm vụ mới.
                  </p>
                </div>
              </div>
            )}

            {insights.interruption_rate > 1.2 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-neutral-900">Cảnh báo xao nhãng</p>
                  <p className="text-xs text-neutral-500">
                    Tỷ lệ bị gián đoạn của bạn khá cao ({insights.interruption_rate.toFixed(1)} lần/việc). 
                    Hãy thử chia nhỏ nhiệm vụ thành các block 25 phút.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
