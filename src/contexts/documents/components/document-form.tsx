'use client';

import { useState } from 'react';
// import { serverLoadingMiddleware } from '@/utils/services/server-loading-middleware';
import { createDocument, updateDocument } from '../services/documents.service';

interface DocumentFormProps {
  documentId?: string;
  initialData?: {
    title: string;
    content: string;
  };
  onSuccess?: () => void;
}

/**
 * Example component showing how to use serverLoadingMiddleware
 * with form submission and server actions
 */
export function DocumentFormExample({ documentId, initialData, onSuccess }: DocumentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Re-enable when service is implemented
      // const result = documentId
      //   ? await updateDocument(documentId, formData)
      //   : await createDocument(formData);
      //
      // onSuccess?.();
      // // Reset form if creating new document
      // if (!documentId) {
      //   setFormData({ title: '', content: '' });
      // }

      console.warn('Document service not implemented yet');
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Título
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="Digite o título do documento"
          disabled={loading}
          className="rounded-md border px-3 py-2"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className="text-sm font-medium">
          Conteúdo
        </label>
        <textarea
          id="content"
          value={formData.content}
          onChange={e => setFormData({ ...formData, content: e.target.value })}
          placeholder="Digite o conteúdo do documento"
          disabled={loading}
          className="min-h-[200px] rounded-md border px-3 py-2"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-50"
      >
        {loading ? 'Salvando...' : documentId ? 'Atualizar' : 'Criar Documento'}
      </button>
    </form>
  );
}
