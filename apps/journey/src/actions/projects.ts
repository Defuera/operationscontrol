'use server';

import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Project, ProjectType, ProjectStatus, Task } from '@/types';

export interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  goals?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const project = await db.insert(projects).values({
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description || null,
    type: input.type,
    goals: input.goals || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/projects');
  return project[0] as Project;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
  await db.update(projects)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id));

  revalidatePath('/projects');
}

export async function deleteProject(id: string): Promise<void> {
  // Unlink tasks from project first
  await db.update(tasks)
    .set({ projectId: null })
    .where(eq(tasks.projectId, id));

  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath('/projects');
}

export async function getProjects(): Promise<Project[]> {
  const result = await db.select().from(projects);
  return result as Project[];
}

export async function getProjectWithTasks(id: string): Promise<{
  project: Project;
  tasks: Task[];
} | null> {
  const project = await db.select().from(projects).where(eq(projects.id, id));
  if (project.length === 0) return null;

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));
  return {
    project: project[0] as Project,
    tasks: projectTasks as Task[],
  };
}
