'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectDialog } from '@/components/projects';
import { TaskDialog } from '@/components/kanban';
import { useAIContext } from '@/components/ai-chat';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { EditableMarkdown } from '@/components/ui/editable-markdown';
import { getProjectWithTasksByShortCode, updateProject, deleteProject } from '@/actions/projects';
import { createTask, updateTask, deleteTask, addTaskToBoard, removeTaskFromBoard } from '@/actions/tasks';
import { MentionBadge } from '@/components/mentions';
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
import { FileUploadDialog, FileList } from '@/components/files';
import { getFilesByEntity } from '@/actions/files';
import type { Project, Task, ProjectType, ProjectStatus, TaskDomain, BoardScope, FileAttachment } from '@/types';

function parseGoals(goals: string): string[] {
  return goals
    .split(/[-•]/)
    .map(g => g.trim())
    .filter(g => g.length > 0);
}

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-800',
  todo: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const shortCode = parseInt(id, 10);
  const router = useRouter();
  const { setContext } = useAIContext();
  const isMobile = useIsMobile();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filesSheetOpen, setFilesSheetOpen] = useState(false);

  useEffect(() => {
    loadData();
    setContext(`/projects/${id}`);
    return () => setContext(null);
  }, [id, setContext]);

  const loadData = async () => {
    const data = await getProjectWithTasksByShortCode(shortCode);
    if (data) {
      setProject(data.project);
      setTasks(data.tasks);
      const projectFiles = await getFilesByEntity('project', data.project.id);
      setFiles(projectFiles);
    }
  };

  useRealtimeSync(['projects', 'tasks'], loadData);

  const handleProjectSave = async (data: {
    name: string;
    description: string;
    type: ProjectType;
    goals: string;
    status?: ProjectStatus;
  }) => {
    if (!project) return;
    await updateProject(project.id, data);
    setProject(prev => prev ? { ...prev, ...data } : null);
    setProjectDialogOpen(false);
  };

  const handleDescriptionSave = async (description: string) => {
    if (!project) return;
    await updateProject(project.id, { description });
    setProject(prev => prev ? { ...prev, description } : null);
  };

  const handleProjectDelete = async () => {
    if (!project) return;
    await deleteProject(project.id);
    router.push('/projects');
  };

  const handleTaskSave = async (data: {
    title: string;
    description: string;
    domain?: TaskDomain;
    priority: number;
  }) => {
    if (!project) return;
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...data } : t));
    } else {
      const newTask = await createTask({ ...data, projectId: project.id });
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
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  const filesContent = (
    <FileList
      files={files}
      onFileDeleted={(fileId) => setFiles(prev => prev.filter(f => f.id !== fileId))}
      layout="grid"
      hideTitle
      addButton={
        <FileUploadDialog
          entityType="project"
          entityId={project.id}
          onUploadComplete={(file) => setFiles(prev => [...prev, file])}
          variant="tile"
        />
      }
    />
  );

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  const doneCount = tasksByStatus.done.length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const goalsList = project.goals ? parseGoals(project.goals) : [];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.shortCode && (
            <MentionBadge entityType="project" shortCode={project.shortCode} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="outline" size="sm" onClick={() => setFilesSheetOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-1" />
              Files
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setProjectDialogOpen(true)}>
            Edit Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-6">
        <div className="flex-1 max-w-2xl">
          <EditableMarkdown
            value={project.description || ''}
            onChange={handleDescriptionSave}
            placeholder="Click to add a description..."
            className="mb-4"
          />
          {goalsList.length > 0 && (
            <div className="space-y-1 mb-4">
              <p className="text-sm font-medium text-gray-700">Goals</p>
              {goalsList.map((goal, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Circle className="h-4 w-4 mt-0.5 text-gray-300 flex-shrink-0" />
                  <span>{goal}</span>
                </div>
              ))}
            </div>
          )}
          {totalCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">
                {doneCount}/{totalCount} done ({progressPercent}%)
              </span>
            </div>
          )}
        </div>

        <div className="block max-md:hidden flex-1">
          <p className="text-sm text-gray-600 mb-2">Files</p>
          {filesContent}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
          + Add Task
        </Button>
        <span className="text-sm text-gray-500">{tasks.length} tasks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['todo', 'in_progress', 'done'] as const).map(status => (
          <div key={status}>
            <h3 className="font-semibold mb-3 capitalize">
              {status.replace('_', ' ')} ({tasksByStatus[status].length})
            </h3>
            <div className={`space-y-2 min-h-[100px] ${tasksByStatus[status].length === 0 ? 'border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center' : ''}`}>
              {tasksByStatus[status].length === 0 && (
                <p className="text-sm text-gray-400">No tasks</p>
              )}
              {tasksByStatus[status].map(task => (
                <Card
                  key={task.id}
                  className="p-3 hover:shadow-md transition-shadow"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      if (isMobile && task.shortCode) {
                        router.push(`/tasks/${task.shortCode}`);
                        return;
                      }
                      setEditingTask(task);
                      setTaskDialogOpen(true);
                    }}
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

      <Sheet open={filesSheetOpen} onOpenChange={setFilesSheetOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Files</SheetTitle>
            <SheetDescription className="sr-only">Project files</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {filesContent}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
