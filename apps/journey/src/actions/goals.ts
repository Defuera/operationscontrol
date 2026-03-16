'use server';

import { db } from '@/db';
import { goals, entityShortCodes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import type { Goal, GoalStatus } from '@/types';

export interface CreateGoalInput {
  title: string;
  description?: string;
  horizon: string;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const user = await requireAuth();

  const goal = await db.insert(goals).values({
    userId: user.id,
    title: input.title,
    description: input.description || null,
    horizon: input.horizon,
    status: 'active',
  // Short code auto-assigned by DB trigger
  }).returning();

  revalidatePath('/goals');
  return goal[0] as Goal;
}

export async function updateGoal(
  id: string,
  data: Partial<Omit<Goal, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  const user = await requireAuth();

  await db.update(goals)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

  revalidatePath('/goals');
}

export async function deleteGoal(id: string): Promise<void> {
  const user = await requireAuth();

  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  revalidatePath('/goals');
}

export async function getGoals(): Promise<Goal[]> {
  const user = await requireAuth();

  const result = await db
    .select({
      id: goals.id,
      userId: goals.userId,
      title: goals.title,
      description: goals.description,
      horizon: goals.horizon,
      status: goals.status,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(goals)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, goals.id),
        eq(entityShortCodes.entityType, 'goal')
      )
    )
    .where(eq(goals.userId, user.id));

  return result as Goal[];
}
