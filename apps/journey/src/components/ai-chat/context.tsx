'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AIMessage } from '@/types';
import { confirmAction as confirmActionServer, rejectAction as rejectActionServer, getThreadByPath } from '@/actions/ai-chat';

interface AIChatState {
  isOpen: boolean;
  threadId: string | null;
  messages: AIMessage[];
  isLoading: boolean;
  path: string | null;
}

interface AIChatContextValue extends AIChatState {
  setContext: (path: string | null) => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => Promise<void>;
  clearMessages: () => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIChatState>({
    isOpen: false,
    threadId: null,
    messages: [],
    isLoading: false,
    path: null,
  });

  const loadingPathRef = useRef<string | null>(null);

  const setContext = useCallback((path: string | null) => {
    setState(prev => ({
      ...prev,
      path,
      // Clear thread when path changes - will be loaded by useEffect
      threadId: prev.path !== path ? null : prev.threadId,
      messages: prev.path !== path ? [] : prev.messages,
    }));
  }, []);

  // Load existing thread when path changes
  useEffect(() => {
    const loadExistingThread = async () => {
      if (!state.path) return;
      if (state.threadId) return; // Already have a thread loaded

      if (loadingPathRef.current === state.path) return; // Already loading this path
      loadingPathRef.current = state.path;

      try {
        const result = await getThreadByPath(state.path);
        if (result && loadingPathRef.current === state.path) {
          setState(prev => ({
            ...prev,
            threadId: result.thread.id,
            messages: result.messages,
          }));
        }
      } catch (error) {
        console.error('Failed to load thread:', error);
      } finally {
        if (loadingPathRef.current === state.path) {
          loadingPathRef.current = null;
        }
      }
    };

    loadExistingThread();
  }, [state.path, state.threadId]);

  const openChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const closeChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Add user message immediately
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        threadId: state.threadId || '',
        role: 'user',
        content: message,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: state.threadId,
          message,
          path: state.path,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      // Add assistant message
      const assistantMessage: AIMessage = {
        id: data.messageId,
        threadId: data.threadId,
        role: 'assistant',
        content: data.response,
        toolCalls: data.proposedActions ? JSON.stringify(data.proposedActions) : null,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        threadId: data.threadId,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Send message error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.threadId, state.path]);

  const confirmAction = useCallback(async (actionId: string) => {
    try {
      await confirmActionServer(actionId);
    } catch (error) {
      console.error('Confirm action error:', error);
    }
  }, []);

  const rejectAction = useCallback(async (actionId: string) => {
    try {
      await rejectActionServer(actionId);
    } catch (error) {
      console.error('Reject action error:', error);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      threadId: null,
    }));
  }, []);

  return (
    <AIChatContext.Provider
      value={{
        ...state,
        setContext,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
        confirmAction,
        rejectAction,
        clearMessages,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return { path: context.path, setContext: context.setContext };
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error('useAIChat must be used within AIContextProvider');
  }
  return ctx;
}
