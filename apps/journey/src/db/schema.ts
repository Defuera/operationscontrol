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
    enum: ['work', 'side', 'chores']
  }),
  priority: integer('priority').notNull().default(0),
  scheduledFor: text('scheduled_for'),
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
