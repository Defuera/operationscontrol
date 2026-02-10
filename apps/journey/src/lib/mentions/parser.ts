import type { MentionEntityType } from '@/types';
import type { ParsedMention } from './types';

// Pattern: task#123, project#45, goal#7, journal#89
const MENTION_REGEX = /\b(task|project|goal|journal)#(\d+)\b/gi;

/**
 * Parse mentions from text and return an array of parsed mentions
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  let match;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const entityType = match[1].toLowerCase() as MentionEntityType;
    const shortCode = parseInt(match[2], 10);

    mentions.push({
      entityType,
      shortCode,
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Check if text contains any mentions
 */
export function hasMentions(text: string): boolean {
  MENTION_REGEX.lastIndex = 0;
  return MENTION_REGEX.test(text);
}

/**
 * Extract unique mentions from text (deduplicated by entityType + shortCode)
 */
export function getUniqueMentions(text: string): ParsedMention[] {
  const mentions = parseMentions(text);
  const seen = new Set<string>();
  const unique: ParsedMention[] = [];

  for (const mention of mentions) {
    const key = `${mention.entityType}#${mention.shortCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(mention);
    }
  }

  return unique;
}

export type AutocompleteMode = 'specific' | 'universal';

export interface PartialMention {
  mode: AutocompleteMode;
  entityType?: MentionEntityType; // Only set for 'specific' mode
  query: string;
  startIndex: number;
}

/**
 * Detect if user is currently typing a mention (for autocomplete)
 * Supports both specific mentions (task#, project#, etc.) and universal @ mentions
 */
export function detectPartialMention(
  text: string,
  cursorPosition: number
): PartialMention | null {
  const textBeforeCursor = text.slice(0, cursorPosition);

  // First check for specific entity type mentions: task#, project#, etc.
  const specificMatch = textBeforeCursor.match(/(task|project|goal|journal)#(\d*)$/i);
  if (specificMatch) {
    const entityType = specificMatch[1].toLowerCase() as MentionEntityType;
    const query = specificMatch[2];
    const startIndex = textBeforeCursor.length - specificMatch[0].length;

    return { mode: 'specific', entityType, query, startIndex };
  }

  // Check for universal @ mention
  // Match @ followed by word characters at end of text
  const universalMatch = textBeforeCursor.match(/@(\w*)$/);
  if (universalMatch) {
    const matchStart = textBeforeCursor.length - universalMatch[0].length;
    // Only trigger if @ is at start or after whitespace (not mid-word like email@)
    const isValidPosition = matchStart === 0 || /\s/.test(textBeforeCursor[matchStart - 1]);

    if (isValidPosition) {
      return {
        mode: 'universal' as const,
        query: universalMatch[1],
        startIndex: matchStart
      };
    }
  }

  return null;
}
