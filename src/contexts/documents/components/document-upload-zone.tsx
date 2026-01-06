'use client';

import { useCallback } from 'react';
import { useDocument } from '../DocumentStore';

export function DocumentUploadZone() {
  const setIsUploading = useDocument(state => state.setIsUploading);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    // TODO: Implement upload logic
    console.log('Files dropped:', files);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className="hover:border-primary rounded-lg border-2 border-dashed p-12 text-center transition-colors"
    >
      <p className="text-lg font-medium">Drop documents here to upload</p>
      <p className="text-muted-foreground mt-2 text-sm">or click to browse</p>
    </div>
  );
}
