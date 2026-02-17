'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, Project } from '@/types';

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
};

const domainColors: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800',
  side: 'bg-green-100 text-green-800',
  chores: 'bg-orange-100 text-orange-800',
  life: 'bg-purple-100 text-purple-800',
};

const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done'];

interface MobileCarouselProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onTaskClick: (task: Task) => void;
  projectMap?: Map<string, Project>;
}

export function MobileCarousel({ tasksByStatus, onTaskClick, projectMap }: MobileCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const columnWidth = el.scrollWidth / statuses.length;
    const index = Math.round(scrollLeft / columnWidth);
    setActiveIndex(Math.min(index, statuses.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-4 px-4"
      >
        {statuses.map(status => {
          const tasks = tasksByStatus[status];
          return (
            <div
              key={status}
              className="snap-center shrink-0 w-[calc(100vw-4rem)]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-sm text-gray-700">
                  {statusLabels[status]}
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2 rounded-lg min-h-[200px] bg-gray-50">
                {tasks.map(task => (
                  <Card
                    key={task.id}
                    className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex flex-col gap-2">
                      <p className="font-medium text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {projectMap && task.projectId && projectMap.get(task.projectId) && (
                          <span className="text-xs text-muted-foreground">
                            {projectMap.get(task.projectId)!.name}
                          </span>
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
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {statuses.map((status, i) => (
          <div
            key={status}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === activeIndex ? 'w-4 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}
