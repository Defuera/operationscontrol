'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileAttachments } from '@/components/files';
import type { Task, TaskStatus, TaskDomain, BoardScope } from '@/types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="w-40">{children}</div>
    </div>
  );
}

interface TaskDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    domain?: TaskDomain;
    priority: number;
    boardScope?: BoardScope;
    status?: TaskStatus;
    scheduledFor?: string | null;
  }) => void;
  onDelete?: () => void;
  showDomain?: boolean;
  showBoardScope?: boolean;
  defaultBoardScope?: BoardScope;
  projectName?: string;
}

export function TaskDialog({ task, open, onClose, onSave, onDelete, showDomain = true, showBoardScope = false, defaultBoardScope = 'day', projectName }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<TaskDomain>('work');
  const [priority, setPriority] = useState(0);
  const [boardScope, setBoardScope] = useState<BoardScope>(defaultBoardScope);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [scheduledFor, setScheduledFor] = useState('');

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDomain(task.domain || 'work');
      setPriority(task.priority);
      setBoardScope(task.boardScope || defaultBoardScope);
      setStatus(task.status);
      setScheduledFor(task.scheduledFor || '');
    } else {
      setTitle('');
      setDescription('');
      setDomain('work');
      setPriority(0);
      setBoardScope(defaultBoardScope);
      setStatus('todo');
      setScheduledFor('');
    }
  }, [task, open, defaultBoardScope]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      domain: showDomain ? domain : undefined,
      priority,
      boardScope: showBoardScope ? boardScope : undefined,
      ...(isEditing && {
        status,
        scheduledFor: scheduledFor || null,
      }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Two-panel body */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* Left panel — content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {projectName && (
                <p className="text-sm text-muted-foreground">
                  Project: {projectName}
                </p>
              )}

              <Input
                placeholder="Task title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
              />

              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                className="resize-none"
              />

              <FileAttachments entityType="task" entityId={task?.id || null} />
            </div>

            {/* Right panel — properties */}
            <div className="md:w-72 md:border-l border-t md:border-t-0 bg-muted/30 p-6 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Properties</p>

              {isEditing && (
                <PropertyRow label="Status">
                  <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
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
              )}

              <PropertyRow label="Priority">
                <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
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

              {showDomain && (
                <PropertyRow label="Domain">
                  <Select value={domain} onValueChange={(v) => setDomain(v as TaskDomain)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="side">Side Projects</SelectItem>
                      <SelectItem value="chores">Chores</SelectItem>
                      <SelectItem value="life">Life</SelectItem>
                    </SelectContent>
                  </Select>
                </PropertyRow>
              )}

              {showBoardScope && (
                <PropertyRow label="Board">
                  <Select value={boardScope} onValueChange={(v) => setBoardScope(v as BoardScope)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                    </SelectContent>
                  </Select>
                </PropertyRow>
              )}

              {isEditing && (
                <PropertyRow label="Scheduled">
                  <Input
                    type="date"
                    value={scheduledFor}
                    onChange={e => setScheduledFor(e.target.value)}
                    className="h-8 text-sm"
                  />
                </PropertyRow>
              )}

              {task?.createdAt && (
                <PropertyRow label="Created">
                  <span className="text-sm text-muted-foreground">{formatDate(task.createdAt)}</span>
                </PropertyRow>
              )}

              {task?.updatedAt && (
                <PropertyRow label="Updated">
                  <span className="text-sm text-muted-foreground">{formatDate(task.updatedAt)}</span>
                </PropertyRow>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <div>
              {task && onDelete && (
                <Button type="button" variant="destructive" onClick={onDelete}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
