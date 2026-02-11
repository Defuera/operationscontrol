'use client';

import { useEffect, useState } from 'react';
import { X, Brain, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMemories, deleteMemory } from '@/actions/memories';
import type { Memory } from '@/types';

interface MemoryListProps {
  path: string | null;
}

export function MemoryList({ path }: MemoryListProps) {
  const [pathMemories, setPathMemories] = useState<Memory[]>([]);
  const [globalMemories, setGlobalMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, [path]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      // Load path-specific memories
      if (path) {
        const pathMems = await getMemories(path);
        setPathMemories(pathMems);
      } else {
        setPathMemories([]);
      }
      // Load global memories
      const globalMems = await getMemories();
      setGlobalMemories(globalMems.filter(m => !m.anchorPath));
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, isGlobal: boolean) => {
    try {
      await deleteMemory(id);
      if (isGlobal) {
        setGlobalMemories(prev => prev.filter(m => m.id !== id));
      } else {
        setPathMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm">
        <span className="animate-pulse">Loading context...</span>
      </div>
    );
  }

  const hasMemories = pathMemories.length > 0 || globalMemories.length > 0;

  if (!hasMemories) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-1">No context yet</p>
        <p className="text-xs text-muted-foreground/70 max-w-[200px]">
          The AI will remember important details from your conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Path-specific memories */}
      {pathMemories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This page ({pathMemories.length})
            </span>
          </div>
          <div className="space-y-2">
            {pathMemories.map(memory => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                onDelete={() => handleDelete(memory.id, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Global memories */}
      {globalMemories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Global ({globalMemories.length})
            </span>
          </div>
          <div className="space-y-2">
            {globalMemories.map(memory => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                onDelete={() => handleDelete(memory.id, true)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MemoryItemProps {
  memory: Memory;
  onDelete: () => void;
}

function MemoryItem({ memory, onDelete }: MemoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tags = memory.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];

  return (
    <div
      className="relative bg-muted/50 rounded-lg p-3 pr-8 text-sm group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="text-foreground/90 whitespace-pre-wrap">{memory.content}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      {memory.shortCode && (
        <span className="text-xs text-muted-foreground mt-1 block">
          memory#{memory.shortCode}
        </span>
      )}
      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
