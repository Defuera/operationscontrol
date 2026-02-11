import { db } from '@/db';
import { tasks, projects, goals, journalEntries, files, entityShortCodes, memories } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Task, Project, Goal, JournalEntry, FileAttachment, FileEntityType, MentionEntityType, Memory } from '@/types';

// Resolve a short code to an entity ID
async function resolveShortCode(
  entityType: MentionEntityType,
  shortCode: number,
  userId: string
): Promise<string | null> {
  const result = await db
    .select({ entityId: entityShortCodes.entityId })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, userId),
        eq(entityShortCodes.entityType, entityType),
        eq(entityShortCodes.shortCode, shortCode)
      )
    );
  return result[0]?.entityId || null;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeReadTool(name: string, args: Record<string, unknown>, userId?: string): Promise<ToolResult> {
  try {
    switch (name) {
      case 'searchTasks': {
        // Build query with filters and join short codes
        const results = userId
          ? await db
              .select({
                id: tasks.id,
                userId: tasks.userId,
                title: tasks.title,
                description: tasks.description,
                status: tasks.status,
                domain: tasks.domain,
                priority: tasks.priority,
                scheduledFor: tasks.scheduledFor,
                boardScope: tasks.boardScope,
                projectId: tasks.projectId,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
                shortCode: entityShortCodes.shortCode,
              })
              .from(tasks)
              .leftJoin(
                entityShortCodes,
                and(
                  eq(entityShortCodes.entityId, tasks.id),
                  eq(entityShortCodes.entityType, 'task')
                )
              )
              .where(eq(tasks.userId, userId))
          : await db.select().from(tasks);

        let allTasks = results as Task[];

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

        return { success: true, data: allTasks };
      }

      case 'getTask': {
        if (!userId) {
          return { success: false, error: 'User ID required for short code lookup' };
        }
        const shortCode = args.shortCode as number;
        const entityId = await resolveShortCode('task', shortCode, userId);
        if (!entityId) {
          return { success: false, error: `Task task#${shortCode} not found` };
        }
        const result = await db.select().from(tasks).where(
          and(eq(tasks.id, entityId), eq(tasks.userId, userId))
        );
        if (result.length === 0) {
          return { success: false, error: `Task task#${shortCode} not found` };
        }
        return { success: true, data: { ...result[0], shortCode } as Task };
      }

      case 'searchProjects': {
        const results = userId
          ? await db
              .select({
                id: projects.id,
                userId: projects.userId,
                name: projects.name,
                description: projects.description,
                type: projects.type,
                status: projects.status,
                goals: projects.goals,
                createdAt: projects.createdAt,
                updatedAt: projects.updatedAt,
                shortCode: entityShortCodes.shortCode,
              })
              .from(projects)
              .leftJoin(
                entityShortCodes,
                and(
                  eq(entityShortCodes.entityId, projects.id),
                  eq(entityShortCodes.entityType, 'project')
                )
              )
              .where(eq(projects.userId, userId))
          : await db.select().from(projects);

        let allProjects = results as Project[];

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

        return { success: true, data: allProjects };
      }

      case 'getProject': {
        if (!userId) {
          return { success: false, error: 'User ID required for short code lookup' };
        }
        const shortCode = args.shortCode as number;
        const entityId = await resolveShortCode('project', shortCode, userId);
        if (!entityId) {
          return { success: false, error: `Project project#${shortCode} not found` };
        }
        const project = await db.select().from(projects).where(
          and(eq(projects.id, entityId), eq(projects.userId, userId))
        );
        if (project.length === 0) {
          return { success: false, error: `Project project#${shortCode} not found` };
        }
        const projectTasks = await db.select().from(tasks).where(
          and(eq(tasks.projectId, entityId), eq(tasks.userId, userId))
        );
        return {
          success: true,
          data: {
            project: { ...project[0], shortCode } as Project,
            tasks: projectTasks as Task[],
          },
        };
      }

      case 'searchGoals': {
        const results = userId
          ? await db
              .select({
                id: goals.id,
                userId: goals.userId,
                title: goals.title,
                description: goals.description,
                horizon: goals.horizon,
                status: goals.status,
                createdAt: goals.createdAt,
                updatedAt: goals.updatedAt,
                shortCode: entityShortCodes.shortCode,
              })
              .from(goals)
              .leftJoin(
                entityShortCodes,
                and(
                  eq(entityShortCodes.entityId, goals.id),
                  eq(entityShortCodes.entityType, 'goal')
                )
              )
              .where(eq(goals.userId, userId))
          : await db.select().from(goals);

        let allGoals = results as Goal[];

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

        return { success: true, data: allGoals };
      }

      case 'getGoal': {
        if (!userId) {
          return { success: false, error: 'User ID required for short code lookup' };
        }
        const shortCode = args.shortCode as number;
        const entityId = await resolveShortCode('goal', shortCode, userId);
        if (!entityId) {
          return { success: false, error: `Goal goal#${shortCode} not found` };
        }
        const result = await db.select().from(goals).where(
          and(eq(goals.id, entityId), eq(goals.userId, userId))
        );
        if (result.length === 0) {
          return { success: false, error: `Goal goal#${shortCode} not found` };
        }
        return { success: true, data: { ...result[0], shortCode } as Goal };
      }

      case 'searchJournalEntries': {
        const limit = (args.limit as number) || 10;
        const results = userId
          ? await db
              .select({
                id: journalEntries.id,
                userId: journalEntries.userId,
                content: journalEntries.content,
                aiAnalysis: journalEntries.aiAnalysis,
                createdAt: journalEntries.createdAt,
                shortCode: entityShortCodes.shortCode,
              })
              .from(journalEntries)
              .leftJoin(
                entityShortCodes,
                and(
                  eq(entityShortCodes.entityId, journalEntries.id),
                  eq(entityShortCodes.entityType, 'journal')
                )
              )
              .where(eq(journalEntries.userId, userId))
              .orderBy(desc(journalEntries.createdAt))
              .limit(limit)
          : await db.select().from(journalEntries)
              .orderBy(desc(journalEntries.createdAt))
              .limit(limit);

        let entries = results as (JournalEntry & { shortCode?: number })[];

        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          entries = entries.filter(e =>
            e.content.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: entries };
      }

      case 'getJournalEntry': {
        if (!userId) {
          return { success: false, error: 'User ID required for short code lookup' };
        }
        const shortCode = args.shortCode as number;
        const entityId = await resolveShortCode('journal', shortCode, userId);
        if (!entityId) {
          return { success: false, error: `Journal entry journal#${shortCode} not found` };
        }
        const result = await db.select().from(journalEntries).where(
          and(eq(journalEntries.id, entityId), eq(journalEntries.userId, userId))
        );
        if (result.length === 0) {
          return { success: false, error: `Journal entry journal#${shortCode} not found` };
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

      case 'searchMemories': {
        if (!userId) {
          return { success: false, error: 'User ID required for memory search' };
        }
        const baseCondition = eq(memories.userId, userId);
        const pathCondition = args.anchorPath
          ? eq(memories.anchorPath, args.anchorPath as string)
          : undefined;

        const results = await db
          .select({
            id: memories.id,
            userId: memories.userId,
            anchorPath: memories.anchorPath,
            content: memories.content,
            tags: memories.tags,
            createdAt: memories.createdAt,
            updatedAt: memories.updatedAt,
            shortCode: entityShortCodes.shortCode,
          })
          .from(memories)
          .leftJoin(
            entityShortCodes,
            and(
              eq(entityShortCodes.entityId, memories.id),
              eq(entityShortCodes.entityType, 'memory')
            )
          )
          .where(pathCondition ? and(baseCondition, pathCondition) : baseCondition)
          .orderBy(desc(memories.createdAt));

        let allMemories = results as Memory[];

        // Filter by query string if provided
        if (args.query) {
          const searchTerm = (args.query as string).toLowerCase();
          allMemories = allMemories.filter(m =>
            m.content.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, data: allMemories };
      }

      case 'getMemory': {
        if (!userId) {
          return { success: false, error: 'User ID required for short code lookup' };
        }
        const shortCode = args.shortCode as number;
        const entityId = await resolveShortCode('memory', shortCode, userId);
        if (!entityId) {
          return { success: false, error: `Memory memory#${shortCode} not found` };
        }
        const result = await db
          .select({
            id: memories.id,
            userId: memories.userId,
            anchorPath: memories.anchorPath,
            content: memories.content,
            tags: memories.tags,
            createdAt: memories.createdAt,
            updatedAt: memories.updatedAt,
          })
          .from(memories)
          .where(and(eq(memories.id, entityId), eq(memories.userId, userId)));
        if (result.length === 0) {
          return { success: false, error: `Memory memory#${shortCode} not found` };
        }
        return { success: true, data: { ...result[0], shortCode } as Memory };
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
        .filter(([k]) => k !== 'shortCode')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update task#${args.shortCode}: ${changes}`;
    }
    case 'deleteTask':
      return `Delete task#${args.shortCode}`;

    // Projects
    case 'createProject':
      return `Create project: "${args.name}"`;
    case 'updateProject': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'shortCode')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update project#${args.shortCode}: ${changes}`;
    }
    case 'deleteProject':
      return `Delete project#${args.shortCode}`;

    // Goals
    case 'createGoal':
      return `Create ${args.horizon} goal: "${args.title}"`;
    case 'updateGoal': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'shortCode')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `Update goal#${args.shortCode}: ${changes}`;
    }
    case 'deleteGoal':
      return `Delete goal#${args.shortCode}`;

    // Journal
    case 'createJournalEntry':
      return `Create journal entry`;
    case 'updateJournalEntry':
      return `Update journal#${args.shortCode}`;
    case 'deleteJournalEntry':
      return `Delete journal#${args.shortCode}`;

    // Files
    case 'deleteFile':
      return `Delete file attachment`;

    // Memories
    case 'createMemory': {
      const preview = (args.content as string).slice(0, 50);
      const suffix = (args.content as string).length > 50 ? '...' : '';
      return `Remember: "${preview}${suffix}"${args.anchorPath ? ` (for ${args.anchorPath})` : ' (global)'}`;
    }
    case 'updateMemory': {
      const changes = Object.entries(args)
        .filter(([k]) => k !== 'shortCode')
        .map(([k, v]) => {
          if (k === 'content') {
            const preview = (v as string).slice(0, 30);
            return `content: "${preview}..."`;
          }
          return `${k}: ${v}`;
        })
        .join(', ');
      return `Update memory#${args.shortCode}: ${changes}`;
    }
    case 'deleteMemory':
      return `Delete memory#${args.shortCode}`;

    default:
      return `${name}: ${JSON.stringify(args)}`;
  }
}
