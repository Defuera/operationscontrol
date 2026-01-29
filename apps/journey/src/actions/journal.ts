'use server';

import { db } from '@/db';
import { journalEntries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { JournalEntry } from '@/types';

export async function createJournalEntry(content: string): Promise<JournalEntry> {
  const now = new Date().toISOString();
  const entry = await db.insert(journalEntries).values({
    id: crypto.randomUUID(),
    content,
    createdAt: now,
  }).returning();

  revalidatePath('/journal');
  return entry[0] as JournalEntry;
}

export async function updateJournalEntry(
  id: string,
  data: { content?: string; aiAnalysis?: string }
): Promise<void> {
  await db.update(journalEntries)
    .set(data)
    .where(eq(journalEntries.id, id));

  revalidatePath('/journal');
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await db.delete(journalEntries).where(eq(journalEntries.id, id));
  revalidatePath('/journal');
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const result = await db.select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.createdAt));
  return result as JournalEntry[];
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const result = await db.select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id));
  return result.length > 0 ? (result[0] as JournalEntry) : null;
}
