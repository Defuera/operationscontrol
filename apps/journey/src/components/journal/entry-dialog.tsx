'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileAttachments } from '@/components/files';
import type { JournalEntry, TaskDomain } from '@/types';
import type { AnalysisResponse } from '@/lib/ai/types';

interface EntryDialogProps {
  entry: JournalEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  onDelete?: () => void;
  onAnalyze?: () => Promise<AnalysisResponse>;
  onAddTask?: (task: { title: string; description: string; domain: TaskDomain; priority: number }) => void;
}

export function EntryDialog({
  entry,
  open,
  onClose,
  onSave,
  onDelete,
  onAnalyze,
  onAddTask,
}: EntryDialogProps) {
  const [content, setContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const handleOpen = () => {
    setContent(entry?.content || '');
    if (entry?.aiAnalysis) {
      try {
        setAnalysis(JSON.parse(entry.aiAnalysis));
      } catch {
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!onAnalyze) return;
    setAnalyzing(true);
    try {
      const result = await onAnalyze();
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setAnalyzing(false);
  };

  const handleAddTask = (task: AnalysisResponse['suggestedTasks'][0]) => {
    if (onAddTask) {
      onAddTask(task);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>
            {entry ? new Date(entry.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }) : 'New Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            className="resize-none"
          />

          {entry && onAnalyze && (
            <Button
              variant="outline"
              onClick={handleAnalyze}
              disabled={analyzing || !content.trim()}
            >
              {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          )}

          {analysis && (
            <Card className="p-4 bg-blue-50">
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-sm mb-2">{analysis.analysis.summary}</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {analysis.analysis.energyLevel && (
                  <Badge variant="outline">Energy: {analysis.analysis.energyLevel}</Badge>
                )}
                {analysis.analysis.emotionalState && (
                  <Badge variant="outline">{analysis.analysis.emotionalState}</Badge>
                )}
                {analysis.analysis.keyThemes.map(theme => (
                  <Badge key={theme} variant="secondary">{theme}</Badge>
                ))}
              </div>

              {analysis.suggestedTasks.length > 0 && (
                <>
                  <h4 className="font-medium text-sm mb-2">Suggested Tasks</h4>
                  <div className="space-y-2">
                    {analysis.suggestedTasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.domain}</p>
                        </div>
                        <Button size="sm" onClick={() => handleAddTask(task)}>Add</Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          <FileAttachments entityType="journal" entityId={entry?.id || null} />
        </div>

        <DialogFooter className="flex justify-between">
          {entry && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(content)} disabled={!content.trim()}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
