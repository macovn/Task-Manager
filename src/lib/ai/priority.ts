export function calculatePriority(task: any, delayFactor: number = 1.0) {
  const now = new Date();
  if (!task.due_date) return 50 * delayFactor;
  
  const due = new Date(task.due_date);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  let score = 50;

  if (diffHours < 0) score = 100;
  else if (diffHours <= 24) score = 90;
  else if (diffHours <= 72) score = 70;

  if (task.priority === 'high') score += 15;
  if (task.estimated_time && task.estimated_time > 120) score += 10;

  // Apply behavior-based weight
  return Math.min(score * delayFactor, 100);
}
