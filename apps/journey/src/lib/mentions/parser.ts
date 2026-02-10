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

/**
 * Detect if user is currently typing a mention (for autocomplete)
 * Returns the partial mention info if found, null otherwise
 */
export function detectPartialMention(
  text: string,
  cursorPosition: number
): { entityType: MentionEntityType; query: string; startIndex: number } | null {
  // Look backwards from cursor to find a potential mention start
  const textBeforeCursor = text.slice(0, cursorPosition);

  // Pattern: entityType# followed by optional digits at the end of text
  const partialMatch = textBeforeCursor.match(/(task|project|goal|journal)#(\d*)$/i);

  if (partialMatch) {
    const entityType = partialMatch[1].toLowerCase() as MentionEntityType;
    const query = partialMatch[2]; // May be empty string
    const startIndex = textBeforeCursor.length - partialMatch[0].length;

    return { entityType, query, startIndex };
  }

  return null;
}
