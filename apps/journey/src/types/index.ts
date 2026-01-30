export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';
export type TaskDomain = 'work' | 'side' | 'chores' | 'life';
export type BoardScope = 'day' | 'week' | 'month' | 'quarter';

export interface Task {
  id: string;
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
}

export type ProjectType = 'side_project' | 'learning' | 'life';
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  goals: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LinkType = 'blocks' | 'related' | 'subtask';

export interface TaskLink {
  id: string;
  taskAId: string;
  taskBId: string;
  linkType: LinkType;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  aiAnalysis: string | null;
  createdAt: string;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  horizon: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}
