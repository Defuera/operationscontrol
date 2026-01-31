'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/types';

const domainColors: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800',
  side: 'bg-green-100 text-green-800',
  chores: 'bg-orange-100 text-orange-800',
  life: 'bg-purple-100 text-purple-800',
};

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onTaskClick: (task: Task) => void;
}

export function WeekView({ tasks, currentDate, onTaskClick }: WeekViewProps) {
  // Get Monday of current week
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getTasksForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.scheduledFor === dateStr);
  };

  const unscheduledTasks = tasks.filter(t => !t.scheduledFor);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-4">
      {unscheduledTasks.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">This Week</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.map(task => (
              <Card
                key={task.id}
                className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onTaskClick(task)}
              >
                <p className="text-xs font-medium">{task.title}</p>
                {task.domain && (
                  <Badge variant="secondary" className={`${domainColors[task.domain]} text-xs mt-1`}>
                    {task.domain}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayTasks = getTasksForDay(day);
          return (
            <div key={day.toISOString()} className="flex flex-col">
              <div className={`text-center py-2 rounded-t-lg ${isToday(day) ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                <div className="text-xs font-medium">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">{day.getDate()}</div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-b-lg p-2 min-h-[300px] space-y-2">
                {dayTasks.map(task => (
                  <Card
                    key={task.id}
                    className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onTaskClick(task)}
                  >
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    {task.domain && (
                      <Badge variant="secondary" className={`${domainColors[task.domain]} text-xs mt-1`}>
                        {task.domain}
                      </Badge>
                    )}
                  </Card>
                ))}
                {dayTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-4">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
