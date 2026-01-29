'use server';

import { db } from '@/db';
import { goals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Goal, GoalStatus } from '@/types';

export interface CreateGoalInput {
  title: string;
  description?: string;
  horizon: string;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const now = new Date().toISOString();
  const goal = await db.insert(goals).values({
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || null,
    horizon: input.horizon,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).returning();

  revalidatePath('/goals');
  return goal[0] as Goal;
}

export async function updateGoal(
  id: string,
  data: Partial<Omit<Goal, 'id' | 'createdAt'>>
): Promise<void> {
  await db.update(goals)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(goals.id, id));

  revalidatePath('/goals');
}

export async function deleteGoal(id: string): Promise<void> {
  await db.delete(goals).where(eq(goals.id, id));
  revalidatePath('/goals');
}

export async function getGoals(): Promise<Goal[]> {
  const result = await db.select().from(goals);
  return result as Goal[];
}
