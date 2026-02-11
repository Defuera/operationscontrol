'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAIChat } from './context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { MemoryList } from './memory-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle, X, Plus, Archive, Brain } from 'lucide-react';
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

type TabValue = 'chat' | 'context';

export function AIChatDrawer() {
  const [activeTab, setActiveTab] = useState<TabValue>('chat');
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
    editMessage,
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
          'fixed inset-y-0 right-0 bg-white shadow-xl z-50 flex flex-col transition-all duration-300 ease-in-out w-full md:w-1/2',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex flex-col border-b px-3 py-2 gap-2">
          {/* Row 1: Tabs + close button */}
          <div className="flex items-center">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList variant="line" className="h-8 gap-0">
                <TabsTrigger value="chat" className="px-3 text-xs gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="context" className="px-3 text-xs gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  Context
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={closeChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 2: Thread switcher - only on Chat tab */}
          {activeTab === 'chat' && (
            <div className="flex items-center gap-2">
              <Select
                value={threadId || ''}
                onValueChange={(value) => switchThread(value)}
              >
                <SelectTrigger className="flex-1 h-7 text-xs min-w-0">
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
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={createNewThread}
                title="New conversation"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              {threadId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={archiveCurrentThread}
                  title="Archive conversation"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'chat' ? (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onConfirmAction={handleConfirm}
            onRejectAction={rejectAction}
            onEditMessage={editMessage}
          />
        ) : (
          <MemoryList path={path} />
        )}

        {/* Input - only on Chat tab */}
        {activeTab === 'chat' && (
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        )}
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
