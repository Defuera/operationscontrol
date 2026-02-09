'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Task, Project } from '@/types';

const domainColors: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800',
  side: 'bg-green-100 text-green-800',
  chores: 'bg-orange-100 text-orange-800',
  life: 'bg-purple-100 text-purple-800',
};

interface DayViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  projectMap?: Map<string, Project>;
}

export function DayView({ tasks, onTaskClick, onToggleComplete, projectMap }: DayViewProps) {
  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        {incompleteTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
              className="text-gray-400 hover:text-green-600 transition-colors"
            >
              <Circle className="h-5 w-5" />
            </button>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onTaskClick(task)}
            >
              <span>{task.title}</span>
              {task.projectId && projectMap?.get(task.projectId) && (
                <span className="text-xs text-muted-foreground ml-2">
                  {projectMap.get(task.projectId)?.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.domain && (
                <Badge variant="secondary" className={`text-xs ${domainColors[task.domain]}`}>
                  {task.domain}
                </Badge>
              )}
              {task.priority > 0 && (
                <Badge variant="outline" className="text-xs">
                  P{task.priority}
                </Badge>
              )}
            </div>
          </div>
        ))}
        {incompleteTasks.length === 0 && (
          <p className="text-gray-500 text-sm py-4">No tasks for today. Add some from the backlog!</p>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
          {completedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                className="text-green-600 hover:text-gray-400 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5" />
              </button>
              <span
                className="flex-1 cursor-pointer text-gray-400 line-through"
                onClick={() => onTaskClick(task)}
              >
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
