'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { searchAllEntities, type GroupedSearchResults } from '@/actions/mentions';
import { getMentionColorClasses } from '@/lib/mentions/resolver';
import type { MentionSearchResult } from '@/lib/mentions/types';

interface UniversalAutocompleteProps {
  query: string;
  onSelect: (result: MentionSearchResult) => void;
  onClose: () => void;
}

type FlatResult = MentionSearchResult & { groupIndex: number };

export function UniversalAutocomplete({
  query,
  onSelect,
  onClose,
}: UniversalAutocompleteProps) {
  const [results, setResults] = useState<GroupedSearchResults>({
    tasks: [],
    projects: [],
    goals: [],
    memories: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten results for keyboard navigation
  const flatResults: FlatResult[] = [
    ...results.tasks.map((r, i) => ({ ...r, groupIndex: i })),
    ...results.projects.map((r, i) => ({ ...r, groupIndex: results.tasks.length + i })),
    ...results.goals.map((r, i) => ({ ...r, groupIndex: results.tasks.length + results.projects.length + i })),
    ...results.memories.map((r, i) => ({ ...r, groupIndex: results.tasks.length + results.projects.length + results.goals.length + i })),
  ];

  const totalResults = flatResults.length;
  const hasResults = totalResults > 0;

  // Fetch results when query changes
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      setLoading(true);
      try {
        const data = await searchAllEntities(query);
        if (!cancelled) {
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Error fetching mention results:', error);
        if (!cancelled) {
          setResults({ tasks: [], projects: [], goals: [], memories: [] });
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
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            onSelect(flatResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatResults, selectedIndex, totalResults, onSelect, onClose]
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

  const renderGroup = (
    title: string,
    items: MentionSearchResult[],
    startIndex: number
  ) => {
    if (items.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 sticky top-0">
          {title}
        </div>
        <ul>
          {items.map((result, index) => {
            const flatIndex = startIndex + index;
            const colors = getMentionColorClasses(result.entityType);

            return (
              <li
                key={`${result.entityType}-${result.shortCode}`}
                className={cn(
                  'px-3 py-2 cursor-pointer flex items-center gap-2',
                  flatIndex === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                )}
                onClick={() => onSelect(result)}
                onMouseEnter={() => setSelectedIndex(flatIndex)}
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
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-auto min-w-[300px] bottom-full mb-2 left-0"
    >
      {loading ? (
        <div className="p-3 text-sm text-gray-500">Searching...</div>
      ) : !hasResults ? (
        <div className="p-3 text-sm text-gray-500">
          {query ? 'No results found' : 'Type to search tasks, projects, goals, and memories'}
        </div>
      ) : (
        <div>
          {renderGroup('Tasks', results.tasks, 0)}
          {renderGroup('Projects', results.projects, results.tasks.length)}
          {renderGroup('Goals', results.goals, results.tasks.length + results.projects.length)}
          {renderGroup('Memories', results.memories, results.tasks.length + results.projects.length + results.goals.length)}
        </div>
      )}
    </div>
  );
}
