'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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
import type { Project, ProjectType, ProjectStatus } from '@/types';

interface ProjectDialogProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    type: ProjectType;
    goals: string;
    status?: ProjectStatus;
  }) => void;
  onDelete?: () => void;
}

export function ProjectDialog({ project, open, onClose, onSave, onDelete }: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('side_project');
  const [goals, setGoals] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setType(project.type);
      setGoals(project.goals || '');
      setStatus(project.status);
      setDescriptionOpen(!!project.description);
    } else {
      setName('');
      setDescription('');
      setType('side_project');
      setGoals('');
      setStatus('active');
      setDescriptionOpen(false);
    }
  }, [project, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description,
      type,
      goals,
      status: project ? status : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div>
            <Input
              placeholder="Project name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setDescriptionOpen(!descriptionOpen)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-1"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${descriptionOpen ? '' : '-rotate-90'}`}
              />
              Description {description && !descriptionOpen && '•••'}
            </button>
            {descriptionOpen && (
              <Textarea
                placeholder="Description (optional, supports markdown)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
              />
            )}
          </div>
          <div>
            <Textarea
              placeholder="Goals - what does success look like?"
              value={goals}
              onChange={e => setGoals(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side_project">Side Project</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="life">Life</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {project && (
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            {project && onDelete && (
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
