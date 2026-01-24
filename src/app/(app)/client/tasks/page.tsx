'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import {
  getClientAgreements,
  type ClientAgreement,
} from '@/lib/api/client.api';
import {
  SpinnerGap,
  Check,
  Circle,
  FileArrowUp,
  PenNib,
  FileText,
} from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';

// ============================================================================
// Types
// ============================================================================

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  type: 'sign' | 'upload' | 'general';
  agreementId: string;
  agreementName: string;
  ceremonyUrl?: string;
  document?: {
    id: string;
    uploadStatus: string;
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClientTasksPage() {
  useRoleRedirect('CLIENT');
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load todos from agreements
  useEffect(() => {
    async function loadTodos() {
      setIsLoading(true);
      try {
        const agreements = await getClientAgreements();

        // Extract todos from all agreements
        const allTodos: TodoItem[] = [];

        for (const agreement of agreements) {
          if (agreement.todoLists) {
            for (const todoList of agreement.todoLists) {
              for (const todo of todoList.todos || []) {
                const isSigningTodo = todo.title.toLowerCase().includes('sign');

                allTodos.push({
                  id: todo.id,
                  title: todo.title,
                  description: todo.description,
                  status: todo.status,
                  type: isSigningTodo ? 'sign' : todo.document ? 'upload' : 'general',
                  agreementId: agreement.id,
                  agreementName: agreement.title || agreement.name || 'Agreement',
                  ceremonyUrl: isSigningTodo ? agreement.signatureCeremonyUrl : undefined,
                  document: todo.document,
                });
              }
            }
          }
        }

        setTodos(allTodos);
      } catch (error) {
        console.error('Failed to load todos:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadTodos();
    }
  }, [user]);

  // Group todos by status
  const pendingTodos = todos.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTodos = todos.filter(t => t.status === 'completed');

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-zinc-900">Tasks</h2>
          <p className="text-sm text-zinc-500">
            {pendingTodos.length > 0
              ? `${pendingTodos.length} task${pendingTodos.length !== 1 ? 's' : ''} to complete`
              : 'All tasks completed'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <SpinnerGap className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="mt-4 text-sm text-zinc-500">Loading tasks...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && todos.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No tasks yet</p>
            <p className="text-sm text-zinc-400">
              Tasks will appear here when your strategist assigns them
            </p>
          </div>
        )}

        {/* Pending Todos */}
        {!isLoading && pendingTodos.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 text-sm font-semibold text-zinc-700">To Do</h3>
            <div className="flex flex-col gap-3">
              {pendingTodos.map(todo => (
                <TodoCard key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Todos */}
        {!isLoading && completedTodos.length > 0 && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-zinc-500">Completed</h3>
            <div className="flex flex-col gap-3">
              {completedTodos.map(todo => (
                <TodoCard key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Todo Card Component
// ============================================================================

function TodoCard({ todo }: { todo: TodoItem }) {
  const isCompleted = todo.status === 'completed';

  const handleAction = () => {
    if (todo.type === 'sign' && todo.ceremonyUrl) {
      window.open(todo.ceremonyUrl, '_blank');
    } else if (todo.type === 'upload') {
      // TODO: Open upload dialog
      alert('Upload feature coming soon');
    }
  };

  const getIcon = () => {
    if (isCompleted) {
      return <Check className="h-5 w-5 text-emerald-500" weight="bold" />;
    }
    switch (todo.type) {
      case 'sign':
        return <PenNib className="h-5 w-5 text-amber-500" weight="fill" />;
      case 'upload':
        return <FileArrowUp className="h-5 w-5 text-blue-500" weight="fill" />;
      default:
        return <Circle className="h-5 w-5 text-zinc-300" />;
    }
  };

  const getActionButton = () => {
    if (isCompleted) return null;

    if (todo.type === 'sign') {
      return (
        <button
          onClick={handleAction}
          disabled={!todo.ceremonyUrl}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            todo.ceremonyUrl
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          <PenNib className="h-4 w-4" />
          Sign
        </button>
      );
    }

    if (todo.type === 'upload') {
      return (
        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          <FileArrowUp className="h-4 w-4" />
          Upload
        </button>
      );
    }

    return null;
  };

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
        isCompleted
          ? 'border-zinc-100 bg-zinc-50'
          : 'border-zinc-200 bg-white shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex flex-col">
          <span
            className={`font-medium ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}
          >
            {todo.title}
          </span>
          {todo.description && (
            <span className="mt-0.5 text-sm text-zinc-500">{todo.description}</span>
          )}
          <span className="mt-1 text-xs text-zinc-400">From: {todo.agreementName}</span>
        </div>
      </div>

      {getActionButton()}
    </div>
  );
}
