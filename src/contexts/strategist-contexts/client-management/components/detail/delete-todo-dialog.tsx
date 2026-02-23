'use client';

import { memo } from 'react';
import { SpinnerGap } from '@phosphor-icons/react';

interface DeleteTodoDialogProps {
  todo: { id: string; title: string };
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteTodoDialog = memo(function DeleteTodoDialog({ todo, isDeleting, onConfirm, onCancel }: DeleteTodoDialogProps) {
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        onClick={() => !isDeleting && onCancel()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">Delete Document Request</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Are you sure you want to delete the request for <strong>&quot;{todo.title}&quot;</strong>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
