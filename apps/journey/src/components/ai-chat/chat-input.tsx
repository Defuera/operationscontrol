'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { detectPartialMention } from '@/lib/mentions/parser';
import { MentionAutocomplete } from '@/components/mentions/mention-autocomplete';
import type { MentionEntityType } from '@/types';
import type { MentionSearchResult } from '@/lib/mentions/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<{
    entityType: MentionEntityType;
    query: string;
    startIndex: number;
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      setAutocomplete(null);
    }
  };

  const checkForAutocomplete = useCallback(() => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const partial = detectPartialMention(message, cursorPos);

    if (partial) {
      // Calculate position for autocomplete dropdown
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();

      // Position above the input
      setAutocomplete({
        entityType: partial.entityType,
        query: partial.query,
        startIndex: partial.startIndex,
        position: {
          top: rect.top - 8 + window.scrollY, // Above the input with small gap
          left: rect.left,
        },
      });
    } else {
      setAutocomplete(null);
    }
  }, [message]);

  useEffect(() => {
    checkForAutocomplete();
  }, [message, checkForAutocomplete]);

  const handleSelectMention = (result: MentionSearchResult) => {
    if (!autocomplete || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const before = message.slice(0, autocomplete.startIndex);
    const after = message.slice(cursorPos);
    const mention = `${result.entityType}#${result.shortCode}`;

    const newMessage = before + mention + after;
    setMessage(newMessage);
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
    if (autocomplete && ['ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
      return;
    }

    // Let autocomplete handle Enter when open
    if (autocomplete && e.key === 'Enter') {
      return;
    }

    if (e.key === 'Escape' && autocomplete) {
      e.preventDefault();
      setAutocomplete(null);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex gap-2 p-3 border-t bg-white">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={checkForAutocomplete}
        placeholder="Ask about your tasks... (type task#, project#, goal#, or journal# for mentions)"
        disabled={disabled}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!message.trim() || disabled}
        size="icon"
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
      {autocomplete && (
        <MentionAutocomplete
          entityType={autocomplete.entityType}
          query={autocomplete.query}
          position={{
            ...autocomplete.position,
            top: autocomplete.position.top - 250, // Position above input
          }}
          onSelect={handleSelectMention}
          onClose={() => setAutocomplete(null)}
        />
      )}
    </div>
  );
}
