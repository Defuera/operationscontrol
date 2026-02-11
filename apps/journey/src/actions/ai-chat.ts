'use server';

import { db } from '@/db';
import { aiThreads, aiMessages, aiActions, tasks, projects, goals, journalEntries, files, memories, entityShortCodes } from '@/db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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
    .where(and(eq(aiMessages.threadId, threadId), sql`${aiMessages.deletedAt} IS NULL`))
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
      const { shortCode: _, ...taskUpdates } = payload;
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
      const { shortCode: _sc, ...projectUpdates } = payload;
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
      const { shortCode: _sc2, ...goalUpdates } = payload;
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
      const { shortCode: _sc3, ...entryUpdates } = payload;
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
  } else if (action.entityType === 'file') {
    if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(files)
        .where(and(eq(files.id, action.entityId), eq(files.userId, userId)));
      if (!existing) throw new Error('File not found');
      snapshotBefore = existing;
      // Delete from Supabase Storage
      const supabase = await createClient();
      await supabase.storage.from('attachments').remove([existing.storagePath]);
      // Delete from database
      await db.delete(files)
        .where(and(eq(files.id, action.entityId), eq(files.userId, userId)));
    }
  } else if (action.entityType === 'memory') {
    if (action.actionType === 'create') {
      const newMemory = await db.insert(memories).values({
        userId,
        content: payload.content,
        anchorPath: payload.anchorPath || null,
        tags: payload.tags || null,
      }).returning();
      entityId = newMemory[0].id;
      snapshotAfter = newMemory[0];

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
        entityId: newMemory[0].id,
        shortCode: nextCode,
      });
    } else if (action.actionType === 'update' && action.entityId) {
      const [existing] = await db.select().from(memories)
        .where(and(eq(memories.id, action.entityId), eq(memories.userId, userId)));
      if (!existing) throw new Error('Memory not found');
      snapshotBefore = existing;
      const { shortCode: _sc4, ...memoryUpdates } = payload;
      await db.update(memories)
        .set({ ...memoryUpdates, updatedAt: now })
        .where(and(eq(memories.id, action.entityId), eq(memories.userId, userId)));
      const [updated] = await db.select().from(memories).where(eq(memories.id, action.entityId));
      snapshotAfter = updated;
    } else if (action.actionType === 'delete' && action.entityId) {
      const [existing] = await db.select().from(memories)
        .where(and(eq(memories.id, action.entityId), eq(memories.userId, userId)));
      if (!existing) throw new Error('Memory not found');
      snapshotBefore = existing;
      // Delete the short code first
      await db.delete(entityShortCodes)
        .where(
          and(
            eq(entityShortCodes.entityId, action.entityId),
            eq(entityShortCodes.entityType, 'memory'),
            eq(entityShortCodes.userId, userId)
          )
        );
      await db.delete(memories)
        .where(and(eq(memories.id, action.entityId), eq(memories.userId, userId)));
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
    .where(and(eq(aiMessages.threadId, thread.id), sql`${aiMessages.deletedAt} IS NULL`))
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
    .where(and(eq(aiMessages.threadId, threadId), sql`${aiMessages.deletedAt} IS NULL`))
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

export interface UsageStats {
  userUsage: TokenUsageByModel[];
  overallUsage: TokenUsageByModel[] | null;
  isAdmin: boolean;
}

export async function getTokenUsageStats(): Promise<UsageStats> {
  const user = await requireAuth();
  const isAdmin = user.id === process.env.ADMIN_USER_ID;

  // User's own usage (join through threads to filter by user)
  const userStats = await db
    .select({
      model: aiMessages.model,
      promptTokens: sql<number>`COALESCE(SUM(${aiMessages.promptTokens}), 0)`.as('prompt_tokens'),
      completionTokens: sql<number>`COALESCE(SUM(${aiMessages.completionTokens}), 0)`.as('completion_tokens'),
    })
    .from(aiMessages)
    .innerJoin(aiThreads, eq(aiMessages.threadId, aiThreads.id))
    .where(and(sql`${aiMessages.model} IS NOT NULL`, eq(aiThreads.userId, user.id)))
    .groupBy(aiMessages.model);

  const mapStats = (stats: typeof userStats) =>
    stats.map(s => ({
      model: s.model!,
      promptTokens: Number(s.promptTokens),
      completionTokens: Number(s.completionTokens),
      totalTokens: Number(s.promptTokens) + Number(s.completionTokens),
    }));

  let overallUsage: TokenUsageByModel[] | null = null;
  if (isAdmin) {
    const overallStats = await db
      .select({
        model: aiMessages.model,
        promptTokens: sql<number>`COALESCE(SUM(${aiMessages.promptTokens}), 0)`.as('prompt_tokens'),
        completionTokens: sql<number>`COALESCE(SUM(${aiMessages.completionTokens}), 0)`.as('completion_tokens'),
      })
      .from(aiMessages)
      .where(sql`${aiMessages.model} IS NOT NULL`)
      .groupBy(aiMessages.model);
    overallUsage = mapStats(overallStats);
  }

  return { userUsage: mapStats(userStats), overallUsage, isAdmin };
}

export async function archiveThread(threadId: string): Promise<void> {
  const user = await requireAuth();

  await db.update(aiThreads)
    .set({ archivedAt: new Date().toISOString() })
    .where(and(eq(aiThreads.id, threadId), eq(aiThreads.userId, user.id)));
}

export async function updateThreadTitle(threadId: string, title: string): Promise<void> {
  const user = await requireAuth();

  await db.update(aiThreads)
    .set({ title: title.trim() || null, updatedAt: new Date().toISOString() })
    .where(and(eq(aiThreads.id, threadId), eq(aiThreads.userId, user.id)));
}

export async function editMessageAndBranch(messageId: string): Promise<{ threadId: string }> {
  const user = await requireAuth();
  const now = new Date().toISOString();

  // Fetch the message to be edited
  const [message] = await db.select().from(aiMessages)
    .where(eq(aiMessages.id, messageId));

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.role !== 'user') {
    throw new Error('Can only edit user messages');
  }

  // Verify user owns this thread
  const [thread] = await db.select().from(aiThreads)
    .where(and(eq(aiThreads.id, message.threadId), eq(aiThreads.userId, user.id)));

  if (!thread) {
    throw new Error('Thread not found');
  }

  // Get all messages in the thread that come at or after this message (by createdAt)
  const messagesToDelete = await db.select().from(aiMessages)
    .where(
      and(
        eq(aiMessages.threadId, message.threadId),
        sql`${aiMessages.createdAt} >= ${message.createdAt}`,
        sql`${aiMessages.deletedAt} IS NULL`
      )
    );

  const messageIdsToDelete = messagesToDelete.map(m => m.id);

  // Soft-delete all these messages
  if (messageIdsToDelete.length > 0) {
    await db.update(aiMessages)
      .set({ deletedAt: now })
      .where(sql`${aiMessages.id} IN (${sql.join(messageIdsToDelete.map(id => sql`${id}`), sql`, `)})`);

    // Auto-reject any pending actions on soft-deleted messages
    await db.update(aiActions)
      .set({ status: 'rejected' })
      .where(
        and(
          sql`${aiActions.messageId} IN (${sql.join(messageIdsToDelete.map(id => sql`${id}`), sql`, `)})`,
          eq(aiActions.status, 'pending')
        )
      );
  }

  return { threadId: message.threadId };
}
