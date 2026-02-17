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

export async function getFileContents(fileId: string): Promise<{
  content: string;
  mimeType: string;
  fileName: string;
  isBase64: boolean;
} | null> {
  const user = await requireAuth();
  const supabase = await createClient();

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, user.id)));

  if (!file) return null;

  // Download the file from Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(file.storagePath);

  if (error || !data) {
    console.error('Error downloading file:', error);
    return null;
  }

  const mimeType = file.mimeType;
  const isImage = mimeType.startsWith('image/');
  const isText = mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/xml';

  if (isImage) {
    // Return base64 encoded image
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      content: base64,
      mimeType,
      fileName: file.fileName,
      isBase64: true,
    };
  } else if (isText) {
    // Return text content directly
    const text = await data.text();
    return {
      content: text,
      mimeType,
      fileName: file.fileName,
      isBase64: false,
    };
  } else {
    // For other binary files, return base64
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      content: base64,
      mimeType,
      fileName: file.fileName,
      isBase64: true,
    };
  }
}

export async function updateFileMetadata(
  fileId: string,
  updates: {
    fileName?: string;
    entityType?: FileEntityType;
    entityId?: string;
  }
): Promise<FileAttachment | null> {
  const user = await requireAuth();

  const [existing] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, user.id)));

  if (!existing) return null;

  const [updated] = await db
    .update(files)
    .set(updates)
    .where(and(eq(files.id, fileId), eq(files.userId, user.id)))
    .returning();

  revalidatePath('/');
  return updated as FileAttachment;
}

// Internal version for AI tool executor (accepts userId directly)
export async function getFileContentsInternal(
  fileId: string,
  userId: string
): Promise<{
  content: string;
  mimeType: string;
  fileName: string;
  isBase64: boolean;
} | null> {
  const supabase = await createClient();

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));

  if (!file) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(file.storagePath);

  if (error || !data) {
    console.error('Error downloading file:', error);
    return null;
  }

  const mimeType = file.mimeType;
  const isImage = mimeType.startsWith('image/');
  const isText = mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/xml';

  if (isImage) {
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      content: base64,
      mimeType,
      fileName: file.fileName,
      isBase64: true,
    };
  } else if (isText) {
    const text = await data.text();
    return {
      content: text,
      mimeType,
      fileName: file.fileName,
      isBase64: false,
    };
  } else {
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      content: base64,
      mimeType,
      fileName: file.fileName,
      isBase64: true,
    };
  }
}
