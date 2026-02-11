'use server';

import { db } from '@/db';
import { entityShortCodes, tasks, projects, goals, journalEntries, memories } from '@/db/schema';
import { eq, and, desc, sql, ilike, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import type { MentionEntityType, EntityShortCode } from '@/types';
import type { MentionSearchResult, ParsedMention, ResolvedMention } from '@/lib/mentions/types';
import { getEntityUrl } from '@/lib/mentions/resolver';

/**
 * Assign the next sequential short code to an entity
 */
export async function assignShortCode(
  entityType: MentionEntityType,
  entityId: string
): Promise<number> {
  const user = await requireAuth();

  // Get the current max short code for this user and entity type
  const maxResult = await db
    .select({ maxCode: sql<number>`COALESCE(MAX(short_code), 0)` })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, entityType)
      )
    );

  const nextCode = (maxResult[0]?.maxCode || 0) + 1;

  // Insert the new short code
  await db.insert(entityShortCodes).values({
    userId: user.id,
    entityType,
    entityId,
    shortCode: nextCode,
  });

  return nextCode;
}

/**
 * Get the short code for an entity
 */
export async function getShortCode(
  entityType: MentionEntityType,
  entityId: string
): Promise<number | null> {
  const user = await requireAuth();

  const result = await db
    .select({ shortCode: entityShortCodes.shortCode })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, entityType),
        eq(entityShortCodes.entityId, entityId)
      )
    );

  return result[0]?.shortCode ?? null;
}

/**
 * Get the entity ID for a short code
 */
export async function getEntityIdByShortCode(
  entityType: MentionEntityType,
  shortCode: number
): Promise<string | null> {
  const user = await requireAuth();

  const result = await db
    .select({ entityId: entityShortCodes.entityId })
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, user.id),
        eq(entityShortCodes.entityType, entityType),
        eq(entityShortCodes.shortCode, shortCode)
      )
    );

  return result[0]?.entityId ?? null;
}

/**
 * Search entities for autocomplete suggestions
 */
export async function searchEntitiesForMention(
  entityType: MentionEntityType,
  query: string
): Promise<MentionSearchResult[]> {
  const user = await requireAuth();
  const limit = 10;

  // If query is a number, search by short code prefix
  const isNumericQuery = /^\d+$/.test(query);

  if (isNumericQuery && query.length > 0) {
    // Search by short code prefix
    const shortCodePrefix = parseInt(query, 10);
    const results = await searchByShortCodePrefix(user.id, entityType, shortCodePrefix, limit);
    return results;
  }

  // Otherwise, search by title/name/content
  const results = await searchByTitle(user.id, entityType, query, limit);
  return results;
}

export interface GroupedSearchResults {
  tasks: MentionSearchResult[];
  projects: MentionSearchResult[];
  goals: MentionSearchResult[];
  memories: MentionSearchResult[];
}

/**
 * Search across all entity types for universal @ autocomplete
 * If query matches an entity type name (e.g., "memory", "task"), filter to that type
 */
export async function searchAllEntities(
  query: string
): Promise<GroupedSearchResults> {
  const user = await requireAuth();
  const limitPerType = 5;
  const lowerQuery = query.toLowerCase();

  // Check if query matches an entity type name - if so, show that type with empty query
  const entityTypeMatch = ['task', 'project', 'goal', 'memory'].find(
    (type) => type.startsWith(lowerQuery) && lowerQuery.length >= 3
  );

  if (entityTypeMatch) {
    // Show recent items of that type (empty query = no content filter)
    const results = await searchByTitle(user.id, entityTypeMatch as MentionEntityType, '', 10);
    return {
      tasks: entityTypeMatch === 'task' ? results : [],
      projects: entityTypeMatch === 'project' ? results : [],
      goals: entityTypeMatch === 'goal' ? results : [],
      memories: entityTypeMatch === 'memory' ? results : [],
    };
  }

  const [taskResults, projectResults, goalResults, memoryResults] = await Promise.all([
    searchByTitle(user.id, 'task', query, limitPerType),
    searchByTitle(user.id, 'project', query, limitPerType),
    searchByTitle(user.id, 'goal', query, limitPerType),
    searchByTitle(user.id, 'memory', query, limitPerType),
  ]);

  return {
    tasks: taskResults,
    projects: projectResults,
    goals: goalResults,
    memories: memoryResults,
  };
}

async function searchByShortCodePrefix(
  userId: string,
  entityType: MentionEntityType,
  prefix: number,
  limit: number
): Promise<MentionSearchResult[]> {
  // Find short codes that start with the given prefix
  const shortCodes = await db
    .select()
    .from(entityShortCodes)
    .where(
      and(
        eq(entityShortCodes.userId, userId),
        eq(entityShortCodes.entityType, entityType),
        sql`CAST(short_code AS TEXT) LIKE ${prefix + '%'}`
      )
    )
    .limit(limit);

  if (shortCodes.length === 0) return [];

  // Get entity details
  return getEntityDetails(userId, entityType, shortCodes as EntityShortCode[]);
}

