'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { parseMentions, getUniqueMentions, hasMentions } from '@/lib/mentions/parser';
import { resolveMentions } from '@/actions/mentions';
import type { ParsedMention, ResolvedMention } from '@/lib/mentions/types';

interface UseMentionsResult {
  mentions: ResolvedMention[];
  loading: boolean;
  hasMentions: boolean;
}

export function useMentions(text: string): UseMentionsResult {
  const [resolvedMentions, setResolvedMentions] = useState<ResolvedMention[]>([]);
  const [loading, setLoading] = useState(false);

  // Parse mentions from text
  const parsedMentions = useMemo(() => getUniqueMentions(text), [text]);
  const textHasMentions = useMemo(() => hasMentions(text), [text]);

  // Resolve mentions when parsed mentions change
  useEffect(() => {
    if (parsedMentions.length === 0) {
      setResolvedMentions([]);
      return;
    }

    let cancelled = false;

    async function resolve() {
      setLoading(true);
      try {
        const resolved = await resolveMentions(parsedMentions);
        if (!cancelled) {
          setResolvedMentions(resolved);
        }
      } catch (error) {
        console.error('Error resolving mentions:', error);
        if (!cancelled) {
          setResolvedMentions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [parsedMentions]);

  return {
    mentions: resolvedMentions,
    loading,
    hasMentions: textHasMentions,
  };
}

/**
 * Hook to get all mentions for a piece of text with their positions
 * Useful for rendering text with inline mention components
 */
export function useMentionsWithPositions(text: string): {
  segments: Array<{ type: 'text'; content: string } | { type: 'mention'; mention: ResolvedMention }>;
  loading: boolean;
} {
  const { mentions, loading } = useMentions(text);

  const segments = useMemo(() => {
    if (mentions.length === 0) {
      return [{ type: 'text' as const, content: text }];
    }

    // Get all parsed mentions with positions
    const allMentions = parseMentions(text);

    // Create a map for quick lookup of resolved data
    const resolvedMap = new Map(
      mentions.map((m) => [`${m.entityType}#${m.shortCode}`, m])
    );

    const result: Array<{ type: 'text'; content: string } | { type: 'mention'; mention: ResolvedMention }> = [];
    let lastIndex = 0;

    for (const mention of allMentions) {
      // Add text before this mention
      if (mention.startIndex > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, mention.startIndex),
        });
      }

      // Add the mention
      const resolved = resolvedMap.get(`${mention.entityType}#${mention.shortCode}`);
      if (resolved) {
        result.push({ type: 'mention', mention: resolved });
      } else {
        // Fallback: create an unresolved mention
        result.push({
          type: 'mention',
          mention: {
            ...mention,
            entityId: null,
            title: null,
            status: null,
            url: null,
            found: false,
          },
        });
      }

      lastIndex = mention.endIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return result;
  }, [text, mentions]);

  return { segments, loading };
}
