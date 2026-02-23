'use client';

import { memo, useState } from 'react';
import {
  FileIcon,
  Check as CheckIcon,
  FileArrowUp,
  Clock,
  X as XIcon,
  SpinnerGapIcon,
  Eye,
  Seal as SealIcon,
} from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal';
import {
  formatRelativeTime,
  groupDocumentsByDate,
} from '@/contexts/strategist-contexts/client-management/utils/formatters';
import type { ApiDocument } from '@/lib/api/strategist.api';
import { getDownloadUrl } from '@/lib/api/strategist.api';
import { AcceptanceStatus } from '@/types/document';

interface DocumentTodo {
  id: string;
  title: string;
  status: string;
  document?: {
    id?: string;
    uploadStatus?: string;
    acceptanceStatus?: string;
  };
}

interface DocumentsListProps {
  documents: ApiDocument[];
  isLoading: boolean;
  selectedDocs: Set<string>;
  viewingDocId: string | null;
  todoTitles: Map<string, string>;
  documentTodos?: DocumentTodo[];
  signedDocumentUrl?: string | null;
  contractDocumentId?: string | null;
  onToggleSelection: (docId: string) => void;
  onViewDocument: (docId: string) => void;
  onRequestDocuments?: () => void;
}

export const DocumentsList = memo(function DocumentsList({
  documents,
  isLoading,
  selectedDocs,
  viewingDocId,
  todoTitles,
  documentTodos = [],
  signedDocumentUrl,
  contractDocumentId,
  onToggleSelection,
  onViewDocument,
  onRequestDocuments,
}: DocumentsListProps) {
  // Preview state
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string | null;
    loading: boolean;
  } | null>(null);

  const handlePreview = async (doc: ApiDocument) => {
    setPreviewDoc({ name: doc.name || 'Document', url: null, loading: true });
    try {
      const url = await getDownloadUrl(doc.id);
      setPreviewDoc(prev => (prev ? { ...prev, url: url || null, loading: false } : null));
    } catch {
      setPreviewDoc(prev => (prev ? { ...prev, loading: false } : null));
    }
  };

  // Separate pending requests from completed uploads
  const pendingTodos = documentTodos.filter(
    todo => todo.status !== 'completed' && todo.document?.uploadStatus !== 'FILE_UPLOADED'
  );
  const hasContent = documents.length > 0 || pendingTodos.length > 0;
  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-zinc-900">Documents</h2>
          {!isLoading && hasContent && (
            <p className="text-sm text-zinc-500">
              {documents.length} uploaded
              {pendingTodos.length > 0 ? ` · ${pendingTodos.length} pending` : ''}
            </p>
          )}
        </div>
        {onRequestDocuments && (
          <button
            onClick={onRequestDocuments}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Request documents
          </button>
        )}
      </div>

      {isLoading && (
        <div className="mb-6">
          <div className="flex items-center justify-center py-12">
            <SpinnerGapIcon className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        </div>
      )}

      {!isLoading && !hasContent && (
        <div className="flex flex-col items-center justify-center pt-12 pb-8 text-center">
          <EmptyDocumentsIllustration />
          <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
          <p className="text-sm text-zinc-400">
            When this client uploads a document, it will show up here
          </p>
        </div>
      )}

      {/* Pending document requests */}
      {!isLoading && pendingTodos.length > 0 && (
        <div className="mt-4 mb-2">
          <p className="mb-3 text-sm font-medium text-amber-600">
            Awaiting upload · {pendingTodos.length} request{pendingTodos.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-2">
            {pendingTodos.map(todo => {
              const isRejected =
                todo.document?.acceptanceStatus === AcceptanceStatus.REJECTED_BY_STRATEGIST;
              return (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    isRejected
                      ? 'border-red-200 bg-red-50'
                      : 'border-dashed border-zinc-200 bg-zinc-50'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    {isRejected ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                        <XIcon weight="bold" className="h-4 w-4 text-red-500" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-zinc-300">
                        <FileArrowUp className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span
                      className={`text-sm font-medium ${isRejected ? 'text-red-700' : 'text-zinc-700'}`}
                    >
                      {todo.title}
                    </span>
                    <span className={`text-xs ${isRejected ? 'text-red-500' : 'text-zinc-400'}`}>
                      {isRejected
                        ? 'Declined — waiting for client to re-upload'
                        : 'Waiting for client to upload'}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      isRejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {isRejected ? 'Re-upload needed' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="mt-6">
          {groupDocumentsByDate(
            [...documents].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          ).map(group => (
            <div key={group.label} className="mb-6">
              <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
              <div className="flex flex-col">
                {group.documents.map(doc => {
                  const isSelected = selectedDocs.has(doc.id);
                  const isContractDoc = contractDocumentId && doc.id === contractDocumentId;
                  return (
                    <div key={doc.id} className="group relative">
                      <div
                        className={`pointer-events-none absolute top-1/2 -left-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isSelected ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-teal-600">
                            <CheckIcon weight="bold" className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white transition-colors group-hover:border-teal-400" />
                        )}
                      </div>
                      <div
                        onClick={() => onToggleSelection(doc.id)}
                        className={`flex cursor-pointer items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50 ${
                          isSelected ? 'bg-zinc-50' : ''
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                          <FileIcon className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="flex flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900">{doc.name}</span>
                            {isContractDoc && signedDocumentUrl && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                                Signed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-500">
                              {doc.todoId && todoTitles.get(doc.todoId)
                                ? todoTitles.get(doc.todoId)
                                : doc.type || 'Document'}
                            </span>
                            {doc.uploadedByName && (
                              <>
                                <span className="text-zinc-300">·</span>
                                <span className="text-sm text-zinc-500">
                                  Uploaded by {doc.uploadedByName}
                                </span>
                              </>
                            )}
                          </div>
                          {doc.description && (
                            <p className="mt-0.5 line-clamp-1 text-sm text-zinc-400">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        {isContractDoc && signedDocumentUrl && (
                          <a
                            href={signedDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                            title="View signed copy"
                          >
                            <SealIcon weight="fill" className="h-3.5 w-3.5" />
                            View signed copy
                          </a>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handlePreview(doc);
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-50 hover:text-zinc-700"
                          title="Preview document"
                        >
                          <Eye weight="bold" className="h-4 w-4" />
                        </button>
                        <span className="shrink-0 text-sm text-zinc-400">
                          {formatRelativeTime(new Date(doc.createdAt))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        url={previewDoc?.url || null}
        fileName={previewDoc?.name || ''}
        isLoading={previewDoc?.loading}
      />
    </div>
  );
})
