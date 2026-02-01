'use client';

import { useRouter } from 'next/navigation';
import { useAIChat } from './context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ActionConfirmation } from './action-confirmation';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AIChatDrawer() {
  const router = useRouter();
  const {
    isOpen,
    messages,
    pendingActions,
    isLoading,
    context,
    toggleChat,
    closeChat,
    sendMessage,
    confirmPendingAction,
    rejectPendingAction,
  } = useAIChat();

  const handleConfirm = async (actionId: string) => {
    await confirmPendingAction(actionId);
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
          'fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">AI Assistant</h2>
            {context && (
              <p className="text-xs text-muted-foreground">
                {context.type}: {context.entityId.slice(0, 8)}...
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={closeChat}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} isLoading={isLoading} />

        {/* Pending actions */}
        <ActionConfirmation
          actions={pendingActions}
          onConfirm={handleConfirm}
          onReject={rejectPendingAction}
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
