import { db } from '@/db';
import { tasks, projects, goals, journalEntries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Task, Project, Goal, JournalEntry } from '@/types';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeReadTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case 'searchTasks': {
        // Build query with filters
        let allTasks = await db.select().from(tasks);

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
        const result = await db.select().from(tasks)
          .where(eq(tasks.id, args.taskId as string));
        if (result.length === 0) {
          return { success: false, error: 'Task not found' };
        }
        return { success: true, data: result[0] as Task };
      }

      case 'searchProjects': {
        let allProjects = await db.select().from(projects);

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
        const project = await db.select().from(projects)
          .where(eq(projects.id, args.projectId as string));
        if (project.length === 0) {
          return { success: false, error: 'Project not found' };
        }
        const projectTasks = await db.select().from(tasks)
          .where(eq(tasks.projectId, args.projectId as string));
        return {
          success: true,
          data: {
            project: project[0] as Project,
            tasks: projectTasks as Task[],
          },
        };
      }

      case 'searchGoals': {
        let allGoals = await db.select().from(goals);

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
        const result = await db.select().from(goals)
          .where(eq(goals.id, args.goalId as string));
        if (result.length === 0) {
          return { success: false, error: 'Goal not found' };
        }
        return { success: true, data: result[0] as Goal };
      }

      case 'searchJournalEntries': {
        const limit = (args.limit as number) || 10;
        let entries = await db.select().from(journalEntries)
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
        const result = await db.select().from(journalEntries)
          .where(eq(journalEntries.id, args.entryId as string));
        if (result.length === 0) {
          return { success: false, error: 'Journal entry not found' };
        }
        return { success: true, data: result[0] as JournalEntry };
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

    default:
      return `${name}: ${JSON.stringify(args)}`;
  }
}
