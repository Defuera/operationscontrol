'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
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
  onQuickAdd?: (title: string) => void;
  projectMap?: Map<string, Project>;
}

export function DayView({ tasks, onTaskClick, onToggleComplete, onQuickAdd, projectMap }: DayViewProps) {
  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    const title = addValue.trim();
    if (title && onQuickAdd) {
      onQuickAdd(title);
      setAddValue('');
      // Keep input open for rapid entry
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setAddValue('');
  };

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

        {onQuickAdd && (
          isAdding ? (
            <div className="flex items-center gap-3 p-2">
              <Plus className="h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  if (e.key === 'Escape') handleCancel();
                }}
                onBlur={() => {
                  if (!addValue.trim()) handleCancel();
                }}
                placeholder="Task title..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-muted-foreground w-full text-left"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Add task</span>
            </button>
          )
        )}

        {incompleteTasks.length === 0 && !isAdding && (
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
