'use server';

import { db } from '@/db';
import { aiThreads, aiMessages, aiActions, tasks, projects, goals, journalEntries } from '@/db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import type {
  AIThread,
  AIMessage,
  AIAction,
  AIMessageRole,
  AIActionType,
  AIEntityType,
} from '@/types';

// Internal version that accepts userId directly (for Telegram webhook)
export async function getOrCreateThreadForUser(
  userId: string,
  anchorPath?: string
): Promise<AIThread> {
  // Try to find existing thread for this path
  if (anchorPath) {
    const existing = await db.select().from(aiThreads)
      .where(and(eq(aiThreads.anchorPath, anchorPath), eq(aiThreads.userId, userId)));

    if (existing.length > 0) return existing[0] as AIThread;
  }

  // Create new thread
  const thread = await db.insert(aiThreads).values({
    userId,
    anchorPath: anchorPath || null,
    title: null,
  }).returning();

  return thread[0] as AIThread;
}

export async function getOrCreateThread(
  anchorPath?: string
): Promise<AIThread> {
  const user = await requireAuth();
  return getOrCreateThreadForUser(user.id, anchorPath);
}

export async function getThreadMessages(threadId: string): Promise<AIMessage[]> {
  const messages = await db.select().from(aiMessages)
    .where(eq(aiMessages.threadId, threadId))
    .orderBy(asc(aiMessages.createdAt));
  return messages as AIMessage[];
}

export async function createMessage(
  threadId: string,
  role: AIMessageRole,
  content: string,
  options?: {
    toolCalls?: unknown[];
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
  }
): Promise<AIMessage> {
  const message = await db.insert(aiMessages).values({
    threadId,
    role,
    content,
    toolCalls: options?.toolCalls ? JSON.stringify(options.toolCalls) : null,
    model: options?.model || null,
    promptTokens: options?.promptTokens || null,
    completionTokens: options?.completionTokens || null,
  }).returning();

  // Update thread's updatedAt
  await db.update(aiThreads)
    .set({ updatedAt: new Date().toISOString() })
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
  const action = await db.insert(aiActions).values({
    messageId,
    actionType,
    entityType,
    entityId: entityId || null,
    payload: JSON.stringify(payload),
    status: 'pending',
  }).returning();

  return action[0] as AIAction;
}

