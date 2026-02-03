'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface ProposedAction {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ActionConfirmationProps {
  actions: ProposedAction[];
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
}

export function ActionConfirmation({ actions, onConfirm, onReject }: ActionConfirmationProps) {
  if (actions.length === 0) return null;

  return (
    <div className="p-3 border-t bg-amber-50 space-y-2">
      <p className="text-xs font-medium text-amber-800">Pending Actions</p>
      {actions.map((action) => (
        <Card key={action.id} className="p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{action.description}</p>
              <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                {JSON.stringify(action.args, null, 2)}
              </pre>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => onConfirm(action.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => onReject(action.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
