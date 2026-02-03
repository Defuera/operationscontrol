'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  onSave: (data: { title: string; description: string; domain?: TaskDomain; priority: number; boardScope?: BoardScope }) => void;
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
          {projectName && (
            <p className="text-sm text-muted-foreground">
              Project: {projectName}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-4">
            {showDomain && (
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Domain</label>
                <Select value={domain} onValueChange={(v) => setDomain(v as TaskDomain)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="side">Side Projects</SelectItem>
                    <SelectItem value="chores">Chores</SelectItem>
                    <SelectItem value="life">Life</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">Priority</label>
              <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger>
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
            </div>
            {showBoardScope && (
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Board Scope</label>
                <Select value={boardScope} onValueChange={(v) => setBoardScope(v as BoardScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            {task && onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
