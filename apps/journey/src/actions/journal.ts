'use server';

import { db } from '@/db';
import { journalEntries } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import type { JournalEntry } from '@/types';

export async function createJournalEntry(content: string): Promise<JournalEntry> {
  const user = await requireAuth();

  const entry = await db.insert(journalEntries).values({
    userId: user.id,
    content,
  }).returning();

  revalidatePath('/journal');
  return entry[0] as JournalEntry;
}

export async function updateJournalEntry(
  id: string,
  data: { content?: string; aiAnalysis?: string }
): Promise<void> {
  const user = await requireAuth();

  await db.update(journalEntries)
    .set(data)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)));

  revalidatePath('/journal');
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const user = await requireAuth();

  await db.delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)));
  revalidatePath('/journal');
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const user = await requireAuth();

  const result = await db.select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, user.id))
    .orderBy(desc(journalEntries.createdAt));
  return result as JournalEntry[];
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const user = await requireAuth();

  const result = await db.select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)));
  return result.length > 0 ? (result[0] as JournalEntry) : null;
}
