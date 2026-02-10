import type { MentionEntityType } from '@/types';
import type { ParsedMention, ResolvedMention } from './types';

/**
 * Generate URL for an entity
 */
export function getEntityUrl(entityType: MentionEntityType, entityId: string): string {
  switch (entityType) {
    case 'task':
      return `/tasks/${entityId}`;
    case 'project':
      return `/projects/${entityId}`;
    case 'goal':
      return `/goals/${entityId}`;
    case 'journal':
      return `/journal/${entityId}`;
    default:
      return '/';
  }
}

/**
 * Convert parsed mentions to resolved mentions with entity data
 * This is a client-side helper that takes already-resolved data from the server
 */
export function createResolvedMention(
  mention: ParsedMention,
  entityData: {
    entityId: string;
    title: string;
    status: string | null;
  } | null
): ResolvedMention {
  if (entityData) {
    return {
      ...mention,
      entityId: entityData.entityId,
      title: entityData.title,
      status: entityData.status,
      url: getEntityUrl(mention.entityType, entityData.entityId),
      found: true,
    };
  }

  return {
    ...mention,
    entityId: null,
    title: null,
    status: null,
    url: null,
    found: false,
  };
}

/**
 * Get display color classes for entity type
 */
export function getMentionColorClasses(entityType: MentionEntityType): {
  badge: string;
  text: string;
} {
  switch (entityType) {
    case 'task':
      return { badge: 'bg-blue-100', text: 'text-blue-700' };
    case 'project':
      return { badge: 'bg-purple-100', text: 'text-purple-700' };
    case 'goal':
      return { badge: 'bg-green-100', text: 'text-green-700' };
    case 'journal':
      return { badge: 'bg-amber-100', text: 'text-amber-700' };
    default:
      return { badge: 'bg-gray-100', text: 'text-gray-700' };
  }
}

/**
 * Get not found styling
 */
export function getNotFoundClasses(): { badge: string; text: string } {
  return { badge: 'bg-red-100', text: 'text-red-700 line-through' };
}
