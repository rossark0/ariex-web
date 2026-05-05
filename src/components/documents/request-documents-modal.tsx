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
          'relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-deep-navy p-6 shadow-2xl transition-all duration-200',
          !isClosing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-soft-white">Request Documents</h2>
            <p className="mt-0.5 text-sm text-steel-gray">
              Request documents from {clientName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-gray duration-150 ease-linear transition-colors hover:bg-white/8 hover:text-soft-white disabled:opacity-50"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Input */}
          <div>
            <label htmlFor="document" className="mb-1.5 block text-sm font-medium text-soft-white">
              Document Name
            </label>
            <div className="flex gap-2">
              <input
                id="document"
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
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
              <p className="mb-2 text-xs font-medium text-steel-gray uppercase tracking-wide">
                Quick add
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.slice(0, 6).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddSuggestion(suggestion)}
                    disabled={isLoading}
                    className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-xs text-steel-gray duration-150 ease-linear transition-colors hover:border-electric-blue/30 hover:bg-electric-blue/10 hover:text-electric-blue disabled:opacity-50"
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
              <p className="mb-2 text-xs font-medium text-steel-gray uppercase tracking-wide">
                Documents to request ({documentNames.length})
              </p>
              <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/4 p-2">
                {documentNames.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md bg-deep-navy px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-electric-blue" />
                      <span className="text-sm text-soft-white">{name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      disabled={isLoading}
                      className="flex h-6 w-6 items-center justify-center rounded text-steel-gray duration-150 ease-linear transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
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
            <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-6 text-center">
              <p className="text-sm text-steel-gray">
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
