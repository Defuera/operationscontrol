'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { searchEntitiesForMention } from '@/actions/mentions';
import { getMentionColorClasses } from '@/lib/mentions/resolver';
import type { MentionEntityType } from '@/types';
import type { MentionSearchResult } from '@/lib/mentions/types';

interface MentionAutocompleteProps {
  entityType: MentionEntityType;
  query: string;
  position: { top: number; left: number };
  onSelect: (result: MentionSearchResult) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  entityType,
  query,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [results, setResults] = useState<MentionSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch results when query changes
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      setLoading(true);
      try {
        const data = await searchEntitiesForMention(entityType, query);
        if (!cancelled) {
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Error fetching mention results:', error);
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [entityType, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const colors = getMentionColorClasses(entityType);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto min-w-[280px]"
      style={{ top: position.top, left: position.left }}
    >
      {loading ? (
        <div className="p-3 text-sm text-gray-500">Searching...</div>
      ) : results.length === 0 ? (
        <div className="p-3 text-sm text-gray-500">No results found</div>
      ) : (
        <ul className="py-1">
          {results.map((result, index) => (
            <li
              key={`${result.entityType}-${result.shortCode}`}
              className={cn(
                'px-3 py-2 cursor-pointer flex items-center gap-2',
                index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
              onClick={() => onSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                  colors.badge,
                  colors.text
                )}
              >
                #{result.shortCode}
              </span>
              <span className="text-sm text-gray-900 truncate flex-1">
                {result.title}
              </span>
              {result.status && (
                <span className="text-xs text-gray-500 capitalize shrink-0">
                  {result.status.replace('_', ' ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
