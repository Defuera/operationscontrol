'use server';

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Task, TaskStatus, TaskDomain } from '@/types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  domain?: TaskDomain;
  priority?: number;
  scheduledFor?: string;
  projectId?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const task = await db.insert(tasks).values({
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || null,
    domain: input.domain || null,
    priority: input.priority || 0,
    scheduledFor: input.scheduledFor || null,
    projectId: input.projectId || null,
    status: 'backlog',
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/');
  return task[0] as Task;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<void> {
  await db.update(tasks)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));

  revalidatePath('/');
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await db.update(tasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));

  revalidatePath('/');
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath('/');
}

export async function getTasks(): Promise<Task[]> {
  const result = await db.select().from(tasks);
  return result as Task[];
}