// Internal version that accepts userId directly (for Telegram webhook)
export async function confirmActionForUser(actionId: string, userId: string): Promise<AIAction> {
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
        userId,
        title: payload.title,
        description: payload.description || null,
        domain: payload.domain || null,
        priority: payload.priority || 0,
        scheduledFor: payload.scheduledFor || null,
        boardScope: payload.boardScope || null,
        projectId: payload.projectId || null,
        status: payload.status || 'backlog',
      }).returning();
      entityId = newTask[0].id;
      snapshotAfter = newTask[0];
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(tasks)
        .where(and(eq(tasks.id, action.entityId), eq(tasks.userId, userId)));
      if (!existing) throw new Error('Task not found');
      snapshotBefore = existing;
      const { taskId: _, ...taskUpdates } = payload;
      await db.update(tasks)
        .set({ ...taskUpdates, updatedAt: now })
        .where(and(eq(tasks.id, action.entityId), eq(tasks.userId, userId)));
      const [updated] = await db.select().from(tasks).where(eq(tasks.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(tasks)
        .where(and(eq(tasks.id, action.entityId), eq(tasks.userId, userId)));
      if (!existing) throw new Error('Task not found');
      snapshotBefore = existing;
      await db.delete(tasks).where(and(eq(tasks.id, action.entityId), eq(tasks.userId, userId)));
    }
  } else if (action.entityType === 'project') {
    if (action.actionType === 'create') {
      const newProject = await db.insert(projects).values({
        userId,
        name: payload.name,
        description: payload.description || null,
        type: payload.type,
        goals: payload.goals || null,
        status: 'active',
      }).returning();
      entityId = newProject[0].id;
      snapshotAfter = newProject[0];
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(projects)
        .where(and(eq(projects.id, action.entityId), eq(projects.userId, userId)));
      if (!existing) throw new Error('Project not found');
      snapshotBefore = existing;
      const { projectId: _, ...projectUpdates } = payload;
      await db.update(projects)
        .set({ ...projectUpdates, updatedAt: now })
        .where(and(eq(projects.id, action.entityId), eq(projects.userId, userId)));
      const [updated] = await db.select().from(projects).where(eq(projects.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(projects)
        .where(and(eq(projects.id, action.entityId), eq(projects.userId, userId)));
      if (!existing) throw new Error('Project not found');
      snapshotBefore = existing;
      await db.update(tasks)
        .set({ projectId: null })
        .where(and(eq(tasks.projectId, action.entityId), eq(tasks.userId, userId)));
      await db.delete(projects).where(and(eq(projects.id, action.entityId), eq(projects.userId, userId)));
    }
  } else if (action.entityType === 'goal') {
    if (action.actionType === 'create') {
      const newGoal = await db.insert(goals).values({
        userId,
        title: payload.title,
        description: payload.description || null,
        horizon: payload.horizon,
        status: 'active',
      }).returning();
      entityId = newGoal[0].id;
      snapshotAfter = newGoal[0];
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(goals)
        .where(and(eq(goals.id, action.entityId), eq(goals.userId, userId)));
      if (!existing) throw new Error('Goal not found');
      snapshotBefore = existing;
      const { goalId: _, ...goalUpdates } = payload;
      await db.update(goals)
        .set({ ...goalUpdates, updatedAt: now })
        .where(and(eq(goals.id, action.entityId), eq(goals.userId, userId)));
      const [updated] = await db.select().from(goals).where(eq(goals.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(goals)
        .where(and(eq(goals.id, action.entityId), eq(goals.userId, userId)));
      if (!existing) throw new Error('Goal not found');
      snapshotBefore = existing;
      await db.delete(goals).where(and(eq(goals.id, action.entityId), eq(goals.userId, userId)));
    }
  } else if (action.entityType === 'journal') {
    if (action.actionType === 'create') {
      const newEntry = await db.insert(journalEntries).values({
        userId,
        content: payload.content,
      }).returning();
      entityId = newEntry[0].id;
      snapshotAfter = newEntry[0];
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.id, action.entityId), eq(journalEntries.userId, userId)));
      if (!existing) throw new Error('Journal entry not found');
      snapshotBefore = existing;
      const { entryId: _, ...entryUpdates } = payload;
      await db.update(journalEntries)
        .set(entryUpdates)
        .where(and(eq(journalEntries.id, action.entityId), eq(journalEntries.userId, userId)));
      const [updated] = await db.select().from(journalEntries).where(eq(journalEntries.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.id, action.entityId), eq(journalEntries.userId, userId)));
      if (!existing) throw new Error('Journal entry not found');
      snapshotBefore = existing;
      await db.delete(journalEntries)
        .where(and(eq(journalEntries.id, action.entityId), eq(journalEntries.userId, userId)));
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

export async function confirmAction(actionId: string): Promise<AIAction> {
  const user = await requireAuth();
  return confirmActionForUser(actionId, user.id);
}

export async function rejectAction(actionId: string): Promise<AIAction> {
  await db.update(aiActions)
    .set({ status: 'rejected' })
    .where(eq(aiActions.id, actionId));

  const [updated] = await db.select().from(aiActions).where(eq(aiActions.id, actionId));
  return updated as AIAction;
}

export async function revertAction(actionId: string): Promise<AIAction> {
  const user = await requireAuth();

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
      await db.delete(tasks).where(and(eq(tasks.id, action.entityId), eq(tasks.userId, user.id)));
    } else if (action.actionType === 'update') {
      const before = JSON.parse(action.snapshotBefore!);
      await db.update(tasks)
        .set({ ...before, updatedAt: now })
        .where(and(eq(tasks.id, action.entityId), eq(tasks.userId, user.id)));
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

export async function getThreadByPath(
  anchorPath: string
): Promise<{ thread: AIThread; messages: AIMessage[] } | null> {
  const user = await requireAuth();

  const existing = await db.select().from(aiThreads)
    .where(and(eq(aiThreads.anchorPath, anchorPath), eq(aiThreads.userId, user.id)));

  if (existing.length === 0) return null;
  const thread = existing[0];

  const messages = await db.select().from(aiMessages)
    .where(eq(aiMessages.threadId, thread.id))
    .orderBy(asc(aiMessages.createdAt));

  return {
    thread: thread as AIThread,
    messages: messages as AIMessage[],
  };
}

export interface ThreadSummary {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getThreadsByPath(anchorPath: string): Promise<ThreadSummary[]> {
  const user = await requireAuth();

  // Get non-archived threads
  const threadRows = await db
    .select()
    .from(aiThreads)
    .where(sql`${aiThreads.anchorPath} = ${anchorPath} AND ${aiThreads.userId} = ${user.id} AND ${aiThreads.archivedAt} IS NULL`)
    .orderBy(desc(aiThreads.updatedAt));

  // Get message counts for these threads
  const threadIds = threadRows.map(t => t.id);
  if (threadIds.length === 0) return [];

  const counts = await db
    .select({
      threadId: aiMessages.threadId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(aiMessages)
    .where(sql`${aiMessages.threadId} IN (${sql.join(threadIds.map(id => sql`${id}`), sql`, `)})`)
    .groupBy(aiMessages.threadId);

  const countMap = new Map(counts.map(c => [c.threadId, c.count]));

  return threadRows.map(t => ({
    id: t.id,
    title: t.title,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messageCount: countMap.get(t.id) || 0,
  }));
}

export async function createThread(anchorPath: string): Promise<AIThread> {
  const user = await requireAuth();

  const thread = await db.insert(aiThreads).values({
    userId: user.id,
    anchorPath,
    title: null,
  }).returning();

  return thread[0] as AIThread;
}

export async function getThreadById(
  threadId: string
): Promise<{ thread: AIThread; messages: AIMessage[] } | null> {
  const user = await requireAuth();

  const [thread] = await db.select().from(aiThreads)
    .where(and(eq(aiThreads.id, threadId), eq(aiThreads.userId, user.id)));

  if (!thread) return null;

  const messages = await db.select().from(aiMessages)
    .where(eq(aiMessages.threadId, threadId))
    .orderBy(asc(aiMessages.createdAt));

  return {
    thread: thread as AIThread,
    messages: messages as AIMessage[],
  };
}

export interface TokenUsageByModel {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function getTokenUsageStats(): Promise<TokenUsageByModel[]> {
  const stats = await db
    .select({
      model: aiMessages.model,
      promptTokens: sql<number>`COALESCE(SUM(${aiMessages.promptTokens}), 0)`.as('prompt_tokens'),
      completionTokens: sql<number>`COALESCE(SUM(${aiMessages.completionTokens}), 0)`.as('completion_tokens'),
    })
    .from(aiMessages)
    .where(sql`${aiMessages.model} IS NOT NULL`)
    .groupBy(aiMessages.model);

  return stats.map(s => ({
    model: s.model!,
    promptTokens: Number(s.promptTokens),
    completionTokens: Number(s.completionTokens),
    totalTokens: Number(s.promptTokens) + Number(s.completionTokens),
  }));
}

export async function archiveThread(threadId: string): Promise<void> {
  const user = await requireAuth();

  await db.update(aiThreads)
    .set({ archivedAt: new Date().toISOString() })
    .where(and(eq(aiThreads.id, threadId), eq(aiThreads.userId, user.id)));
}
