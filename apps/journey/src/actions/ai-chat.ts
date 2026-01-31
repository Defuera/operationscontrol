'use server';

import { db } from '@/db';
import { aiThreads, aiMessages, aiActions, tasks, projects, goals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type {
  AIThread,
  AIMessage,
  AIAction,
  AnchorEntityType,
  AIMessageRole,
  AIActionType,
  AIEntityType,
} from '@/types';

export async function getOrCreateThread(
  anchorType?: AnchorEntityType,
  anchorId?: string
): Promise<AIThread> {
  // Try to find existing thread for this anchor
  if (anchorType && anchorId) {
    const existing = await db.select().from(aiThreads)
      .where(eq(aiThreads.anchorEntityId, anchorId));

    const match = existing.find(t => t.anchorEntityType === anchorType);
    if (match) return match as AIThread;
  }

  // Create new thread
  const now = new Date().toISOString();
  const thread = await db.insert(aiThreads).values({
    id: crypto.randomUUID(),
    anchorEntityType: anchorType || null,
    anchorEntityId: anchorId || null,
    title: null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return thread[0] as AIThread;
}

export async function getThreadMessages(threadId: string): Promise<AIMessage[]> {
  const messages = await db.select().from(aiMessages)
    .where(eq(aiMessages.threadId, threadId));
  return messages as AIMessage[];
}

export async function createMessage(
  threadId: string,
  role: AIMessageRole,
  content: string,
  toolCalls?: unknown[]
): Promise<AIMessage> {
  const now = new Date().toISOString();
  const message = await db.insert(aiMessages).values({
    id: crypto.randomUUID(),
    threadId,
    role,
    content,
    toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
    createdAt: now,
  }).returning();

  // Update thread's updatedAt
  await db.update(aiThreads)
    .set({ updatedAt: now })
    .where(eq(aiThreads.id, threadId));

  return message[0] as AIMessage;
}

export async function createAction(
  messageId: string,
  actionType: AIActionType,
  entityType: AIEntityType,
  payload: unknown,
  entityId?: string
): Promise<AIAction> {
  const now = new Date().toISOString();
  const action = await db.insert(aiActions).values({
    id: crypto.randomUUID(),
    messageId,
    actionType,
    entityType,
    entityId: entityId || null,
    payload: JSON.stringify(payload),
    status: 'pending',
    createdAt: now,
  }).returning();

  return action[0] as AIAction;
}

export async function confirmAction(actionId: string): Promise<AIAction> {
  const [action] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  if (!action) throw new Error('Action not found');
  if (action.status !== 'pending') throw new Error('Action already processed');

  const payload = JSON.parse(action.payload);
  const now = new Date().toISOString();
  let snapshotBefore: unknown = null;
  let snapshotAfter: unknown = null;
  let entityId = action.entityId;

  // Execute the action based on type and entity
  if (action.entityType === 'task') {
    if (action.actionType === 'create') {
      const newTask = await db.insert(tasks).values({
        id: crypto.randomUUID(),
        title: payload.title,
        description: payload.description || null,
        domain: payload.domain || null,
        priority: payload.priority || 0,
        scheduledFor: payload.scheduledFor || null,
        boardScope: payload.boardScope || null,
        projectId: payload.projectId || null,
        status: payload.status || 'backlog',
        createdAt: now,
        updatedAt: now,
      }).returning();
      entityId = newTask[0].id;
      snapshotAfter = newTask[0];
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(tasks).where(eq(tasks.id, action.entityId));
      snapshotBefore = existing;
      await db.update(tasks)
        .set({ ...payload, updatedAt: now })
        .where(eq(tasks.id, action.entityId));
      const [updated] = await db.select().from(tasks).where(eq(tasks.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(tasks).where(eq(tasks.id, action.entityId));
      snapshotBefore = existing;
      await db.delete(tasks).where(eq(tasks.id, action.entityId));
    }
  } else if (action.entityType === 'project') {
    if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(projects).where(eq(projects.id, action.entityId));
      snapshotBefore = existing;
      await db.update(projects)
        .set({ ...payload, updatedAt: now })
        .where(eq(projects.id, action.entityId));
      const [updated] = await db.select().from(projects).where(eq(projects.id, action.entityId));
      snapshotAfter = updated;
    }
  } else if (action.entityType === 'goal') {
    if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(goals).where(eq(goals.id, action.entityId));
      snapshotBefore = existing;
      await db.update(goals)
        .set({ ...payload, updatedAt: now })
        .where(eq(goals.id, action.entityId));
      const [updated] = await db.select().from(goals).where(eq(goals.id, action.entityId));
      snapshotAfter = updated;
    }
  }

  // Update action with execution details
  await db.update(aiActions)
    .set({
      status: 'confirmed',
      entityId,
      snapshotBefore: snapshotBefore ? JSON.stringify(snapshotBefore) : null,
      snapshotAfter: snapshotAfter ? JSON.stringify(snapshotAfter) : null,
      executedAt: now,
    })
    .where(eq(aiActions.id, actionId));

  const [updated] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  return updated as AIAction;
}

export async function rejectAction(actionId: string): Promise<AIAction> {
  const now = new Date().toISOString();
  await db.update(aiActions)
    .set({ status: 'rejected' })
    .where(eq(aiActions.id, actionId));

  const [updated] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  return updated as AIAction;
}

export async function revertAction(actionId: string): Promise<AIAction> {
  const [action] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  if (!action) throw new Error('Action not found');
  if (action.status !== 'confirmed') throw new Error('Can only revert confirmed actions');
  if (!action.snapshotBefore && action.actionType !== 'create') {
    throw new Error('No snapshot available for revert');
  }

  const now = new Date().toISOString();

  // Revert the action
  if (action.entityType === 'task' && action.entityId) {
    if (action.actionType === 'create') {
      await db.delete(tasks).where(eq(tasks.id, action.entityId));
    } else if (action.actionType === 'update') {
      const before = JSON.parse(action.snapshotBefore!);
      await db.update(tasks)
        .set({ ...before, updatedAt: now })
        .where(eq(tasks.id, action.entityId));
    } else if (action.actionType === 'delete') {
      const before = JSON.parse(action.snapshotBefore!);
      await db.insert(tasks).values(before);
    }
  }

  await db.update(aiActions)
    .set({ status: 'reverted', revertedAt: now })
    .where(eq(aiActions.id, actionId));

  const [updated] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  return updated as AIAction;
}

export async function getActionsByMessage(messageId: string): Promise<AIAction[]> {
  const actions = await db.select().from(aiActions)
    .where(eq(aiActions.messageId, messageId));
  return actions as AIAction[];
}
