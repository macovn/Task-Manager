export function suggestSchedule(task: any, _tasks: any[], preferredStart: number = 9) {
  // simple version:
  const start = new Date();
  
  // If current hour is before preferred start, start at preferred start
  if (start.getHours() < preferredStart) {
    start.setHours(preferredStart, 0, 0, 0);
  } else {
    // Otherwise start in 1 hour
    start.setHours(start.getHours() + 1);
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (task.estimated_time || 60));

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
