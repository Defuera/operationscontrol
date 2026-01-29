'use client';

import { Card } from '@/components/ui/card';
import type { JournalEntry } from '@/types';

interface EntryCardProps {
  entry: JournalEntry;
  onClick: () => void;
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const date = new Date(entry.createdAt);
  const preview = entry.content.slice(0, 150) + (entry.content.length > 150 ? '...' : '');

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <time className="text-sm font-medium text-gray-700">
          {date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
        <time className="text-xs text-gray-500">
          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </time>
      </div>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{preview}</p>
      {entry.aiAnalysis && (
        <div className="mt-2 text-xs text-blue-600">AI analyzed</div>
      )}
    </Card>
  );
}
