'use server';

import { db } from '@/db';
import { memories, entityShortCodes } from '@/db/schema';
import { eq, and, or, isNull, sql, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import type { Memory } from '@/types';

export interface CreateMemoryInput {
  content: string;
  anchorPath?: string | null;
  tags?: string | null;
}

export interface UpdateMemoryInput {
  content?: string;
  tags?: string | null;
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const user = await requireAuth();

  const memory = await db.insert(memories).values({
    userId: user.id,
    content: input.content,
    anchorPath: input.anchorPath || null,
    tags: input.tags || null,
  }).returning();

  // Assign short code for entity linking
  const maxResult = await db
    .select({ maxCode: sql<number>`COALESCE(MAX(short_code), 0)` })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, 'memory')
      )
    );
  const nextCode = (maxResult[0]?.maxCode || 0) + 1;
  await db.insert(entityShortCodes).values({
    userId: user.id,
    entityType: 'memory',
    entityId: memory[0].id,
    shortCode: nextCode,
  });

  return { ...memory[0], shortCode: nextCode } as Memory;
}

// Internal version that accepts userId directly (for AI chat)
export async function createMemoryForUser(
  userId: string,
  input: CreateMemoryInput
): Promise<Memory> {
  const memory = await db.insert(memories).values({
    userId,
    content: input.content,
    anchorPath: input.anchorPath || null,
    tags: input.tags || null,
  }).returning();

  // Assign short code for entity linking
  const maxResult = await db
    .select({ maxCode: sql<number>`COALESCE(MAX(short_code), 0)` })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, userId),
        eq(entityShortCodes.entityType, 'memory')
      )
    );
  const nextCode = (maxResult[0]?.maxCode || 0) + 1;
  await db.insert(entityShortCodes).values({
    userId,
    entityType: 'memory',
    entityId: memory[0].id,
    shortCode: nextCode,
  });

  return { ...memory[0], shortCode: nextCode } as Memory;
}

export async function updateMemory(
  id: string,
  data: UpdateMemoryInput
): Promise<void> {
  const user = await requireAuth();

  await db.update(memories)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)));
}

export async function deleteMemory(id: string): Promise<void> {
  const user = await requireAuth();

  // Delete the short code first
  await db.delete(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.entityId, id),
        eq(entityShortCodes.entityType, 'memory'),
        eq(entityShortCodes.userId, user.id)
      )
    );

  await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, user.id)));
}

export async function getMemory(id: string): Promise<Memory | null> {
  const user = await requireAuth();

  const result = await db
    .select({
      id: memories.id,
      userId: memories.userId,
      anchorPath: memories.anchorPath,
      content: memories.content,
      tags: memories.tags,
      createdAt: memories.createdAt,
      updatedAt: memories.updatedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(memories)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, memories.id),
        eq(entityShortCodes.entityType, 'memory')
      )
    )
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)));

  return result[0] as Memory | null;
}

export async function getMemories(anchorPath?: string): Promise<Memory[]> {
  const user = await requireAuth();

  const baseCondition = eq(memories.userId, user.id);
  const pathCondition = anchorPath
    ? eq(memories.anchorPath, anchorPath)
    : undefined;

  const result = await db
    .select({
      id: memories.id,
      userId: memories.userId,
      anchorPath: memories.anchorPath,
      content: memories.content,
      tags: memories.tags,
      createdAt: memories.createdAt,
      updatedAt: memories.updatedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(memories)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, memories.id),
        eq(entityShortCodes.entityType, 'memory')
      )
    )
    .where(pathCondition ? and(baseCondition, pathCondition) : baseCondition)
    .orderBy(desc(memories.createdAt));

  return result as Memory[];
}

// Get memories for AI context: path-specific + global memories
export async function getMemoriesForContext(
  userId: string,
  path?: string
): Promise<Memory[]> {
  const baseCondition = eq(memories.userId, userId);

  // Get memories where anchorPath matches path OR is null (global)
  const pathCondition = path
    ? or(eq(memories.anchorPath, path), isNull(memories.anchorPath))
    : isNull(memories.anchorPath);

  const result = await db
    .select({
      id: memories.id,
      userId: memories.userId,
      anchorPath: memories.anchorPath,
      content: memories.content,
      tags: memories.tags,
      createdAt: memories.createdAt,
      updatedAt: memories.updatedAt,
      shortCode: entityShortCodes.shortCode,
    })
    .from(memories)
    .leftJoin(
      entityShortCodes,
      and(
        eq(entityShortCodes.entityId, memories.id),
        eq(entityShortCodes.entityType, 'memory')
      )
    )
    .where(and(baseCondition, pathCondition))
    .orderBy(desc(memories.createdAt));

  return result as Memory[];
}
