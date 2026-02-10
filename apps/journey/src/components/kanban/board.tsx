'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
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
import { DayView } from './day-view';
import { Button } from '@/components/ui/button';
import { createTask, updateTask, updateTaskStatus, deleteTask, getTasks } from '@/actions/tasks';
import { getProjects } from '@/actions/projects';
import type { Task, TaskStatus, TaskDomain, BoardScope, Project } from '@/types';


const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done'];
const domains: (TaskDomain | 'all')[] = ['all', 'work', 'side', 'chores', 'life'];

interface BoardProps {
  initialTasks: Task[];
  projects?: Project[];
}

export function Board({ initialTasks, projects: initialProjects = [] }: BoardProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const refetchData = useCallback(async () => {
    const [newTasks, newProjects] = await Promise.all([getTasks(), getProjects()]);
    setTasks(newTasks);
    setProjects(newProjects);
  }, []);

  useRealtimeSync(['tasks', 'projects'], refetchData, { enabled: !activeTask });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [domainFilter, setDomainFilter] = useState<TaskDomain | 'all'>('all');
  const [showProjectTasks, setShowProjectTasks] = useState(true);
  const [view, setView] = useState<ViewType>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Filter tasks based on view:
  // - day: tasks with boardScope='day'
  // - week: tasks with boardScope='week'
  // - all: tasks with boardScope=null (backlog)
  const getFilteredTasks = () => {
    let filtered = tasks
      .filter(t => domainFilter === 'all' || t.domain === domainFilter)
      .filter(t => showProjectTasks || !t.projectId);

    if (view === 'day') {
      return filtered.filter(t => t.boardScope === 'day');
    } else if (view === 'week') {
      return filtered.filter(t => t.boardScope === 'week');
    } else {
      // 'all' shows backlog - tasks with no scope assigned
      return filtered.filter(t => !t.boardScope);
    }
  };

  const filteredTasks = getFilteredTasks();

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
        refetchData();
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    if (isMobile) {
      router.push(`/tasks/${task.id}`);
      return;
    }
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      await updateTaskStatus(task.id, newStatus);
    } catch {
      refetchData();
    }
  };

  // Get default board scope for new tasks based on current view
  const getDefaultBoardScope = (): BoardScope | undefined => {
    if (view === 'day') return 'day';
    if (view === 'week') return 'week';
    return undefined; // backlog has no scope
  };

  const handleSave = async (data: {
    title: string;
    description: string;
    domain?: TaskDomain;
    priority: number;
    boardScope?: BoardScope;
  }) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setTasks(prev =>
        prev.map(t => (t.id === editingTask.id ? { ...t, ...data } : t))
      );
    } else {
      const newTask = await createTask({
        ...data,
        boardScope: data.boardScope || getDefaultBoardScope(),
      });
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

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <ViewSwitcher
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
        <div className="flex items-center gap-4">
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
          <Button
            variant={showProjectTasks ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowProjectTasks(!showProjectTasks)}
          >
            Projects {showProjectTasks ? 'On' : 'Off'}
          </Button>
          <Button onClick={handleNewTask}>+ New Task</Button>
        </div>
      </div>

      {view === 'day' && (
        <DayView
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onToggleComplete={handleToggleComplete}
          projectMap={projectMap}
        />
      )}

      {(view === 'week' || view === 'all') && (
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
                projectMap={projectMap}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDialog
        task={editingTask}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingTask ? handleDelete : undefined}
        showBoardScope={true}
        defaultBoardScope={getDefaultBoardScope()}
        projectName={editingTask?.projectId ? projectMap.get(editingTask.projectId)?.name : undefined}
      />
    </div>
  );
}
