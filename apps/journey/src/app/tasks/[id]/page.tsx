'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { EditableMarkdown } from '@/components/ui/editable-markdown';
import { FileAttachments } from '@/components/files';
import { useAIContext } from '@/components/ai-chat';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { getTaskByShortCode, updateTask, deleteTask } from '@/actions/tasks';
import { MentionBadge } from '@/components/mentions';
import type { Task, TaskStatus, TaskDomain, BoardScope } from '@/types';

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="w-40">{children}</div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shortCode = parseInt(id, 10);
  const router = useRouter();
  const { setContext } = useAIContext();
  const isMobile = useIsMobile();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  useEffect(() => {
    loadTask();
    setContext(`/tasks/${id}`);
    return () => setContext(null);
  }, [id, setContext]);

  const loadTask = async () => {
    const data = await getTaskByShortCode(shortCode);
    if (data) {
      setTask(data);
      setTitle(data.title);
    }
  };

  useRealtimeSync(['tasks'], loadTask);

  const handleUpdate = async (updates: Partial<Task>) => {
    if (!task) return;
    await updateTask(task.id, updates);
    setTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task?.title) {
      await handleUpdate({ title: trimmed });
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    router.back();
  };

  if (!task) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  const propertiesContent = (
    <>
      <PropertyRow label="Status">
        <Select value={task.status} onValueChange={(v) => handleUpdate({ status: v as TaskStatus })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label="Priority">
        <Select value={String(task.priority)} onValueChange={(v) => handleUpdate({ priority: Number(v) })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None</SelectItem>
            <SelectItem value="1">P1 - Urgent</SelectItem>
            <SelectItem value="2">P2 - High</SelectItem>
            <SelectItem value="3">P3 - Medium</SelectItem>
            <SelectItem value="4">P4 - Low</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label="Domain">
        <Select value={task.domain || 'none'} onValueChange={(v) => handleUpdate({ domain: v === 'none' ? null : v as TaskDomain })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="work">Work</SelectItem>
            <SelectItem value="side">Side Projects</SelectItem>
            <SelectItem value="chores">Chores</SelectItem>
            <SelectItem value="life">Life</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label="Board">
        <Select value={task.boardScope || 'none'} onValueChange={(v) => handleUpdate({ boardScope: v === 'none' ? null : v as BoardScope })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>

      <PropertyRow label="Scheduled">
        <Input
          type="date"
          value={task.scheduledFor || ''}
          onChange={e => handleUpdate({ scheduledFor: e.target.value || null })}
          className="h-8 text-sm"
        />
      </PropertyRow>

      {task.createdAt && (
        <PropertyRow label="Created">
          <span className="text-sm text-muted-foreground">{formatDate(task.createdAt)}</span>
        </PropertyRow>
      )}

      {task.updatedAt && (
        <PropertyRow label="Updated">
          <span className="text-sm text-muted-foreground">{formatDate(task.updatedAt)}</span>
        </PropertyRow>
      )}

      <div className="pt-4 mt-4 border-t">
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Task
        </Button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setPropertiesOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Properties
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            {task.shortCode && (
              <MentionBadge entityType="task" shortCode={task.shortCode} />
            )}
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto flex-1"
            />
          </div>

          <EditableMarkdown
            value={task.description || ''}
            onChange={(description) => handleUpdate({ description })}
            placeholder="Click to add a description..."
          />

          <FileAttachments entityType="task" entityId={task.id} />
        </div>

        {/* Right sidebar — desktop only */}
        <div className="block max-md:hidden w-72 flex-shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Properties</p>
          {propertiesContent}
        </div>
      </div>

      {/* Bottom sheet — mobile only */}
      <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Properties</SheetTitle>
            <SheetDescription className="sr-only">Task properties</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {propertiesContent}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
