'use server';

import { db } from '@/db';
import { projects, tasks, entityShortCodes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import type { Project, ProjectType, ProjectStatus, Task } from '@/types';

export interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  goals?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const user = await requireAuth();

  const project = await db.insert(projects).values({
    userId: user.id,
    name: input.name,
    description: input.description || null,
    type: input.type,
    goals: input.goals || null,
    status: 'active',
  }).returning();

  // Assign short code for entity linking
  const maxResult = await db
    .select({ maxCode: sql<number>`COALESCE(MAX(short_code), 0)` })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, 'project')
      )
    );
  const nextCode = (maxResult[0]?.maxCode || 0) + 1;
  await db.insert(entityShortCodes).values({
    userId: user.id,
    entityType: 'project',
    entityId: project[0].id,
    shortCode: nextCode,
  });

  revalidatePath('/projects');
  return project[0] as Project;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  const user = await requireAuth();

  await db.update(projects)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));

  revalidatePath('/projects');
}

export async function deleteProject(id: string): Promise<void> {
  const user = await requireAuth();

  // Unlink tasks from project first
  await db.update(tasks)
    .set({ projectId: null })
    .where(and(eq(tasks.projectId, id), eq(tasks.userId, user.id)));

  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  revalidatePath('/projects');
}

export async function getProjects(): Promise<Project[]> {
  const user = await requireAuth();

  const result = await db.select().from(projects).where(eq(projects.userId, user.id));
  return result as Project[];
}

export async function getProjectWithTasks(id: string): Promise<{
  project: Project;
  tasks: Task[];
} | null> {
  const user = await requireAuth();

  const project = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  if (project.length === 0) return null;

  const projectTasks = await db.select().from(tasks)
    .where(and(eq(tasks.projectId, id), eq(tasks.userId, user.id)));
  return {
    project: project[0] as Project,
    tasks: projectTasks as Task[],
  };
}
