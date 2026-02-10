'use client';

import { useState, useEffect } from 'react';
import { FileUploadDialog } from './file-upload-dialog';
import { FileList } from './file-list';
import { getFilesByEntity } from '@/actions/files';
import type { FileEntityType, FileAttachment } from '@/types';

interface FileAttachmentsProps {
  entityType: FileEntityType;
  entityId: string | null;
}

export function FileAttachments({ entityType, entityId }: FileAttachmentsProps) {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setFiles([]);
      return;
    }

    setLoading(true);
    getFilesByEntity(entityType, entityId)
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  if (!entityId) {
    return (
      <p className="text-sm text-gray-400">
        Save first to attach files
      </p>
    );
  }

  const handleUploadComplete = (file: FileAttachment) => {
    setFiles((prev) => [...prev, file]);
  };

  const handleFileDeleted = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading attachments...</p>;
  }

  return (
    <div className="space-y-3">
      <FileList files={files} onFileDeleted={handleFileDeleted} />
      <FileUploadDialog
        entityType={entityType}
        entityId={entityId}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
