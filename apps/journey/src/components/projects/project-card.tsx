'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import type { Project } from '@/types';

const typeColors: Record<string, string> = {
  side_project: 'bg-purple-100 text-purple-800',
  learning: 'bg-blue-100 text-blue-800',
  life: 'bg-green-100 text-green-800',
};

const typeLabels: Record<string, string> = {
  side_project: 'Side Project',
  learning: 'Learning',
  life: 'Life',
};

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
}

export function ProjectCard({ project, taskCount = 0 }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold">{project.name}</h3>
          <Badge variant="secondary" className={typeColors[project.type]}>
            {typeLabels[project.type]}
          </Badge>
        </div>
        {project.description && (
          <div className="text-sm mb-3 line-clamp-2">
            <Markdown>{project.description}</Markdown>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{taskCount} tasks</span>
          <span className="capitalize">{project.status}</span>
        </div>
      </Card>
    </Link>
  );
}
