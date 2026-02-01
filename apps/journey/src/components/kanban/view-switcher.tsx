'use client';

import { Button } from '@/components/ui/button';

export type ViewType = 'day' | 'week' | 'quarter' | 'all';

interface ViewSwitcherProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function ViewSwitcher({ view, onViewChange, currentDate, onDateChange }: ViewSwitcherProps) {
  const views: ViewType[] = ['day', 'week', 'quarter', 'all'];

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 3);
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 3);
    onDateChange(newDate);
  };

  const goToToday = () => onDateChange(new Date());

  const formatDateLabel = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      const q = Math.floor(currentDate.getMonth() / 3) + 1;
      return `Q${q} ${currentDate.getFullYear()}`;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1">
        {views.map(v => (
          <Button
            key={v}
            variant={view === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={navigatePrev}>←</Button>
        <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
        <Button variant="outline" size="sm" onClick={navigateNext}>→</Button>
      </div>
      <span className="text-sm font-medium text-gray-600 min-w-[180px]">
        {formatDateLabel()}
      </span>
    </div>
  );
}
