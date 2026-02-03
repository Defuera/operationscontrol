'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAIChat } from './context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle, X, Plus, PanelLeftClose, PanelLeft, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatThreadDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return format(date, 'h:mm a');
  }
  return format(date, 'MMM d, h:mm a');
}

export function AIChatDrawer() {
  const [isWide, setIsWide] = useState(false);
  const router = useRouter();
  const {
    isOpen,
    messages,
    isLoading,
    path,
    threadId,
    threads,
    toggleChat,
    closeChat,
    sendMessage,
    confirmAction,
    rejectAction,
    switchThread,
    createNewThread,
    archiveCurrentThread,
  } = useAIChat();

  const handleConfirm = async (actionId: string) => {
    await confirmAction(actionId);
    router.refresh();
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={toggleChat}
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
          isOpen && 'hidden'
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 bg-white shadow-xl z-50 flex flex-col transition-all duration-300 ease-in-out',
          isWide ? 'w-full md:w-1/2' : 'w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex flex-col border-b">
          <div className="flex items-center justify-between p-4 pb-2">
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              {path && (
                <p className="text-xs text-muted-foreground">
                  {path}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsWide(!isWide)}
                title={isWide ? 'Narrow view' : 'Wide view'}
              >
                {isWide ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={closeChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Thread switcher */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <Select
              value={threadId || ''}
              onValueChange={(value) => switchThread(value)}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="New conversation" />
              </SelectTrigger>
              <SelectContent>
                {threads.map((thread) => (
                  <SelectItem key={thread.id} value={thread.id} className="text-xs">
                    {thread.title || formatThreadDate(thread.createdAt)}
                    <span className="text-muted-foreground ml-2">
                      ({thread.messageCount})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={createNewThread}
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {threadId && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={archiveCurrentThread}
                title="Archive conversation"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onConfirmAction={handleConfirm}
          onRejectAction={rejectAction}
        />

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={closeChat}
        />
      )}
    </>
  );
}
