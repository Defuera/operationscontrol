import { db } from '@/db';
import { tasks, projects, goals, journalEntries, files } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Task, Project, Goal, JournalEntry, FileAttachment, FileEntityType } from '@/types';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeReadTool(name: string, args: Record<string, unknown>, userId?: string): Promise<ToolResult> {
  try {
    switch (name) {
      case 'searchTasks': {
        // Build query with filters
        let allTasks = userId
          ? await db.select().from(tasks).where(eq(tasks.userId, userId))
          : await db.select().from(tasks);

        if (args.status) {
          allTasks = allTasks.filter(t => t.status === args.status);
        }
        if (args.domain) {
          allTasks = allTasks.filter(t => t.domain === args.domain);
        }
        if (args.projectId) {
          allTasks = allTasks.filter(t => t.projectId === args.projectId);
        }

        // Filter by query string if provided
        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          allTasks = allTasks.filter(t =>
            t.title.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: allTasks as Task[] };
      }

      case 'getTask': {
        const conditions = userId
          ? and(eq(tasks.id, args.taskId as string), eq(tasks.userId, userId))
          : eq(tasks.id, args.taskId as string);
        const result = await db.select().from(tasks).where(conditions);
        if (result.length === 0) {
          return { success: false, error: 'Task not found' };
        }
        return { success: true, data: result[0] as Task };
      }

      case 'searchProjects': {
        let allProjects = userId
          ? await db.select().from(projects).where(eq(projects.userId, userId))
          : await db.select().from(projects);

        if (args.type) {
          allProjects = allProjects.filter(p => p.type === args.type);
        }
        if (args.status) {
          allProjects = allProjects.filter(p => p.status === args.status);
        }
        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          allProjects = allProjects.filter(p =>
            p.name.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: allProjects as Project[] };
      }

      case 'getProject': {
        const conditions = userId
          ? and(eq(projects.id, args.projectId as string), eq(projects.userId, userId))
          : eq(projects.id, args.projectId as string);
        const project = await db.select().from(projects).where(conditions);
        if (project.length === 0) {
          return { success: false, error: 'Project not found' };
        }
        const taskConditions = userId
          ? and(eq(tasks.projectId, args.projectId as string), eq(tasks.userId, userId))
          : eq(tasks.projectId, args.projectId as string);
        const projectTasks = await db.select().from(tasks).where(taskConditions);
        return {
          success: true,
          data: {
            project: project[0] as Project,
            tasks: projectTasks as Task[],
          },
        };
      }

      case 'searchGoals': {
        let allGoals = userId
          ? await db.select().from(goals).where(eq(goals.userId, userId))
          : await db.select().from(goals);

        if (args.horizon) {
          allGoals = allGoals.filter(g => g.horizon === args.horizon);
        }
        if (args.status) {
          allGoals = allGoals.filter(g => g.status === args.status);
        }
        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          allGoals = allGoals.filter(g =>
            g.title.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: allGoals as Goal[] };
      }

      case 'getGoal': {
        const conditions = userId
          ? and(eq(goals.id, args.goalId as string), eq(goals.userId, userId))
          : eq(goals.id, args.goalId as string);
        const result = await db.select().from(goals).where(conditions);
        if (result.length === 0) {
          return { success: false, error: 'Goal not found' };
        }
        return { success: true, data: result[0] as Goal };
      }

      case 'searchJournalEntries': {
        const limit = (args.limit as number) || 10;
        let entries = userId
          ? await db.select().from(journalEntries)
              .where(eq(journalEntries.userId, userId))
              .orderBy(desc(journalEntries.createdAt))
              .limit(limit)
          : await db.select().from(journalEntries)
              .orderBy(desc(journalEntries.createdAt))
              .limit(limit);

        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          entries = entries.filter(e =>
            e.content.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: entries as JournalEntry[] };
      }

      case 'getJournalEntry': {
        const conditions = userId
          ? and(eq(journalEntries.id, args.entryId as string), eq(journalEntries.userId, userId))
          : eq(journalEntries.id, args.entryId as string);
        const result = await db.select().from(journalEntries).where(conditions);
        if (result.length === 0) {
          return { success: false, error: 'Journal entry not found' };
        }
        return { success: true, data: result[0] as JournalEntry };
      }

      case 'getFilesByEntity': {
        const entityType = args.entityType as FileEntityType;
        const entityId = args.entityId as string;
        const conditions = userId
          ? and(
              eq(files.entityType, entityType),
              eq(files.entityId, entityId),
              eq(files.userId, userId)
            )
          : and(eq(files.entityType, entityType), eq(files.entityId, entityId));
        const result = await db.select().from(files).where(conditions);
        return { success: true, data: result as FileAttachment[] };
      }

      case 'getFile': {
        const conditions = userId
          ? and(eq(files.id, args.fileId as string), eq(files.userId, userId))
          : eq(files.id, args.fileId as string);
        const result = await db.select().from(files).where(conditions);
        if (result.length === 0) {
          return { success: false, error: 'File not found' };
        }
        return { success: true, data: result[0] as FileAttachment };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function describeWriteAction(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    // Tasks
    case 'createTask':
      return `Create task: "${args.title}"`;
    case 'updateTask': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'taskId')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update task: ${changes}`;
    }
    case 'deleteTask':
      return `Delete task`;

    // Projects
    case 'createProject':
      return `Create project: "${args.name}"`;
    case 'updateProject': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'projectId')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update project: ${changes}`;
    }
    case 'deleteProject':
      return `Delete project`;

    // Goals
    case 'createGoal':
      return `Create ${args.horizon} goal: "${args.title}"`;
    case 'updateGoal': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'goalId')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update goal: ${changes}`;
    }
    case 'deleteGoal':
      return `Delete goal`;

    // Journal
    case 'createJournalEntry':
      return `Create journal entry`;
    case 'updateJournalEntry':
      return `Update journal entry`;
    case 'deleteJournalEntry':
      return `Delete journal entry`;

    // Files
    case 'deleteFile':
      return `Delete file attachment`;

    default:
      return `${name}: ${JSON.stringify(args)}`;
  }
}
