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
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
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
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm">{task.title}</p>
        <div className="flex items-center gap-2">
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
