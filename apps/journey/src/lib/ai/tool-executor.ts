import { db } from '@/db';
import { tasks, projects, goals } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Task, Project, Goal, TaskStatus, TaskDomain, GoalStatus } from '@/types';

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

      case 'getProjects': {
        let allProjects = await db.select().from(projects);

        if (args.status) {
          allProjects = allProjects.filter(p => p.status === args.status);
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

      case 'getGoals': {
        let allGoals = await db.select().from(goals);

        if (args.horizon) {
          allGoals = allGoals.filter(g => g.horizon === args.horizon);
        }
        if (args.status) {
          allGoals = allGoals.filter(g => g.status === args.status);
        }

        return { success: true, data: allGoals as Goal[] };
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
    case 'updateTask': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'taskId')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update task ${args.taskId}: ${changes}`;
    }
    case 'createTask':
      return `Create task: "${args.title}"`;
    case 'deleteTask':
      return `Delete task ${args.taskId}`;
    case 'updateProject': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'projectId')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update project ${args.projectId}: ${changes}`;
    }
    default:
      return `${name}: ${JSON.stringify(args)}`;
  }
}
