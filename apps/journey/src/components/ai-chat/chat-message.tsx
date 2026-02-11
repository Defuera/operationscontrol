'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { getActionsByMessage } from '@/actions/ai-chat';
import type { AIMessage, AIAction } from '@/types';

interface ChatMessageProps {
  message: AIMessage;
  onConfirmAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string) => Promise<void>;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  isLoading?: boolean;
}

export function ChatMessage({ message, onConfirmAction, onRejectAction, onEditMessage, isLoading }: ChatMessageProps) {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);

  const canEdit = message.role === 'user' && onEditMessage && !isLoading;

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

  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onEditMessage || editContent.trim() === '' || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    await onEditMessage(message.id, editContent.trim());
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Message content */}
      {message.content && !isEditing && (
        <div className="relative group max-w-[80%]">
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
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
          {canEdit && isHovered && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-8 top-1/2 -translate-y-1/2 h-6 w-6 opacity-60 hover:opacity-100"
              onClick={handleStartEdit}
              title="Edit message"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="max-w-[80%] w-full flex flex-col gap-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={editContent.trim() === '' || editContent === message.content}
            >
              Save & Regenerate
            </Button>
          </div>
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
