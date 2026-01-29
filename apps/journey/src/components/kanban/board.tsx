'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Column } from './column';
import { TaskCard } from './task-card';
import { TaskDialog } from './task-dialog';
import { ViewSwitcher, ViewType } from './view-switcher';
import { WeekView } from './week-view';
import { QuarterView } from './quarter-view';
import { Button } from '@/components/ui/button';
import { createTask, updateTask, updateTaskStatus, deleteTask } from '@/actions/tasks';
import type { Task, TaskStatus, TaskDomain } from '@/types';

const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done'];
const domains: (TaskDomain | 'all')[] = ['all', 'work', 'side', 'chores'];

interface BoardProps {
  initialTasks: Task[];
}

export function Board({ initialTasks }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [domainFilter, setDomainFilter] = useState<TaskDomain | 'all'>('all');
  const [view, setView] = useState<ViewType>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredTasks = domainFilter === 'all'
    ? tasks
    : tasks.filter(t => t.domain === domainFilter);

  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status] = filteredTasks.filter(t => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === taskId);

    if (task && task.status !== newStatus && statuses.includes(newStatus)) {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      try {
        await updateTaskStatus(taskId, newStatus);
      } catch {
        setTasks(initialTasks);
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    title: string;
    description: string;
    domain: TaskDomain;
    priority: number;
  }) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setTasks(prev =>
        prev.map(t => (t.id === editingTask.id ? { ...t, ...data } : t))
      );
    } else {
      const newTask = await createTask(data);
      setTasks(prev => [...prev, newTask]);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (editingTask) {
      await deleteTask(editingTask.id);
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
      setDialogOpen(false);
    }
  };

  const handleWeekClick = (weekStart: Date) => {
    setCurrentDate(weekStart);
    setView('week');
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">The Journey</h1>
        <Button onClick={handleNewTask}>+ New Task</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <ViewSwitcher
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
        <div className="flex gap-1">
          {domains.map(d => (
            <Button
              key={d}
              variant={domainFilter === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDomainFilter(d)}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {view === 'day' && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statuses.map(status => (
              <Column
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
          </DragOverlay>
        </DndContext>
      )}

      {view === 'week' && (
        <WeekView
          tasks={filteredTasks}
          currentDate={currentDate}
          onTaskClick={handleTaskClick}
        />
      )}

      {view === 'quarter' && (
        <QuarterView
          tasks={filteredTasks}
          currentDate={currentDate}
          onWeekClick={handleWeekClick}
        />
      )}

      <TaskDialog
        task={editingTask}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingTask ? handleDelete : undefined}
      />
    </div>
  );
}
