'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAIChatState, type AIChatContextValue } from '@/hooks/useAIChatState';

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const value = useAIChatState();

  return (
    <AIChatContext.Provider value={value}>
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
