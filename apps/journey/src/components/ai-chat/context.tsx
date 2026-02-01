'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AIContext, AIMessage } from '@/types';
import { confirmAction, rejectAction, getThreadByContext } from '@/actions/ai-chat';

interface ProposedAction {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface AIChatState {
  isOpen: boolean;
  threadId: string | null;
  messages: AIMessage[];
  pendingActions: ProposedAction[];
  isLoading: boolean;
  context: AIContext | null;
}

interface AIChatContextValue extends AIChatState {
  setContext: (context: AIContext | null) => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  confirmPendingAction: (actionId: string) => Promise<void>;
  rejectPendingAction: (actionId: string) => Promise<void>;
  clearMessages: () => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIChatState>({
    isOpen: false,
    threadId: null,
    messages: [],
    pendingActions: [],
    isLoading: false,
    context: null,
  });

  const loadingContextRef = useRef<string | null>(null);

  const setContext = useCallback((context: AIContext | null) => {
    setState(prev => ({
      ...prev,
      context,
      // Clear thread when context changes - will be loaded by useEffect
      threadId: prev.context?.entityId !== context?.entityId ? null : prev.threadId,
      messages: prev.context?.entityId !== context?.entityId ? [] : prev.messages,
    }));
  }, []);

  // Load existing thread when context changes
  useEffect(() => {
    const loadExistingThread = async () => {
      if (!state.context?.type || !state.context?.entityId) return;
      if (state.threadId) return; // Already have a thread loaded

      const contextKey = `${state.context.type}:${state.context.entityId}`;
      if (loadingContextRef.current === contextKey) return; // Already loading this context
      loadingContextRef.current = contextKey;

      try {
        const result = await getThreadByContext(state.context.type, state.context.entityId);
        if (result && loadingContextRef.current === contextKey) {
          setState(prev => ({
            ...prev,
            threadId: result.thread.id,
            messages: result.messages,
          }));
        }
      } catch (error) {
        console.error('Failed to load thread:', error);
      } finally {
        if (loadingContextRef.current === contextKey) {
          loadingContextRef.current = null;
        }
      }
    };

    loadExistingThread();
  }, [state.context?.type, state.context?.entityId, state.threadId]);

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
          context: state.context,
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
        pendingActions: data.proposedActions || [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Send message error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.threadId, state.context]);

  const confirmPendingAction = useCallback(async (actionId: string) => {
    try {
      const action = state.pendingActions.find(a => a.id === actionId);
      await confirmAction(actionId);

      // Add feedback message to chat
      const feedbackMessage: AIMessage = {
        id: crypto.randomUUID(),
        threadId: state.threadId || '',
        role: 'assistant',
        content: `✓ Action completed: ${action?.description || 'Unknown action'}`,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, feedbackMessage],
        pendingActions: prev.pendingActions.filter(a => a.id !== actionId),
      }));
    } catch (error) {
      console.error('Confirm action error:', error);
    }
  }, [state.pendingActions, state.threadId]);

  const rejectPendingAction = useCallback(async (actionId: string) => {
    try {
      const action = state.pendingActions.find(a => a.id === actionId);
      await rejectAction(actionId);

      // Add feedback message to chat
      const feedbackMessage: AIMessage = {
        id: crypto.randomUUID(),
        threadId: state.threadId || '',
        role: 'assistant',
        content: `✗ Action cancelled: ${action?.description || 'Unknown action'}`,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, feedbackMessage],
        pendingActions: prev.pendingActions.filter(a => a.id !== actionId),
      }));
    } catch (error) {
      console.error('Reject action error:', error);
    }
  }, [state.pendingActions, state.threadId]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      threadId: null,
      pendingActions: [],
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
        confirmPendingAction,
        rejectPendingAction,
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
  return { context: context.context, setContext: context.setContext };
}

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error('useAIChat must be used within AIContextProvider');
  }
  return ctx;
}
