import { differenceInDays, parseISO } from 'date-fns';
import { Task } from '../../types';

export type EisenhowerQuadrant = 'q1' | 'q2' | 'q3' | 'q4';

export function getEisenhowerQuadrant(task: Task): EisenhowerQuadrant {
  const today = new Date();
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  
  // Logic:
  // - urgent: days_left <= 2 → true
  // - important: priority === 'high'
  
  const isUrgent = dueDate ? differenceInDays(dueDate, today) <= 2 : false;
  const isImportant = task.priority === 'high';

  if (isImportant && isUrgent) return 'q1';
  if (isImportant && !isUrgent) return 'q2';
  if (!isImportant && isUrgent) return 'q3';
  return 'q4';
}
