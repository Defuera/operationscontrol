import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createFileRecord } from '@/actions/files';
import type { FileEntityType } from '@/types';

const BUCKET_NAME = 'attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as FileEntityType | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, entityType, entityId' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate unique storage path
    const fileExt = file.name.split('.').pop() || '';
    const uniqueId = crypto.randomUUID();
    const storagePath = `${user.id}/${entityType}/${entityId}/${uniqueId}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create database record
    const fileRecord = await createFileRecord({
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      entityType,
      entityId,
    });

    return NextResponse.json(fileRecord);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
