'use server';

import { db } from '@/db';
import { tasks, entityShortCodes } from '@/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';
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
  // Short code auto-assigned by DB trigger
  }).returning();

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

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      domain: tasks.domain,
      priority: tasks.priority,
      scheduledFor: tasks.scheduledFor,
      boardScope: tasks.boardScope,
      projectId: tasks.projectId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      archivedAt: tasks.archivedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(tasks)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, tasks.id),
        eq(entityShortCodes.entityType, 'task')
      )
    )
    .where(and(eq(tasks.userId, user.id), ne(tasks.status, 'archived')));

  return result as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const user = await requireAuth();

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      domain: tasks.domain,
      priority: tasks.priority,
      scheduledFor: tasks.scheduledFor,
      boardScope: tasks.boardScope,
      projectId: tasks.projectId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      archivedAt: tasks.archivedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(tasks)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, tasks.id),
        eq(entityShortCodes.entityType, 'task')
      )
    )
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  return (result[0] as Task) || null;
}

export async function getTaskByShortCode(shortCode: number): Promise<Task | null> {
  const user = await requireAuth();

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      domain: tasks.domain,
      priority: tasks.priority,
      scheduledFor: tasks.scheduledFor,
      boardScope: tasks.boardScope,
      projectId: tasks.projectId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      archivedAt: tasks.archivedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(tasks)
    .innerJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, tasks.id),
        eq(entityShortCodes.entityType, 'task')
      )
    )
    .where(
      and(
        eq(entityShortCodes.shortCode, shortCode),
        eq(tasks.userId, user.id)
      )
    );

  return (result[0] as Task) || null;
}

export async function getBoardTasks(): Promise<Task[]> {
  const user = await requireAuth();

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      domain: tasks.domain,
      priority: tasks.priority,
      scheduledFor: tasks.scheduledFor,
      boardScope: tasks.boardScope,
      projectId: tasks.projectId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      archivedAt: tasks.archivedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(tasks)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, tasks.id),
        eq(entityShortCodes.entityType, 'task')
      )
    )
    .where(and(isNotNull(tasks.boardScope), eq(tasks.userId, user.id), ne(tasks.status, 'archived')));

  return result as Task[];
}

export async function archiveCompletedTasks(boardScope: BoardScope): Promise<number> {
  const user = await requireAuth();
  const now = new Date().toISOString();

  const result = await db.update(tasks)
    .set({ status: 'archived', archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(tasks.userId, user.id),
        eq(tasks.status, 'done'),
        eq(tasks.boardScope, boardScope)
      )
    )
    .returning({ id: tasks.id });

  revalidatePath('/');
  return result.length;
}
