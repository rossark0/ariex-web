import { Loader2 } from 'lucide-react';

/**
 * Loading state component for client management pages
 */
export function LoadingState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}
