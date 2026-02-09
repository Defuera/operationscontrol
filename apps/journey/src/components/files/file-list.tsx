'use client';

import { useState } from 'react';
import { Download, Trash2, FileIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileUrl, deleteFile } from '@/actions/files';
import type { FileAttachment } from '@/types';

interface FileListProps {
  files: FileAttachment[];
  onFileDeleted: (fileId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, onFileDeleted }: FileListProps) {
  const [loadingDownload, setLoadingDownload] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);

  const handleDownload = async (file: FileAttachment) => {
    setLoadingDownload(file.id);
    try {
      const url = await getFileUrl(file.id);
      if (url) {
        window.open(url, '_blank');
      }
    } finally {
      setLoadingDownload(null);
    }
  };

  const handleDelete = async (file: FileAttachment) => {
    setLoadingDelete(file.id);
    try {
      await deleteFile(file.id);
      onFileDeleted(file.id);
    } finally {
      setLoadingDelete(null);
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Attachments</p>
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{file.fileName}</span>
              <span className="text-gray-400 flex-shrink-0">
                ({formatFileSize(file.fileSize)})
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file)}
                disabled={loadingDownload === file.id}
              >
                {loadingDownload === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(file)}
                disabled={loadingDelete === file.id}
              >
                {loadingDelete === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-500" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
