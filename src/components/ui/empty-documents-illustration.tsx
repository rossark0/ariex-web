export function EmptyDocumentsIllustration() {
  return (
    <div className="relative mb-8 h-24 w-32">
      {/* Main document */}
      <div className="absolute top-2 left-4 h-24 w-20 rounded-lg border border-zinc-200 bg-white shadow-md">
        <div className="mt-5 space-y-2 px-3">
          <div className="h-2 w-full rounded-full bg-zinc-200" />
          <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
          <div className="h-2 w-full rounded-full bg-zinc-200" />
          <div className="h-2 w-1/2 rounded-full bg-zinc-200" />
        </div>
        {/* Small watermark */}
        <div className="absolute right-2 bottom-2 text-xs font-medium text-zinc-300">
          ariex
        </div>
      </div>
      {/* Tilted document on top */}
      <div className="absolute top-0 right-2 h-20 w-16 rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="mt-4 space-y-1.5 px-2.5">
          <div className="h-1.5 w-full rounded-full bg-zinc-200" />
          <div className="h-1.5 w-2/3 rounded-full bg-zinc-200" />
          <div className="h-1.5 w-full rounded-full bg-zinc-200" />
          <div className="h-1.5 w-1/2 rounded-full bg-zinc-200" />
        </div>
        {/* Small watermark */}
        <div className="absolute right-2 bottom-1 text-xs font-medium text-zinc-300">
          ariex
        </div>
      </div>
    </div>
  );
}
