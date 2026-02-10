'use client';

import { FileIcon, Check as CheckIcon } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import {
  formatRelativeTime,
  groupDocumentsByDate,
} from '@/contexts/strategist-contexts/client-management/utils/formatters';
import type { ApiDocument } from '@/lib/api/strategist.api';

interface DocumentsListProps {
  documents: ApiDocument[];
  isLoading: boolean;
  selectedDocs: Set<string>;
  viewingDocId: string | null;
  todoTitles: Map<string, string>;
  onToggleSelection: (docId: string) => void;
  onViewDocument: (docId: string) => void;
}

export function DocumentsList({
  documents,
  isLoading,
  selectedDocs,
  viewingDocId,
  todoTitles,
  onToggleSelection,
  onViewDocument,
}: DocumentsListProps) {
  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-zinc-900">Documents</h2>
          {!isLoading && documents.length > 0 && (
            <p className="text-sm text-zinc-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-12 pb-8 text-center">
          <EmptyDocumentsIllustration />
          <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
          <p className="text-sm text-zinc-400">
            When this client uploads a document, it will show up here
          </p>
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
                          <span className="font-medium text-zinc-900">{doc.name}</span>
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
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onViewDocument(doc.id);
                          }}
                          disabled={viewingDocId === doc.id}
                          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-50 disabled:opacity-100"
                        >
                          {viewingDocId === doc.id ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading...
                            </span>
                          ) : (
                            'See document'
                          )}
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
    </div>
  );
}
