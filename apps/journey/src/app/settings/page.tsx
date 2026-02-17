'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getTokenUsageStats, type TokenUsageByModel, type UsageStats } from '@/actions/ai-chat';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { TelegramLink } from '@/components/telegram-link';

const AI_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Flagship reasoning & general AI model', inputPrice: 2.50, outputPrice: 10.00 },
  { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'More precise, hard thinker version', inputPrice: 5.00, outputPrice: 20.00 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Faster, cheaper variant', inputPrice: 0.50, outputPrice: 2.00 },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra-fast, low-cost small model', inputPrice: 0.10, outputPrice: 0.40 },
];

const STORAGE_KEY = 'journey-ai-model';
const PROMPT_STORAGE_KEY = 'journey-system-prompt';
const DEFAULT_MODEL = 'gpt-5.2';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function calculateCost(usage: TokenUsageByModel): number {
  const model = AI_MODELS.find(m => m.id === usage.model);
  if (!model) return 0;

  const inputCost = (usage.promptTokens / 1_000_000) * model.inputPrice;
  const outputCost = (usage.completionTokens / 1_000_000) * model.outputPrice;
  return inputCost + outputCost;
}

export default function SettingsPage() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptSaved, setPromptSaved] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({ userUsage: [], overallUsage: null, isAdmin: false });
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/welcome');
  };

  useEffect(() => {
    setMounted(true);
    const savedModel = localStorage.getItem(STORAGE_KEY);
    if (savedModel) {
      setModel(savedModel);
    }
    const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    }

    // Load usage stats
    getTokenUsageStats().then(setUsageStats);
  }, []);

  const handleModelChange = (value: string) => {
    setModel(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const handlePromptChange = (value: string) => {
    setSystemPrompt(value);
    setPromptSaved(false);
  };

  const savePrompt = () => {
    localStorage.setItem(PROMPT_STORAGE_KEY, systemPrompt);
    setPromptSaved(true);
  };

  const resetPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.removeItem(PROMPT_STORAGE_KEY);
    setPromptSaved(true);
  };

  if (!mounted) {
    return null;
  }

  const selectedModel = AI_MODELS.find(m => m.id === model);

  const { userUsage, overallUsage, isAdmin } = usageStats;
  const totalTokens = userUsage.reduce((sum, u) => sum + u.totalTokens, 0);
  const totalCost = userUsage.reduce((sum, u) => sum + calculateCost(u), 0);
  const overallTotalTokens = overallUsage?.reduce((sum, u) => sum + u.totalTokens, 0) ?? 0;
  const overallTotalCost = overallUsage?.reduce((sum, u) => sum + calculateCost(u), 0) ?? 0;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">AI Assistant</h2>

          <div className="space-y-2">
            <label htmlFor="model" className="text-sm font-medium">Model</label>
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-sm text-muted-foreground">
                {selectedModel.description}
              </p>
            )}
          </div>

          <div className="space-y-2 mt-6">
            <label htmlFor="prompt" className="text-sm font-medium">System Prompt</label>
            <Textarea
              id="prompt"
              value={systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={savePrompt}
                disabled={promptSaved}
              >
                {promptSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetPrompt}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Your Usage</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold">{formatNumber(totalTokens)}</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
            </div>
          </div>

          {userUsage.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">By Model</p>
              {userUsage.map((u) => {
                const modelInfo = AI_MODELS.find(m => m.id === u.model);
                const cost = calculateCost(u);
                return (
                  <div key={u.model} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{modelInfo?.name || u.model}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatNumber(u.promptTokens)} in / {formatNumber(u.completionTokens)} out
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{formatNumber(u.totalTokens)} tokens</p>
                      <p className="text-muted-foreground text-xs">${cost.toFixed(4)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No usage data yet.</p>
          )}
        </Card>

        {isAdmin && overallUsage && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Overall Platform Usage</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{formatNumber(overallTotalTokens)}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold">${overallTotalCost.toFixed(4)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">By Model</p>
              {overallUsage.map((u) => {
                const modelInfo = AI_MODELS.find(m => m.id === u.model);
                const cost = calculateCost(u);
                return (
                  <div key={u.model} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{modelInfo?.name || u.model}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatNumber(u.promptTokens)} in / {formatNumber(u.completionTokens)} out
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{formatNumber(u.totalTokens)} tokens</p>
                      <p className="text-muted-foreground text-xs">${cost.toFixed(4)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Telegram</h2>
          <TelegramLink />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <Button variant="destructive" onClick={handleLogout}>
            Log out
          </Button>
        </Card>
      </div>
    </main>
  );
}
