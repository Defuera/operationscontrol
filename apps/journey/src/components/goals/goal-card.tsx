'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
  onClick: () => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{goal.title}</h3>
        <Badge variant="outline" className="capitalize">
          {goal.status}
        </Badge>
      </div>
      {goal.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
      )}
    </Card>
  );
}