async function searchByTitle(
  userId: string,
  entityType: MentionEntityType,
  query: string,
  limit: number
): Promise<MentionSearchResult[]> {
  const searchPattern = `%${query}%`;

  switch (entityType) {
    case 'task': {
      const results = await db
        .select({
          entityId: tasks.id,
          title: tasks.title,
          status: tasks.status,
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
        .where(
          and(
            eq(tasks.userId, userId),
            query ? ilike(tasks.title, searchPattern) : sql`TRUE`
          )
        )
        .orderBy(desc(tasks.createdAt))
        .limit(limit);

      return results
        .filter((r) => r.shortCode !== null)
        .map((r) => ({
          entityType: 'task' as const,
          entityId: r.entityId,
          shortCode: r.shortCode!,
          title: r.title,
          status: r.status,
        }));
    }

    case 'project': {
      const results = await db
        .select({
          entityId: projects.id,
          title: projects.name,
          status: projects.status,
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
        .where(
          and(
            eq(projects.userId, userId),
            query ? ilike(projects.name, searchPattern) : sql`TRUE`
          )
        )
        .orderBy(desc(projects.createdAt))
        .limit(limit);

      return results
        .filter((r) => r.shortCode !== null)
        .map((r) => ({
          entityType: 'project' as const,
          entityId: r.entityId,
          shortCode: r.shortCode!,
          title: r.title,
          status: r.status,
        }));
    }

    case 'goal': {
      const results = await db
        .select({
          entityId: goals.id,
          title: goals.title,
          status: goals.status,
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
        .where(
          and(
            eq(goals.userId, userId),
            query ? ilike(goals.title, searchPattern) : sql`TRUE`
          )
        )
        .orderBy(desc(goals.createdAt))
        .limit(limit);

      return results
        .filter((r) => r.shortCode !== null)
        .map((r) => ({
          entityType: 'goal' as const,
          entityId: r.entityId,
          shortCode: r.shortCode!,
          title: r.title,
          status: r.status,
        }));
    }

    case 'journal': {
      const results = await db
        .select({
          entityId: journalEntries.id,
          content: journalEntries.content,
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
        .where(
          and(
            eq(journalEntries.userId, userId),
            query ? ilike(journalEntries.content, searchPattern) : sql`TRUE`
          )
        )
        .orderBy(desc(journalEntries.createdAt))
        .limit(limit);

      return results
        .filter((r) => r.shortCode !== null)
        .map((r) => ({
          entityType: 'journal' as const,
          entityId: r.entityId,
          shortCode: r.shortCode!,
          title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
          status: null,
        }));
    }

    case 'memory': {
      const results = await db
        .select({
          entityId: memories.id,
          content: memories.content,
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
        .where(
          and(
            eq(memories.userId, userId),
            query ? ilike(memories.content, searchPattern) : sql`TRUE`
          )
        )
        .orderBy(desc(memories.createdAt))
        .limit(limit);

      return results
        .filter((r) => r.shortCode !== null)
        .map((r) => ({
          entityType: 'memory' as const,
          entityId: r.entityId,
          shortCode: r.shortCode!,
          title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
          status: null,
        }));
    }

    default:
      return [];
  }
}

async function getEntityDetails(
  userId: string,
  entityType: MentionEntityType,
  shortCodes: EntityShortCode[]
): Promise<MentionSearchResult[]> {
  const entityIds = shortCodes.map((sc) => sc.entityId);
  const shortCodeMap = new Map(shortCodes.map((sc) => [sc.entityId, sc.shortCode]));

  switch (entityType) {
    case 'task': {
      const results = await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, entityIds)));

      return results.map((r) => ({
        entityType: 'task' as const,
        entityId: r.id,
        shortCode: shortCodeMap.get(r.id)!,
        title: r.title,
        status: r.status,
      }));
    }

    case 'project': {
      const results = await db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .where(and(eq(projects.userId, userId), inArray(projects.id, entityIds)));

      return results.map((r) => ({
        entityType: 'project' as const,
        entityId: r.id,
        shortCode: shortCodeMap.get(r.id)!,
        title: r.name,
        status: r.status,
      }));
    }

    case 'goal': {
      const results = await db
        .select({ id: goals.id, title: goals.title, status: goals.status })
        .from(goals)
        .where(and(eq(goals.userId, userId), inArray(goals.id, entityIds)));

      return results.map((r) => ({
        entityType: 'goal' as const,
        entityId: r.id,
        shortCode: shortCodeMap.get(r.id)!,
        title: r.title,
        status: r.status,
      }));
    }

    case 'journal': {
      const results = await db
        .select({ id: journalEntries.id, content: journalEntries.content })
        .from(journalEntries)
        .where(and(eq(journalEntries.userId, userId), inArray(journalEntries.id, entityIds)));

      return results.map((r) => ({
        entityType: 'journal' as const,
        entityId: r.id,
        shortCode: shortCodeMap.get(r.id)!,
        title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
        status: null,
      }));
    }

    case 'memory': {
      const results = await db
        .select({ id: memories.id, content: memories.content })
        .from(memories)
        .where(and(eq(memories.userId, userId), inArray(memories.id, entityIds)));

      return results.map((r) => ({
        entityType: 'memory' as const,
        entityId: r.id,
        shortCode: shortCodeMap.get(r.id)!,
        title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
        status: null,
      }));
    }

    default:
      return [];
  }
}

/**
 * Resolve multiple mentions in batch
 */
export async function resolveMentions(
  mentions: ParsedMention[]
): Promise<ResolvedMention[]> {
  const user = await requireAuth();

  if (mentions.length === 0) return [];

  // Group mentions by entity type for efficient querying
  const mentionsByType = new Map<MentionEntityType, ParsedMention[]>();
  for (const mention of mentions) {
    const existing = mentionsByType.get(mention.entityType) || [];
    existing.push(mention);
    mentionsByType.set(mention.entityType, existing);
  }

  // Resolve each type's mentions
  const resolvedMap = new Map<string, ResolvedMention>();

  for (const [entityType, typeMentions] of mentionsByType) {
    const shortCodes = typeMentions.map((m) => m.shortCode);

    // Get short code records
    const shortCodeRecords = await db
      .select()
      .from(entityShortCodes)
      .where(
        and(
          eq(entityShortCodes.userId, user.id),
          eq(entityShortCodes.entityType, entityType),
          inArray(entityShortCodes.shortCode, shortCodes)
        )
      );

    // Create a map of short code to entity ID
    const shortCodeToEntityId = new Map(
      shortCodeRecords.map((r) => [r.shortCode, r.entityId])
    );

    // Get entity details
    const entityIds = shortCodeRecords.map((r) => r.entityId);
    const entityDetails = await getEntityDetailsById(user.id, entityType, entityIds);

    // Build resolved mentions
    for (const mention of typeMentions) {
      const entityId = shortCodeToEntityId.get(mention.shortCode);
      const key = `${mention.entityType}#${mention.shortCode}`;

      if (entityId && entityDetails.has(entityId)) {
        const details = entityDetails.get(entityId)!;
        resolvedMap.set(key, {
          ...mention,
          entityId,
          title: details.title,
          status: details.status,
          url: getEntityUrl(entityType, mention.shortCode),
          found: true,
        });
      } else {
        resolvedMap.set(key, {
          ...mention,
          entityId: null,
          title: null,
          status: null,
          url: null,
          found: false,
        });
      }
    }
  }

  // Return in original order
  return mentions.map((m) => {
    const key = `${m.entityType}#${m.shortCode}`;
    return resolvedMap.get(key)!;
  });
}

async function getEntityDetailsById(
  userId: string,
  entityType: MentionEntityType,
  entityIds: string[]
): Promise<Map<string, { title: string; status: string | null }>> {
  if (entityIds.length === 0) return new Map();

  const result = new Map<string, { title: string; status: string | null }>();

  switch (entityType) {
    case 'task': {
      const results = await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, entityIds)));

      for (const r of results) {
        result.set(r.id, { title: r.title, status: r.status });
      }
      break;
    }

    case 'project': {
      const results = await db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .where(and(eq(projects.userId, userId), inArray(projects.id, entityIds)));

      for (const r of results) {
        result.set(r.id, { title: r.name, status: r.status });
      }
      break;
    }

    case 'goal': {
      const results = await db
        .select({ id: goals.id, title: goals.title, status: goals.status })
        .from(goals)
        .where(and(eq(goals.userId, userId), inArray(goals.id, entityIds)));

      for (const r of results) {
        result.set(r.id, { title: r.title, status: r.status });
      }
      break;
    }

    case 'journal': {
      const results = await db
        .select({ id: journalEntries.id, content: journalEntries.content })
        .from(journalEntries)
        .where(and(eq(journalEntries.userId, userId), inArray(journalEntries.id, entityIds)));

      for (const r of results) {
        result.set(r.id, {
          title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
          status: null,
        });
      }
      break;
    }

    case 'memory': {
      const results = await db
        .select({ id: memories.id, content: memories.content })
        .from(memories)
        .where(and(eq(memories.userId, userId), inArray(memories.id, entityIds)));

      for (const r of results) {
        result.set(r.id, {
          title: r.content.slice(0, 50) + (r.content.length > 50 ? '...' : ''),
          status: null,
        });
      }
      break;
    }
  }

  return result;
}
