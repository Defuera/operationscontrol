'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Expand } from 'lucide-react';
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
import type { Task, TaskDomain, BoardScope } from '@/types';

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
  }) => void;
  onDelete?: () => void;
  showDomain?: boolean;
  showBoardScope?: boolean;
  defaultBoardScope?: BoardScope;
  projectName?: string;
}

export function TaskDialog({ task, open, onClose, onSave, onDelete, showDomain = true, showBoardScope = false, defaultBoardScope = 'day', projectName }: TaskDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<TaskDomain>('work');
  const [priority, setPriority] = useState(0);
  const [boardScope, setBoardScope] = useState<BoardScope>(defaultBoardScope);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDomain(task.domain || 'work');
      setPriority(task.priority);
      setBoardScope(task.boardScope || defaultBoardScope);
    } else {
      setTitle('');
      setDescription('');
      setDomain('work');
      setPriority(0);
      setBoardScope(defaultBoardScope);
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        {task && (
          <button
            type="button"
            onClick={() => { onClose(); router.push(`/tasks/${task.id}`); }}
            className="absolute top-4 right-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 [&_svg]:size-4"
          >
            <Expand />
            <span className="sr-only">Open full page</span>
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          />

          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex gap-2">
            <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No priority</SelectItem>
                <SelectItem value="1">P1 - Urgent</SelectItem>
                <SelectItem value="2">P2 - High</SelectItem>
                <SelectItem value="3">P3 - Medium</SelectItem>
                <SelectItem value="4">P4 - Low</SelectItem>
              </SelectContent>
            </Select>

            {showDomain && (
              <Select value={domain} onValueChange={(v) => setDomain(v as TaskDomain)}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="side">Side Projects</SelectItem>
                  <SelectItem value="chores">Chores</SelectItem>
                  <SelectItem value="life">Life</SelectItem>
                </SelectContent>
              </Select>
            )}

            {showBoardScope && (
              <Select value={boardScope} onValueChange={(v) => setBoardScope(v as BoardScope)}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {task && onDelete && (
                <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
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
