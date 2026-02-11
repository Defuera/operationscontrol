'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAIChat } from './context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { MemoryList } from './memory-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Archive, Brain, ChevronDown, MessageCircle, Pencil, Plus, X } from 'lucide-react';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [threadSelectorOpen, setThreadSelectorOpen] = useState(false);
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
    renameThread,
  } = useAIChat();

  const currentThread = threads.find(t => t.id === threadId);

  const startEditing = () => {
    setEditTitle(currentThread?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (threadId) {
      await renameThread(threadId, editTitle);
    }
    setIsEditingTitle(false);
  };

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
            <div className="flex items-center gap-1">
              {/* Thread name - inline editable */}
              {isEditingTitle ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="h-7 text-xs w-48"
                  autoFocus
                  placeholder="Thread name..."
                />
              ) : (
                <span className="text-sm font-medium truncate max-w-48">
                  {currentThread?.title || (currentThread ? formatThreadDate(currentThread.createdAt) : 'New conversation')}
                </span>
              )}

              {/* Edit button - only when thread exists and not editing */}
              {threadId && !isEditingTitle && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={startEditing}
                  title="Rename conversation"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* Thread selector popover */}
              <Popover open={threadSelectorOpen} onOpenChange={setThreadSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Switch conversation">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1">
                    {threads.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No conversations yet</p>
                    ) : (
                      threads.map((thread) => (
                        <Button
                          key={thread.id}
                          variant={thread.id === threadId ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-xs h-8"
                          onClick={() => {
                            switchThread(thread.id);
                            setThreadSelectorOpen(false);
                          }}
                        >
                          <span className="truncate flex-1 text-left">
                            {thread.title || formatThreadDate(thread.createdAt)}
                          </span>
                          <span className="ml-2 text-muted-foreground shrink-0">({thread.messageCount})</span>
                        </Button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Spacer to push new/archive to the right */}
              <div className="flex-1" />

              {/* New conversation button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={createNewThread}
                title="New conversation"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              {/* Archive button */}
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
