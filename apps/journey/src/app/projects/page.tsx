'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectCard, ProjectDialog } from '@/components/projects';
import { getProjects, createProject } from '@/actions/projects';
import { getTasks } from '@/actions/tasks';
import type { Project, ProjectType, Task } from '@/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [projectsData, tasksData] = await Promise.all([
      getProjects(),
      getTasks(),
    ]);
    setProjects(projectsData);
    setTasks(tasksData);
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    type: ProjectType;
    goals: string;
  }) => {
    const newProject = await createProject(data);
    setProjects(prev => [...prev, newProject]);
    setDialogOpen(false);
  };

  const getTaskCount = (projectId: string) =>
    tasks.filter(t => t.projectId === projectId).length;

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setDialogOpen(true)}>+ New Project</Button>
      </div>

      {activeProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Active</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={getTaskCount(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {completedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={getTaskCount(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {archivedProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Archived</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archivedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={getTaskCount(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {projects.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      )}

      <ProjectDialog
        project={null}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </main>
  );
}
