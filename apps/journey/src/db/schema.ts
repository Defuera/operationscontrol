import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tasks
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['backlog', 'todo', 'in_progress', 'done']
  }).notNull().default('backlog'),
  domain: text('domain', {
    enum: ['work', 'side', 'chores', 'life']
  }),
  priority: integer('priority').notNull().default(0),
  scheduledFor: text('scheduled_for'),
  boardScope: text('board_scope', {
    enum: ['day', 'week', 'month', 'quarter']
  }), // null = not on board
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});

// Projects
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', {
    enum: ['side_project', 'learning', 'life']
  }).notNull(),
  status: text('status', {
    enum: ['active', 'completed', 'archived']
  }).notNull().default('active'),
  goals: text('goals'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});

// Task Links (many-to-many self-reference)
export const taskLinks = pgTable('task_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  taskAId: uuid('task_a_id').notNull().references(() => tasks.id),
  taskBId: uuid('task_b_id').notNull().references(() => tasks.id),
  linkType: text('link_type', {
    enum: ['blocks', 'related', 'subtask']
  }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  aiAnalysis: text('ai_analysis'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

// Goals
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  horizon: text('horizon').notNull(), // yearly, quarterly, monthly, weekly, daily
  status: text('status', {
    enum: ['active', 'completed', 'archived']
  }).notNull().default('active'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});

// AI Threads
export const aiThreads = pgTable('ai_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  anchorPath: text('anchor_path'),
  title: text('title'),
  archivedAt: timestamp('archived_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});

// AI Messages
export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull().references(() => aiThreads.id),
  role: text('role', {
    enum: ['user', 'assistant']
  }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'), // JSON string of tool calls
  model: text('model'), // AI model used (for assistant messages)
  promptTokens: integer('prompt_tokens'), // Tokens in the prompt
  completionTokens: integer('completion_tokens'), // Tokens in the completion
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

// AI Actions (proposed/executed changes)
export const aiActions = pgTable('ai_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => aiMessages.id),
  actionType: text('action_type', {
    enum: ['create', 'update', 'delete']
  }).notNull(),
  entityType: text('entity_type', {
    enum: ['task', 'project', 'goal', 'journal']
  }).notNull(),
  entityId: uuid('entity_id'),
  payload: text('payload').notNull(), // JSON string of the action data
  status: text('status', {
    enum: ['pending', 'confirmed', 'rejected', 'reverted']
  }).notNull().default('pending'),
  snapshotBefore: text('snapshot_before'), // JSON string of entity state before
  snapshotAfter: text('snapshot_after'), // JSON string of entity state after
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  executedAt: timestamp('executed_at', { mode: 'string' }),
  revertedAt: timestamp('reverted_at', { mode: 'string' }),
});
