'use server';

import { db } from '@/db';
import { tasks, entityShortCodes } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import type { Task, TaskStatus, TaskDomain, BoardScope } from '@/types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  domain?: TaskDomain;
  priority?: number;
  scheduledFor?: string;
  boardScope?: BoardScope;
  projectId?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const user = await requireAuth();

  const task = await db.insert(tasks).values({
    userId: user.id,
    title: input.title,
    description: input.description || null,
    domain: input.domain || null,
    priority: input.priority || 0,
    scheduledFor: input.scheduledFor || null,
    boardScope: input.boardScope || null,
    projectId: input.projectId || null,
    status: 'backlog',
  }).returning();

  // Assign short code for entity linking
  const maxResult = await db
    .select({ maxCode: sql<number>`COALESCE(MAX(short_code), 0)` })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, 'task')
      )
    );
  const nextCode = (maxResult[0]?.maxCode || 0) + 1;
  await db.insert(entityShortCodes).values({
    userId: user.id,
    entityType: 'task',
    entityId: task[0].id,
    shortCode: nextCode,
  });

  revalidatePath('/');
  return task[0] as Task;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  const user = await requireAuth();

  await db.update(tasks)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  revalidatePath('/');
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const user = await requireAuth();

  await db.update(tasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  revalidatePath('/');
}

export async function addTaskToBoard(id: string, boardScope: BoardScope): Promise<void> {
  const user = await requireAuth();

  await db.update(tasks)
    .set({ boardScope, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  revalidatePath('/');
}

export async function removeTaskFromBoard(id: string): Promise<void> {
  const user = await requireAuth();

  await db.update(tasks)
    .set({ boardScope: null, updatedAt: new Date().toISOString() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  revalidatePath('/');
}

export async function deleteTask(id: string): Promise<void> {
  const user = await requireAuth();

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidatePath('/');
}

export async function getTasks(): Promise<Task[]> {
  const user = await requireAuth();

  const result = await db.select().from(tasks).where(eq(tasks.userId, user.id));
  return result as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const user = await requireAuth();

  const result = await db.select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  return (result[0] as Task) || null;
}

export async function getBoardTasks(): Promise<Task[]> {
  const user = await requireAuth();

  const result = await db.select()
    .from(tasks)
    .where(and(isNotNull(tasks.boardScope), eq(tasks.userId, user.id)));
  return result as Task[];
}
