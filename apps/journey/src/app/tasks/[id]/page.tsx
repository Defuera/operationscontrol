'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditableMarkdown } from '@/components/ui/editable-markdown';
import { FileAttachments } from '@/components/files';
import { useAIContext } from '@/components/ai-chat';
import { getTask, updateTask, deleteTask } from '@/actions/tasks';
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
  const router = useRouter();
  const { setContext } = useAIContext();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    loadTask();
    setContext(`/tasks/${id}`);
    return () => setContext(null);
  }, [id, setContext]);

  const loadTask = async () => {
    const data = await getTask(id);
    if (data) {
      setTask(data);
      setTitle(data.title);
    }
  };

  const handleUpdate = async (updates: Partial<Task>) => {
    await updateTask(id, updates);
    setTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task?.title) {
      await handleUpdate({ title: trimmed });
    }
  };

  const handleDelete = async () => {
    await deleteTask(id);
    router.back();
  };

  if (!task) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
          />

          <EditableMarkdown
            value={task.description || ''}
            onChange={(description) => handleUpdate({ description })}
            placeholder="Click to add a description..."
          />

          <FileAttachments entityType="task" entityId={id} />
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Properties</p>

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
        </div>
      </div>
    </main>
  );
}
