'use client';

import { Card } from '@/components/ui/card';
import type { Task } from '@/types';

interface QuarterViewProps {
  tasks: Task[];
  currentDate: Date;
  onWeekClick: (weekStart: Date) => void;
}

export function QuarterView({ tasks, currentDate, onWeekClick }: QuarterViewProps) {
  // Get start of quarter
  const quarterStart = new Date(currentDate);
  const quarterMonth = Math.floor(quarterStart.getMonth() / 3) * 3;
  quarterStart.setMonth(quarterMonth, 1);
  quarterStart.setHours(0, 0, 0, 0);

  // Get Monday of first week in quarter
  const firstMonday = new Date(quarterStart);
  const dayOfWeek = firstMonday.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  firstMonday.setDate(firstMonday.getDate() + diff);

  // Generate 13 weeks
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const weekStart = new Date(firstMonday);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { start: weekStart, end: weekEnd };
  });

  const getTasksForWeek = (weekStart: Date, weekEnd: Date) => {
    return tasks.filter(t => {
      if (!t.scheduledFor) return false;
      const taskDate = new Date(t.scheduledFor);
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
  };

  const isCurrentWeek = (weekStart: Date, weekEnd: Date) => {
    const today = new Date();
    return today >= weekStart && today <= weekEnd;
  };

  const getStatusCounts = (weekTasks: Task[]) => {
    return {
      todo: weekTasks.filter(t => t.status === 'todo').length,
      in_progress: weekTasks.filter(t => t.status === 'in_progress').length,
      done: weekTasks.filter(t => t.status === 'done').length,
    };
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {weeks.map(({ start, end }) => {
        const weekTasks = getTasksForWeek(start, end);
        const counts = getStatusCounts(weekTasks);
        const isCurrent = isCurrentWeek(start, end);

        return (
          <Card
            key={start.toISOString()}
            className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
              isCurrent ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onWeekClick(start)}
          >
            <div className="text-sm font-medium mb-2">
              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-yellow-600">{counts.todo} todo</span>
              <span className="text-blue-600">{counts.in_progress} active</span>
              <span className="text-green-600">{counts.done} done</span>
            </div>
            {weekTasks.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No scheduled tasks</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
