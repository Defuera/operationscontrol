'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Markdown } from './markdown';
import { Textarea } from './textarea';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { detectPartialMention } from '@/lib/mentions/parser';
import { MentionAutocomplete } from '@/components/mentions/mention-autocomplete';
import type { MentionEntityType } from '@/types';
import type { MentionSearchResult } from '@/lib/mentions/types';

interface EditableMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  enableMentions?: boolean;
}

export function EditableMarkdown({
  value,
  onChange,
  placeholder = 'Click to add a description...',
  className,
  enableMentions = true,
}: EditableMarkdownProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<{
    entityType: MentionEntityType;
    query: string;
    startIndex: number;
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    setAutocomplete(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setAutocomplete(null);
  };

  const checkForAutocomplete = useCallback(() => {
    if (!enableMentions || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const partial = detectPartialMention(editValue, cursorPos);

    if (partial) {
      // Calculate position for autocomplete dropdown
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();

      // Estimate cursor position (simplified)
      const lineHeight = 20;
      const charWidth = 8;
      const textBeforeCursor = editValue.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      setAutocomplete({
        entityType: partial.entityType,
        query: partial.query,
        startIndex: partial.startIndex,
        position: {
          top: rect.top + (lines.length * lineHeight) + lineHeight + window.scrollY,
          left: rect.left + Math.min(currentLine.length * charWidth, rect.width - 300),
        },
      });
    } else {
      setAutocomplete(null);
    }
  }, [editValue, enableMentions]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  useEffect(() => {
    checkForAutocomplete();
  }, [editValue, checkForAutocomplete]);

  const handleSelectMention = (result: MentionSearchResult) => {
    if (!autocomplete || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const before = editValue.slice(0, autocomplete.startIndex);
    const after = editValue.slice(cursorPos);
    const mention = `${result.entityType}#${result.shortCode}`;

    const newValue = before + mention + after;
    setEditValue(newValue);
    setAutocomplete(null);

    // Move cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = autocomplete.startIndex + mention.length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle these keys when autocomplete is open (it handles them)
    if (autocomplete && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
      return;
    }

    if (e.key === 'Escape') {
      if (autocomplete) {
        setAutocomplete(null);
      } else {
        handleCancel();
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className={cn('space-y-2 relative', className)}>
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={checkForAutocomplete}
          placeholder={placeholder}
          rows={6}
          className="resize-none"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <span className="text-xs text-gray-400 ml-2">
            ⌘+Enter to save, Esc to cancel
          </span>
        </div>
        {autocomplete && (
          <MentionAutocomplete
            entityType={autocomplete.entityType}
            query={autocomplete.query}
            position={autocomplete.position}
            onSelect={handleSelectMention}
            onClose={() => setAutocomplete(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-md transition-colors',
        'hover:bg-gray-50 p-2 -m-2',
        className
      )}
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
    >
      {value ? (
        <Markdown enableMentions={enableMentions}>{value}</Markdown>
      ) : (
        <p className="text-gray-400 italic">{placeholder}</p>
      )}
      <Pencil
        className="absolute top-2 right-2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}
