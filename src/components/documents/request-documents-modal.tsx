'use client';

import { useState } from 'react';
import { X, SpinnerGap, PaperPlaneTilt, Plus, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createDocumentRequest } from '@/lib/api/strategist.api';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface RequestDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId: string;
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

// ============================================================================
// COMMON DOCUMENT SUGGESTIONS
// ============================================================================

const DOCUMENT_SUGGESTIONS = [
  'W-2 Forms',
  '1099-NEC',
  '1099-INT',
  '1099-DIV',
  'Bank Statements (last 3 months)',
  'Previous Year Tax Return',
  'Business Expense Receipts',
  'Investment Statements',
];

// ============================================================================
// REQUEST DOCUMENTS MODAL COMPONENT
// ============================================================================

export function RequestDocumentsModal({
  isOpen,
  onClose,
  agreementId,
  clientId,
  clientName,
  onSuccess,
}: RequestDocumentsModalProps) {
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Handle close with animation
  const handleClose = () => {
    if (isLoading) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDocumentNames([]);
      setInputValue('');
    }, 200);
  };

  // Add document to list
  const handleAddDocument = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (documentNames.includes(trimmed)) {
      toast.error('This document is already in the list');
      return;
    }
    setDocumentNames(prev => [...prev, trimmed]);
    setInputValue('');
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocument();
    }
  };

  // Remove document from list
  const handleRemoveDocument = (index: number) => {
    setDocumentNames(prev => prev.filter((_, i) => i !== index));
  };

  // Add suggestion
  const handleAddSuggestion = (suggestion: string) => {
    if (documentNames.includes(suggestion)) {
      toast.error('This document is already in the list');
      return;
    }
    setDocumentNames(prev => [...prev, suggestion]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (documentNames.length === 0) {
      toast.error('Please add at least one document');
      return;
    }

    setIsLoading(true);
    
    console.log('[RequestDocsModal] Creating document request for agreement:', agreementId);

    try {
      const result = await createDocumentRequest({
        agreementId,
        clientId,
        documentNames,
      });

      if (result) {
        console.log('[RequestDocsModal] Created todos:', result.todos.map(t => ({ id: t.id, title: t.title })));
        toast.success(`Document request sent! ${result.todos.length} items requested.`);
        handleClose();
        onSuccess?.();
      } else {
        toast.error('Failed to create document request');
      }
    } catch (error) {
      console.error('Failed to send document request:', error);
      toast.error('Failed to send document request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out already added suggestions
  const availableSuggestions = DOCUMENT_SUGGESTIONS.filter(
    s => !documentNames.includes(s)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          !isClosing ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-all duration-200',
          !isClosing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Request Documents</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Request documents from {clientName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Input */}
          <div>
            <label htmlFor="document" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Document Name
            </label>
            <div className="flex gap-2">
              <input
                id="document"
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="Type document name and press Enter..."
                disabled={isLoading}
                autoFocus
              />
              <Button
                type="button"
                onClick={handleAddDocument}
                disabled={!inputValue.trim() || isLoading}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Plus weight="bold" className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          {availableSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Quick add
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.slice(0, 6).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddSuggestion(suggestion)}
                    disabled={isLoading}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document List */}
          {documentNames.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Documents to request ({documentNames.length})
              </p>
              <div className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                {documentNames.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-zinc-700">{name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      disabled={isLoading}
                      className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash weight="bold" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {documentNames.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-500">
                Add documents above to create your request list
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || documentNames.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <PaperPlaneTilt weight="fill" className="h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
