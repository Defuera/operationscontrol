'use server';

import { db } from '@/db';
import { files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { FileAttachment, FileEntityType } from '@/types';

const BUCKET_NAME = 'attachments';
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

export async function getFilesByEntity(
  entityType: FileEntityType,
  entityId: string
): Promise<FileAttachment[]> {
  const user = await requireAuth();

  const result = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.userId, user.id),
        eq(files.entityType, entityType),
        eq(files.entityId, entityId)
      )
    );

  return result as FileAttachment[];
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const user = await requireAuth();
  const supabase = await createClient();

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, user.id)));

  if (!file) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(file.storagePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

export async function deleteFile(fileId: string): Promise<void> {
  const user = await requireAuth();
  const supabase = await createClient();

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, user.id)));

  if (!file) return;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([file.storagePath]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
  }

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  revalidatePath('/');
}

export async function createFileRecord(data: {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  entityType: FileEntityType;
  entityId: string;
}): Promise<FileAttachment> {
  const user = await requireAuth();

  const [file] = await db
    .insert(files)
    .values({
      userId: user.id,
      storagePath: data.storagePath,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      entityType: data.entityType,
      entityId: data.entityId,
    })
    .returning();

  revalidatePath('/');
  return file as FileAttachment;
}
