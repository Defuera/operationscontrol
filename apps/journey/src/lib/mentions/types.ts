import type { MentionEntityType } from '@/types';

export interface ParsedMention {
  entityType: MentionEntityType;
  shortCode: number;
  raw: string; // The original text, e.g., "task#123"
  startIndex: number;
  endIndex: number;
}

export interface ResolvedMention extends ParsedMention {
  entityId: string | null;
  title: string | null;
  status: string | null;
  url: string | null;
  found: boolean;
}

export interface MentionSearchResult {
  entityType: MentionEntityType;
  entityId: string;
  shortCode: number;
  title: string;
  status: string | null;
}
