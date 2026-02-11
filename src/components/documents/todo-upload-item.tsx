'use client';

import { useState, useRef } from 'react';
import { Check, SpinnerGap, UploadSimple, Warning, FileArrowUp, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { uploadDocumentForTodo } from '@/lib/api/client.api';
import { toast } from 'sonner';
import { AcceptanceStatus } from '@/types/document';

// ============================================================================
// TYPES
// ============================================================================

interface TodoDocument {
  id: string;
  signedStatus?: string;
  uploadStatus?: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED' | string;
  acceptanceStatus?: AcceptanceStatus | string;
  files?: Array<{
    id: string;
    originalName: string;
    downloadUrl?: string;
  }>;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  document?: TodoDocument;
}

interface TodoUploadItemProps {
  todo: Todo;
  agreementId: string;
  strategistId: string;
  onUploadComplete?: () => void;
}

// ============================================================================
// TODO UPLOAD ITEM COMPONENT
// ============================================================================

export function TodoUploadItem({ todo, agreementId, strategistId, onUploadComplete }: TodoUploadItemProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine state
  const isCompleted = todo.status === 'completed' || todo.document?.uploadStatus === 'FILE_UPLOADED';
  const isRejected = todo.document?.acceptanceStatus === AcceptanceStatus.REJECTED_BY_STRATEGIST;
  const isAccepted = todo.document?.acceptanceStatus === AcceptanceStatus.ACCEPTED_BY_STRATEGIST;
  const uploadedFile = todo.document?.files?.[0];

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (isUploading) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // If document was rejected, use replace-file endpoint instead of creating new
      const result = await uploadDocumentForTodo({
        todoId: todo.id,
        agreementId,
        strategistId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        fileContent: base64,
        existingDocumentId: isRejected ? todo.document?.id : undefined,
      });

      if (result.success) {
        toast.success(`${file.name} uploaded successfully!`);
        onUploadComplete?.();
      } else {
        toast.error(result.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Render based on state
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-all',
        isRejected && 'border-red-200 bg-red-50',
        isAccepted && 'border-emerald-200 bg-emerald-50',
        isCompleted && !isRejected && !isAccepted && 'border-zinc-200 bg-zinc-50',
        !isCompleted && !isRejected && 'border-zinc-200 bg-white hover:border-zinc-300',
        dragActive && 'border-emerald-400 bg-emerald-50'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Status Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        {isUploading ? (
          <SpinnerGap className="h-5 w-5 animate-spin text-emerald-500" />
        ) : isRejected ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <X weight="bold" className="h-4 w-4 text-red-500" />
          </div>
        ) : isAccepted ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <Check weight="bold" className="h-4 w-4 text-emerald-600" />
          </div>
        ) : isCompleted ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <Check weight="bold" className="h-4 w-4 text-amber-600" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-zinc-300">
            <FileArrowUp className="h-4 w-4 text-zinc-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <span
          className={cn(
            'text-sm font-medium',
            isRejected && 'text-red-700',
            isAccepted && 'text-emerald-700',
            isCompleted && !isRejected && !isAccepted && 'text-zinc-600',
            !isCompleted && 'text-zinc-900'
          )}
        >
          {todo.title}
        </span>
        
        {/* Status text */}
        {isRejected && (
          <span className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
            <Warning weight="fill" className="h-3 w-3" />
            Declined - Please re-upload
          </span>
        )}
        {isAccepted && (
          <span className="text-xs text-emerald-600 mt-0.5">
            Accepted by strategist
          </span>
        )}
        {isCompleted && !isRejected && !isAccepted && uploadedFile && (
          <span className="text-xs text-zinc-500 truncate mt-0.5">
            {uploadedFile.originalName}
          </span>
        )}
        {isCompleted && !isRejected && !isAccepted && !uploadedFile && (
          <span className="text-xs text-amber-600 mt-0.5">
            Awaiting review
          </span>
        )}
      </div>

      {/* Action Button */}
      <div className="shrink-0">
        {isUploading ? (
          <span className="text-xs text-zinc-500">Uploading...</span>
        ) : isRejected || !isCompleted ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={handleInputChange}
              className="hidden"
            />
            <button
              onClick={handleClick}
              disabled={isUploading}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isRejected
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              )}
            >
              <UploadSimple weight="bold" className="h-3.5 w-3.5" />
              {isRejected ? 'Re-upload' : 'Upload'}
            </button>
          </>
        ) : isAccepted ? (
          <span className="text-xs font-medium text-emerald-600">✓ Accepted</span>
        ) : (
          <span className="text-xs font-medium text-amber-600">Pending review</span>
        )}
      </div>
    </div>
  );
}
