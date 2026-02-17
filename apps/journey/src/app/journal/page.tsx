'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EntryCard, EntryDialog } from '@/components/journal';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '@/actions/journal';
import { createTask, getTasks } from '@/actions/tasks';
import type { JournalEntry, Task, TaskDomain } from '@/types';
import type { AnalysisResponse } from '@/lib/ai/types';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [entriesData, tasksData] = await Promise.all([
      getJournalEntries(),
      getTasks(),
    ]);
    setEntries(entriesData);
    setTasks(tasksData);
  };

  useRealtimeSync(['journal_entries', 'tasks'], loadData);

  const handleSave = async (content: string) => {
    if (editingEntry) {
      await updateJournalEntry(editingEntry.id, { content });
      setEntries(prev =>
        prev.map(e => (e.id === editingEntry.id ? { ...e, content } : e))
      );
    } else {
      const newEntry = await createJournalEntry(content);
      setEntries(prev => [newEntry, ...prev]);
    }
    setDialogOpen(false);
    setEditingEntry(null);
  };

  const handleDelete = async () => {
    if (editingEntry) {
      await deleteJournalEntry(editingEntry.id);
      setEntries(prev => prev.filter(e => e.id !== editingEntry.id));
      setDialogOpen(false);
      setEditingEntry(null);
    }
  };

  const handleAnalyze = async (): Promise<AnalysisResponse> => {
    if (!editingEntry) throw new Error('No entry selected');

    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editingEntry.content,
        tasks: tasks.slice(0, 20),
      }),
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    const analysis = await response.json();

    // Save analysis to entry
    await updateJournalEntry(editingEntry.id, { aiAnalysis: JSON.stringify(analysis) });
    setEntries(prev =>
      prev.map(e =>
        e.id === editingEntry.id ? { ...e, aiAnalysis: JSON.stringify(analysis) } : e
      )
    );

    return analysis;
  };

  const handleAddTask = async (task: {
    title: string;
    description: string;
    domain: TaskDomain;
    priority: number;
  }) => {
    const newTask = await createTask(task);
    setTasks(prev => [...prev, newTask]);
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleEntryClick = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Journal</h1>
        <Button onClick={handleNewEntry}>+ New Entry</Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No journal entries yet. Start writing!</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={() => handleEntryClick(entry)}
            />
          ))}
        </div>
      )}

      <EntryDialog
        entry={editingEntry}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        onDelete={editingEntry ? handleDelete : undefined}
        onAnalyze={editingEntry ? handleAnalyze : undefined}
        onAddTask={handleAddTask}
      />
    </main>
  );
}
