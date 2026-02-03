import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
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
  projectId: text('project_id').references(() => projects.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Projects
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', {
    enum: ['side_project', 'learning', 'life']
  }).notNull(),
  status: text('status', {
    enum: ['active', 'completed', 'archived']
  }).notNull().default('active'),
  goals: text('goals'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Task Links (many-to-many self-reference)
export const taskLinks = sqliteTable('task_links', {
  id: text('id').primaryKey(),
  taskAId: text('task_a_id').notNull().references(() => tasks.id),
  taskBId: text('task_b_id').notNull().references(() => tasks.id),
  linkType: text('link_type', {
    enum: ['blocks', 'related', 'subtask']
  }).notNull(),
  createdAt: text('created_at').notNull(),
});

// Journal Entries
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  aiAnalysis: text('ai_analysis'),
  createdAt: text('created_at').notNull(),
});

// Goals
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  horizon: text('horizon').notNull(), // yearly, quarterly, monthly, weekly, daily
  status: text('status', {
    enum: ['active', 'completed', 'archived']
  }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// AI Threads
export const aiThreads = sqliteTable('ai_threads', {
  id: text('id').primaryKey(),
  anchorPath: text('anchor_path'),
  title: text('title'),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// AI Messages
export const aiMessages = sqliteTable('ai_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => aiThreads.id),
  role: text('role', {
    enum: ['user', 'assistant']
  }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'), // JSON string of tool calls
  model: text('model'), // AI model used (for assistant messages)
  promptTokens: integer('prompt_tokens'), // Tokens in the prompt
  completionTokens: integer('completion_tokens'), // Tokens in the completion
  createdAt: text('created_at').notNull(),
});

// AI Actions (proposed/executed changes)
export const aiActions = sqliteTable('ai_actions', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => aiMessages.id),
  actionType: text('action_type', {
    enum: ['create', 'update', 'delete']
  }).notNull(),
  entityType: text('entity_type', {
    enum: ['task', 'project', 'goal', 'journal']
  }).notNull(),
  entityId: text('entity_id'),
  payload: text('payload').notNull(), // JSON string of the action data
  status: text('status', {
    enum: ['pending', 'confirmed', 'rejected', 'reverted']
  }).notNull().default('pending'),
  snapshotBefore: text('snapshot_before'), // JSON string of entity state before
  snapshotAfter: text('snapshot_after'), // JSON string of entity state after
  createdAt: text('created_at').notNull(),
  executedAt: text('executed_at'),
  revertedAt: text('reverted_at'),
});
