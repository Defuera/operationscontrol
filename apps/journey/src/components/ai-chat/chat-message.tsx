'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { getActionsByMessage } from '@/actions/ai-chat';
import type { AIMessage, AIAction } from '@/types';

interface ChatMessageProps {
  message: AIMessage;
  onConfirmAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
  showDebug?: boolean;
}

export function ChatMessage({ message, onConfirmAction, onRejectAction, showDebug = false }: ChatMessageProps) {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [debugExpanded, setDebugExpanded] = useState(false);

  const toggleExpanded = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const hasToolCalls = message.toolCalls && message.toolCalls !== '[]';

  useEffect(() => {
    if (hasToolCalls) {
      getActionsByMessage(message.id).then(setActions);
    }
  }, [message.id, hasToolCalls]);

  const handleConfirm = async (actionId: string) => {
    setLoadingActionId(actionId);
    await onConfirmAction(actionId);
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, status: 'confirmed' } : a
    ));
    setLoadingActionId(null);
  };

  const handleReject = async (actionId: string) => {
    setLoadingActionId(actionId);
    await onRejectAction(actionId);
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, status: 'rejected' } : a
    ));
    setLoadingActionId(null);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}
    >
      {/* Message content */}
      {message.content && (
        <div
          className={cn(
            'max-w-[80%] rounded-lg px-3 py-2 text-sm',
            'prose prose-sm prose-neutral dark:prose-invert max-w-none',
            'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
            'prose-pre:my-1 prose-code:text-xs prose-pre:bg-neutral-800 prose-pre:text-neutral-100 prose-pre:p-2',
            message.role === 'user'
              ? 'bg-primary text-primary-foreground prose-invert'
              : 'bg-muted'
          )}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}

      {/* Action cards */}
      {actions.map((action) => {
        const payload = JSON.parse(action.payload);
        const isCompleted = action.status === 'confirmed' || action.status === 'rejected';
        const isExpanded = expandedActions.has(action.id);

        return (
          <Card
            key={action.id}
            className={cn(
              'max-w-[90%] p-0',
              action.status === 'pending' && 'bg-amber-50 border-amber-200',
              action.status === 'confirmed' && 'bg-green-50 border-green-200',
              action.status === 'rejected' && 'bg-red-50 border-red-200'
            )}
          >
            {/* Header - always clickable to toggle details */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-black/5 rounded-lg px-2 py-1"
              onClick={() => toggleExpanded(action.id)}
            >
              {isExpanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              {action.status === 'confirmed' && <Check className="h-4 w-4 text-green-600 shrink-0" />}
              {action.status === 'rejected' && <X className="h-4 w-4 text-red-600 shrink-0" />}
              <p className="text-sm font-medium">
                {formatActionDescription(action)}
              </p>
            </div>

            {/* Collapsible details */}
            {isExpanded && (
              <div className="px-2 pb-2">
                <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Action buttons - always visible for pending */}
            {action.status === 'pending' && (
              <div className="flex gap-2 px-2 pb-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-100 border-green-300"
                  onClick={() => handleConfirm(action.id)}
                  disabled={loadingActionId === action.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 border-red-300"
                  onClick={() => handleReject(action.id)}
                  disabled={loadingActionId === action.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      {/* Debug section for assistant messages */}
      {showDebug && message.role === 'assistant' && hasToolCalls && (
        <div className="max-w-[90%]">
          <button
            onClick={() => setDebugExpanded(!debugExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bug className="h-3 w-3" />
            {debugExpanded ? 'Hide' : 'Show'} debug info
          </button>
          {debugExpanded && (
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono">
              <div className="text-muted-foreground mb-1">
                Tool calls • {message.promptTokens || 0} prompt + {message.completionTokens || 0} completion tokens
              </div>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(JSON.parse(message.toolCalls || '[]'), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatActionDescription(action: AIAction): string {
  const payload = JSON.parse(action.payload);
  const entityName = payload.title || payload.name || payload.description?.slice(0, 30) || action.entityId?.slice(0, 8);

  return `${capitalize(action.actionType)} ${action.entityType}: ${entityName}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
