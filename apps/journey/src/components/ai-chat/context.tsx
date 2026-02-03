'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AIMessage } from '@/types';
import {
  confirmAction as confirmActionServer,
  rejectAction as rejectActionServer,
  getThreadsByPath,
  getThreadById,
  createThread as createThreadServer,
  type ThreadSummary,
} from '@/actions/ai-chat';

interface AIChatState {
  isOpen: boolean;
  threadId: string | null;
  threads: ThreadSummary[];
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
  switchThread: (threadId: string) => Promise<void>;
  createNewThread: () => Promise<void>;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIChatState>({
    isOpen: false,
    threadId: null,
    threads: [],
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
      threads: prev.path !== path ? [] : prev.threads,
      messages: prev.path !== path ? [] : prev.messages,
    }));
  }, []);

  // Load threads list and most recent thread when path changes
  useEffect(() => {
    const loadThreads = async () => {
      if (!state.path) return;
      if (state.threadId) return; // Already have a thread loaded

      if (loadingPathRef.current === state.path) return;
      loadingPathRef.current = state.path;

      try {
        const threads = await getThreadsByPath(state.path);
        if (loadingPathRef.current !== state.path) return;

        if (threads.length > 0) {
          // Load the most recent thread's messages
          const result = await getThreadById(threads[0].id);
          if (result && loadingPathRef.current === state.path) {
            setState(prev => ({
              ...prev,
              threads,
              threadId: result.thread.id,
              messages: result.messages,
            }));
          }
        } else {
          setState(prev => ({ ...prev, threads: [] }));
        }
      } catch (error) {
        console.error('Failed to load threads:', error);
      } finally {
        if (loadingPathRef.current === state.path) {
          loadingPathRef.current = null;
        }
      }
    };

    loadThreads();
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

      // If this was a new thread, refresh the threads list
      const isNewThread = !state.threadId;
      if (isNewThread && state.path) {
        const threads = await getThreadsByPath(state.path);
        setState(prev => ({
          ...prev,
          threads,
          threadId: data.threadId,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          threadId: data.threadId,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
        }));
      }
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

  const switchThread = useCallback(async (threadId: string) => {
    try {
      const result = await getThreadById(threadId);
      if (result) {
        setState(prev => ({
          ...prev,
          threadId: result.thread.id,
          messages: result.messages,
        }));
      }
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  }, []);

  const createNewThread = useCallback(async () => {
    if (!state.path) return;

    try {
      const thread = await createThreadServer(state.path);
      // Add to threads list and switch to it
      setState(prev => ({
        ...prev,
        threads: [{ id: thread.id, title: null, messageCount: 0, createdAt: thread.createdAt, updatedAt: thread.updatedAt }, ...prev.threads],
        threadId: thread.id,
        messages: [],
      }));
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  }, [state.path]);

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
        switchThread,
        createNewThread,
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
