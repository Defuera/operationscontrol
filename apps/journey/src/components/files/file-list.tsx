'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, FileIcon, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileUrl, deleteFile } from '@/actions/files';
import type { FileAttachment } from '@/types';

interface FileListProps {
  files: FileAttachment[];
  onFileDeleted: (fileId: string) => void;
  collapsible?: boolean;
  showThumbnails?: boolean;
  layout?: 'list' | 'grid';
  addButton?: React.ReactNode;
  hideTitle?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function FileThumbnail({ file, size = 'sm' }: { file: FileAttachment; size?: 'sm' | 'lg' }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage(file.mimeType)) {
      getFileUrl(file.id).then(setUrl);
    }
  }, [file.id, file.mimeType]);

  const sizeClass = size === 'lg' ? 'h-24 w-24' : 'h-10 w-10';

  if (isImage(file.mimeType) && url) {
    return (
      <img
        src={url}
        alt={file.fileName}
        className={`${sizeClass} object-cover rounded flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClass} bg-gray-100 rounded flex items-center justify-center flex-shrink-0`}>
      <FileIcon className="h-6 w-6 text-gray-400" />
    </div>
  );
}

export function FileList({ files, onFileDeleted, collapsible = false, showThumbnails = false, layout = 'list', addButton, hideTitle = false }: FileListProps) {
  const [loadingDownload, setLoadingDownload] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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

  if (files.length === 0 && !addButton) {
    return null;
  }

  return (
    <div className="space-y-2">
      {!hideTitle && (
        collapsible ? (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            Attachments ({files.length})
          </button>
        ) : (
          <p className="text-sm text-gray-600">Attachments ({files.length})</p>
        )
      )}

      {!collapsed && layout === 'grid' && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative"
            >
              <FileThumbnail file={file} size="lg" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
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
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => handleDelete(file)}
                  disabled={loadingDelete === file.id}
                >
                  {loadingDelete === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
          {addButton}
        </div>
      )}

      {!collapsed && layout === 'list' && (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {showThumbnails ? (
                  <FileThumbnail file={file} size="sm" />
                ) : (
                  <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
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
      )}
    </div>
  );
}
