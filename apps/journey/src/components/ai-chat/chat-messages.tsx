'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';
import type { AIMessage } from '@/types';

interface ChatMessagesProps {
  messages: AIMessage[];
  isLoading?: boolean;
  onConfirmAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
}

export function ChatMessages({
  messages,
  isLoading,
  onConfirmAction,
  onRejectAction,
  onEditMessage,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm">
        <p>Ask me about your tasks, projects, or goals.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onConfirmAction={onConfirmAction}
          onRejectAction={onRejectAction}
          onEditMessage={onEditMessage}
          isLoading={isLoading}
        />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-3 py-2 text-sm">
            <span className="animate-pulse">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
