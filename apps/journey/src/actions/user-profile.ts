'use server';

import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function getLastSeenChangelogVersion(): Promise<string | null> {
  const user = await requireAuth();

  const result = await db.select({ lastSeenChangelogVersion: userProfiles.lastSeenChangelogVersion })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id));

  if (result.length === 0) {
    return null;
  }

  return result[0].lastSeenChangelogVersion;
}

export async function updateLastSeenChangelog(version: string): Promise<void> {
  const user = await requireAuth();

  // Upsert: update if exists, insert if not
  await db.insert(userProfiles)
    .values({
      userId: user.id,
      lastSeenChangelogVersion: version,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        lastSeenChangelogVersion: version,
        updatedAt: new Date().toISOString(),
      },
    });
}
