'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './task-card';
import type { Task, TaskStatus, Project } from '@/types';

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showScope?: boolean;
  projectMap?: Map<string, Project>;
}

export function Column({ status, tasks, onTaskClick, showScope, projectMap }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-semibold text-sm text-gray-700">
          {statusLabels[status]}
        </h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 p-2 rounded-lg min-h-[200px] transition-colors ${
          isOver ? 'bg-gray-100' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              showScope={showScope}
              projectName={task.projectId && projectMap ? projectMap.get(task.projectId)?.name : undefined}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
