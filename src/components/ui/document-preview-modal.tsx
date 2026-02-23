'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowSquareOut, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function isPreviewableAsImage(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

function isPreviewableAsPdf(ext: string): boolean {
  return ext === 'pdf';
}

// ============================================================================
// DOCUMENT PREVIEW MODAL
// ============================================================================

export function DocumentPreviewModal({
  isOpen,
  onClose,
  url,
  fileName,
  isLoading = false,
}: DocumentPreviewModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ext = getFileExtension(fileName);
  const isImage = isPreviewableAsImage(ext);
  const isPdf = isPreviewableAsPdf(ext);
  const canPreview = (isImage || isPdf) && !!url;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-200',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <h3 className="truncate text-sm font-semibold text-zinc-900">{fileName}</h3>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              >
                <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                Open
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-50 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <SpinnerGap className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-zinc-500">Loading document…</p>
            </div>
          ) : !url ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <p className="text-sm font-medium text-zinc-600">Unable to load document</p>
              <p className="text-xs text-zinc-400">The download URL could not be retrieved.</p>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <p className="text-sm font-medium text-zinc-600">
                Preview not available for .{ext} files
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Download file
              </a>
            </div>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={fileName}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-md"
            />
          ) : (
            <iframe
              src={url}
              title={fileName}
              className="h-[75vh] w-full rounded-lg border border-zinc-200 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
