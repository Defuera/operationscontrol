'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/types';

const domainColors: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800',
  side: 'bg-green-100 text-green-800',
  chores: 'bg-orange-100 text-orange-800',
  life: 'bg-purple-100 text-purple-800',
};

const scopeLabels: Record<string, string> = {
  day: 'D',
  week: 'W',
  month: 'M',
  quarter: 'Q',
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  showScope?: boolean;
  projectName?: string;
}

export function TaskCard({ task, onClick, showScope, projectName }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      {showScope && task.boardScope && (
        <Badge variant="outline" className="text-xs font-mono absolute top-1 right-1">
          {scopeLabels[task.boardScope]}
        </Badge>
      )}
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm pr-6">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {projectName && (
            <span className="text-xs text-muted-foreground">{projectName}</span>
          )}
          {task.domain && (
            <Badge variant="secondary" className={domainColors[task.domain]}>
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
    </Card>
  );
}
