'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectDialog } from '@/components/projects';
import { TaskDialog } from '@/components/kanban';
import { useAIContext } from '@/components/ai-chat';
import { EditableMarkdown } from '@/components/ui/editable-markdown';
import { getProjectWithTasks, updateProject, deleteProject } from '@/actions/projects';
import { createTask, updateTask, updateTaskStatus, deleteTask, addTaskToBoard, removeTaskFromBoard } from '@/actions/tasks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploadDialog, FileList } from '@/components/files';
import { getFilesByEntity, deleteFile } from '@/actions/files';
import type { Project, Task, ProjectType, ProjectStatus, TaskDomain, BoardScope, FileAttachment } from '@/types';

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-800',
  todo: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { setContext } = useAIContext();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
    setContext(`/projects/${id}`);
    return () => setContext(null);
  }, [id, setContext]);

  const loadData = async () => {
    const data = await getProjectWithTasks(id);
    if (data) {
      setProject(data.project);
      setTasks(data.tasks);
    }
    const projectFiles = await getFilesByEntity('project', id);
    setFiles(projectFiles);
  };

  const handleProjectSave = async (data: {
    name: string;
    description: string;
    type: ProjectType;
    goals: string;
    status?: ProjectStatus;
  }) => {
    await updateProject(id, data);
    setProject(prev => prev ? { ...prev, ...data } : null);
    setProjectDialogOpen(false);
  };

  const handleDescriptionSave = async (description: string) => {
    await updateProject(id, { description });
    setProject(prev => prev ? { ...prev, description } : null);
  };

  const handleProjectDelete = async () => {
    await deleteProject(id);
    router.push('/projects');
  };

  const handleTaskSave = async (data: {
    title: string;
    description: string;
    domain?: TaskDomain;
    priority: number;
  }) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...data } : t));
    } else {
      const newTask = await createTask({ ...data, projectId: id });
      setTasks(prev => [...prev, newTask]);
    }
    setTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskDelete = async () => {
    if (editingTask) {
      await deleteTask(editingTask.id);
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
      setTaskDialogOpen(false);
      setEditingTask(null);
    }
  };

  const handleAddToBoard = async (taskId: string, scope: BoardScope) => {
    await addTaskToBoard(taskId, scope);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, boardScope: scope } : t));
  };

  const handleRemoveFromBoard = async (taskId: string) => {
    await removeTaskFromBoard(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, boardScope: null } : t));
  };

  if (!project) {
    return <div className="p-8">Loading...</div>;
  }

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          <EditableMarkdown
            value={project.description || ''}
            onChange={handleDescriptionSave}
            placeholder="Click to add a description..."
            className="mb-2"
          />
          {project.goals && (
            <p className="text-sm text-gray-500">
              <strong>Goals:</strong> {project.goals}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setProjectDialogOpen(true)}>
          Edit Project
        </Button>
      </div>

      {files.length > 0 && (
        <div className="mb-6">
          <FileList
            files={files}
            onFileDeleted={(fileId) => setFiles(prev => prev.filter(f => f.id !== fileId))}
          />
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
          + Add Task
        </Button>
        <FileUploadDialog
          entityType="project"
          entityId={id}
          onUploadComplete={(file) => setFiles(prev => [...prev, file])}
        />
        <span className="text-sm text-gray-500">{tasks.length} tasks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['todo', 'in_progress', 'done'] as const).map(status => (
          <div key={status}>
            <h3 className="font-semibold mb-3 capitalize">
              {status.replace('_', ' ')} ({tasksByStatus[status].length})
            </h3>
            <div className="space-y-2">
              {tasksByStatus[status].map(task => (
                <Card
                  key={task.id}
                  className="p-3 hover:shadow-md transition-shadow"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}
                  >
                    <p className="font-medium text-sm mb-1">{task.title}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="secondary" className={statusColors[task.status]}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {task.boardScope && (
                        <Badge variant="outline" className="text-xs">
                          {task.boardScope}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    {task.boardScope ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleRemoveFromBoard(task.id)}
                      >
                        Remove from board
                      </Button>
                    ) : (
                      <Select onValueChange={(v) => handleAddToBoard(task.id, v as BoardScope)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Add to board..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="quarter">Quarter</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ProjectDialog
        project={project}
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        onSave={handleProjectSave}
        onDelete={handleProjectDelete}
      />

      <TaskDialog
        task={editingTask}
        open={taskDialogOpen}
        onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }}
        onSave={handleTaskSave}
        onDelete={editingTask ? handleTaskDelete : undefined}
        showDomain={false}
      />
    </main>
  );
}
