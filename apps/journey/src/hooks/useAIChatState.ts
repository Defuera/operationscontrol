'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AIMessage } from '@/types';
import {
  confirmAction as confirmActionServer,
  rejectAction as rejectActionServer,
  getThreadsByPath,
  getThreadById,
  createThread as createThreadServer,
  archiveThread as archiveThreadServer,
  updateThreadTitle as updateThreadTitleServer,
  type ThreadSummary,
} from '@/actions/ai-chat';

export interface AIChatState {
  isOpen: boolean;
  threadId: string | null;
  threads: ThreadSummary[];
  messages: AIMessage[];
  isLoading: boolean;
  path: string | null;
}

export interface AIChatActions {
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
  archiveCurrentThread: () => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
}

export type AIChatContextValue = AIChatState & AIChatActions;

export function useAIChatState(): AIChatContextValue {
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
      threadId: prev.path !== path ? null : prev.threadId,
      threads: prev.path !== path ? [] : prev.threads,
      messages: prev.path !== path ? [] : prev.messages,
    }));
  }, []);

  // Load threads list and last viewed thread when path changes
  useEffect(() => {
    const loadThreads = async () => {
      if (!state.path) return;
      if (state.threadId) return;

      if (loadingPathRef.current === state.path) return;
      loadingPathRef.current = state.path;

      try {
        const threads = await getThreadsByPath(state.path);
        if (loadingPathRef.current !== state.path) return;

        if (threads.length > 0) {
          const lastViewedKey = `ai-chat-last-thread:${state.path}`;
          const lastViewedThreadId = localStorage.getItem(lastViewedKey);

          const threadToLoad = lastViewedThreadId && threads.some(t => t.id === lastViewedThreadId)
            ? lastViewedThreadId
            : threads[0].id;

          const result = await getThreadById(threadToLoad);
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
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        threadId: state.threadId || '',
        role: 'user',
        content: message,
        toolCalls: null,
        model: null,
        promptTokens: null,
        completionTokens: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      const model = localStorage.getItem('journey-ai-model') || 'gpt-5.2';
      const systemPrompt = localStorage.getItem('journey-system-prompt') || undefined;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: state.threadId,
          message,
          path: state.path,
          model,
          systemPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      const assistantMessage: AIMessage = {
        id: data.messageId,
        threadId: data.threadId,
        role: 'assistant',
        content: data.response,
        toolCalls: data.proposedActions ? JSON.stringify(data.proposedActions) : null,
        model: data.model || null,
        promptTokens: data.promptTokens || null,
        completionTokens: data.completionTokens || null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      const isNewThread = !state.threadId;
      if (isNewThread && state.path) {
        localStorage.setItem(`ai-chat-last-thread:${state.path}`, data.threadId);
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
        if (state.path) {
          localStorage.setItem(`ai-chat-last-thread:${state.path}`, threadId);
        }
        setState(prev => ({
          ...prev,
          threadId: result.thread.id,
          messages: result.messages,
        }));
      }
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  }, [state.path]);

  const createNewThread = useCallback(async () => {
    if (!state.path) return;

    try {
      const thread = await createThreadServer(state.path);
      localStorage.setItem(`ai-chat-last-thread:${state.path}`, thread.id);
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

  const archiveCurrentThread = useCallback(async () => {
    if (!state.threadId) return;

    try {
      await archiveThreadServer(state.threadId);
      setState(prev => {
        const remainingThreads = prev.threads.filter(t => t.id !== state.threadId);
        const nextThread = remainingThreads[0];
        return {
          ...prev,
          threads: remainingThreads,
          threadId: nextThread?.id || null,
          messages: [],
        };
      });
      if (state.threads.length > 1) {
        const nextThread = state.threads.find(t => t.id !== state.threadId);
        if (nextThread) {
          const result = await getThreadById(nextThread.id);
          if (result) {
            setState(prev => ({
              ...prev,
              threadId: result.thread.id,
              messages: result.messages,
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to archive thread:', error);
    }
  }, [state.threadId, state.threads]);

  const renameThread = useCallback(async (threadId: string, title: string) => {
    try {
      await updateThreadTitleServer(threadId, title);
      setState(prev => ({
        ...prev,
        threads: prev.threads.map(t =>
          t.id === threadId ? { ...t, title: title.trim() || null } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to rename thread:', error);
    }
  }, []);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Find the message being edited and truncate messages at that point
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      // Optimistically update: keep messages before the edit point, add new user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        threadId: state.threadId || '',
        role: 'user',
        content: newContent,
        toolCalls: null,
        model: null,
        promptTokens: null,
        completionTokens: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(0, messageIndex), userMessage],
      }));

      const model = localStorage.getItem('journey-ai-model') || 'gpt-5.2';
      const systemPrompt = localStorage.getItem('journey-system-prompt') || undefined;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: state.threadId,
          message: newContent,
          path: state.path,
          model,
          systemPrompt,
          editMessageId: messageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Edit request failed');
      }

      const assistantMessage: AIMessage = {
        id: data.messageId,
        threadId: data.threadId,
        role: 'assistant',
        content: data.response,
        toolCalls: data.proposedActions ? JSON.stringify(data.proposedActions) : null,
        model: data.model || null,
        promptTokens: data.promptTokens || null,
        completionTokens: data.completionTokens || null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Edit message error:', error);
      // Reload thread messages on error to restore correct state
      if (state.threadId) {
        const result = await getThreadById(state.threadId);
        if (result) {
          setState(prev => ({
            ...prev,
            messages: result.messages,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [state.threadId, state.path, state.messages]);

  return {
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
    archiveCurrentThread,
    editMessage,
    renameThread,
  };
}
