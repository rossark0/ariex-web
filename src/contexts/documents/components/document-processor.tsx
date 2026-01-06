// DISABLED: This example component uses Poling utility that doesn't exist yet
// TODO: Implement Poling utility

interface DocumentProcessorProps {
  documentId: string;
}

export function DocumentProcessorExample({ documentId }: DocumentProcessorProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-6">
      <h3 className="text-lg font-semibold">Document Processor</h3>
      <p className="text-muted-foreground">This component is temporarily disabled.</p>
      <p className="text-muted-foreground text-sm">Document ID: {documentId}</p>
    </div>
  );
}
