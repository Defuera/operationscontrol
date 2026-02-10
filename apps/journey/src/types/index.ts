export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';
export type TaskDomain = 'work' | 'side' | 'chores' | 'life';
export type BoardScope = 'day' | 'week' | 'month' | 'quarter';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  domain: TaskDomain | null;
  priority: number;
  scheduledFor: string | null;
  boardScope: BoardScope | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  shortCode?: number;
}

export type ProjectType = 'side_project' | 'learning' | 'life';
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  goals: string | null;
  createdAt: string;
  updatedAt: string;
  shortCode?: number;
}

export type LinkType = 'blocks' | 'related' | 'subtask';

export interface TaskLink {
  id: string;
  userId: string;
  taskAId: string;
  taskBId: string;
  linkType: LinkType;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  aiAnalysis: string | null;
  createdAt: string;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  horizon: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  shortCode?: number;
}

// AI Chat Types
export type AIMessageRole = 'user' | 'assistant';
export type AIActionType = 'create' | 'update' | 'delete';
export type AIEntityType = 'task' | 'project' | 'goal' | 'journal' | 'file';
export type FileEntityType = 'task' | 'project' | 'goal' | 'journal';
export type AIActionStatus = 'pending' | 'confirmed' | 'rejected' | 'reverted';

export interface AIThread {
  id: string;
  userId: string;
  anchorPath: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  threadId: string;
  role: AIMessageRole;
  content: string;
  toolCalls: string | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

export interface AIAction {
  id: string;
  messageId: string;
  actionType: AIActionType;
  entityType: AIEntityType;
  entityId: string | null;
  payload: string;
  status: AIActionStatus;
  snapshotBefore: string | null;
  snapshotAfter: string | null;
  createdAt: string;
  executedAt: string | null;
  revertedAt: string | null;
}

export interface AIContext {
  path: string;
}

// File Attachments
export interface FileAttachment {
  id: string;
  userId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  entityType: FileEntityType;
  entityId: string;
  createdAt: string;
}

// Entity Short Codes (for GitHub-style references like task#123)
export type MentionEntityType = 'task' | 'project' | 'goal' | 'journal';

export interface EntityShortCode {
  id: string;
  userId: string;
  entityType: MentionEntityType;
  entityId: string;
  shortCode: number;
  createdAt: string;
}
