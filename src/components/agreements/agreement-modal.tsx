'use client';

import { useState } from 'react';
import { X, SpinnerGap, PaperPlaneTilt, Plus, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface TodoItem {
  title: string;
  description?: string;
}

export interface AgreementFormData {
  title: string;
  description: string;
  price: number;
  todos: TodoItem[];
}

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgreementFormData) => Promise<void>;
  clientName: string;
  isLoading?: boolean;
  error?: string | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_AGREEMENT: AgreementFormData = {
  title: 'Ariex Tax Advisory Service Agreement 2024',
  description:
    'Comprehensive tax advisory services including strategy development, filing support, and ongoing optimization.',
  price: 499,
  todos: [], // Custom todos - the signing todo is auto-generated
};

// ============================================================================
// AGREEMENT MODAL COMPONENT
// ============================================================================

export function AgreementModal({
  isOpen,
  onClose,
  onSubmit,
  clientName,
  isLoading = false,
  error = null,
}: AgreementModalProps) {
  const [formData, setFormData] = useState<AgreementFormData>(DEFAULT_AGREEMENT);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Handle close with animation
  const handleClose = () => {
    if (isLoading) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setFormData(DEFAULT_AGREEMENT);
      setNewTodoTitle('');
    }, 200);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Add a custom todo
  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) return;
    setFormData(prev => ({
      ...prev,
      todos: [...prev.todos, { title: newTodoTitle.trim() }],
    }));
    setNewTodoTitle('');
  };

  // Remove a todo
  const handleRemoveTodo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      todos: prev.todos.filter((_, i) => i !== index),
    }));
  };

  // Handle Enter key in todo input
  const handleTodoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  };

  if (!isOpen) return null;

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
            <h2 className="text-lg font-semibold text-soft-white">Send Agreement</h2>
            <p className="mt-0.5 text-sm text-steel-gray">
              Create a service agreement for {clientName}
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
          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-soft-white">
              Agreement Title
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
              placeholder="Enter agreement title"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-soft-white">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
              placeholder="Describe the services included..."
              disabled={isLoading}
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-soft-white">
              Service Fee
            </label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-steel-gray">
                $
              </span>
              <input
                id="price"
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full rounded-lg border border-white/10 bg-graphite py-2 pr-3 pl-7 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
                placeholder="499"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Todos Section */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-soft-white">
              Tasks for Client
            </label>

            {/* Auto-generated todo - always shown */}
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-electric-blue/10 px-3 py-2 text-sm text-electric-blue">
              <div className="h-2 w-2 rounded-full bg-electric-blue" />
              <span>Sign service agreement</span>
              <span className="ml-auto text-xs text-electric-blue/70">Auto-created</span>
            </div>

            {/* Custom todos list */}
            {formData.todos.length > 0 && (
              <div className="mb-2 space-y-2">
                {formData.todos.map((todo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"
                  >
                    <div className="h-2 w-2 rounded-full bg-steel-gray" />
                    <span className="flex-1 text-sm text-soft-white">{todo.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTodo(index)}
                      disabled={isLoading}
                      className="text-steel-gray hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new todo */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
                onKeyDown={handleTodoKeyDown}
                className="flex-1 rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
                placeholder="Add a task for the client..."
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleAddTodo}
                disabled={isLoading || !newTodoTitle.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-steel-gray transition-colors hover:bg-white/8 hover:text-soft-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title}
              className="bg-electric-blue text-soft-white hover:bg-electric-blue/80"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <PaperPlaneTilt weight="fill" className="h-4 w-4" />
                  Send Agreement
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
