'use client';

import { useDocument } from '../DocumentStore';

export function DocumentList() {
  const documents = useDocument(state => state.documents);

  if (documents.length === 0) {
    return <div className="text-muted-foreground py-12 text-center">No documents uploaded yet</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {documents.map(doc => (
        <div key={doc.id} className="hover:bg-accent rounded-lg border p-4 transition-colors">
          <h3 className="font-medium">{doc.originalName}</h3>
          <p className="text-muted-foreground text-sm">{doc.category}</p>
        </div>
      ))}
    </div>
  );
}
