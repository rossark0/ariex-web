export function MiniDocumentIllustration() {
  return (
    <div className="relative h-12 w-10">
      {/* Main mini document */}
      <div className="absolute inset-0 rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="mt-2.5 space-y-1 px-1.5">
          <div className="h-1 w-full rounded-full bg-zinc-200" />
          <div className="h-1 w-2/3 rounded-full bg-zinc-200" />
          <div className="h-1 w-full rounded-full bg-zinc-200" />
          <div className="h-1 w-1/2 rounded-full bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}

export function MiniDocumentStack({ count = 1 }: { count?: number }) {
  return (
    <div className="relative h-14 w-12">
      {/* Back document (if more than 1) */}
      {count > 1 && (
        <div className="absolute top-0 left-1 h-10 w-8 rotate-3 rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="mt-2 space-y-0.5 px-1">
            <div className="h-0.5 w-full rounded-full bg-zinc-200" />
            <div className="h-0.5 w-2/3 rounded-full bg-zinc-200" />
            <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          </div>
        </div>
      )}
      {/* Front document */}
      <div className="absolute top-1 left-0 h-10 w-8 rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="mt-2 space-y-0.5 px-1">
          <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          <div className="h-0.5 w-2/3 rounded-full bg-zinc-200" />
          <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          <div className="h-0.5 w-1/2 rounded-full bg-zinc-200" />
        </div>
      </div>
      {/* Count badge */}
      {count > 1 && (
        <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
          {count}
        </div>
      )}
    </div>
  );
}

export function MiniPaymentStack({ count = 1 }: { count?: number }) {
  return (
    <div className="relative h-14 w-14">
      {/* Back receipt (if more than 1) */}
      {count > 1 && (
        <div className="absolute top-0 left-2 h-10 w-10 rotate-3 rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-0.5 w-6 rounded-full bg-zinc-200" />
            <div className="mt-1 h-2 w-4 rounded-sm bg-emerald-100" />
          </div>
        </div>
      )}
      {/* Front receipt */}
      <div className="absolute top-1 left-0 h-10 w-10 rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1">
          <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          <div className="h-0.5 w-2/3 rounded-full bg-zinc-200" />
          <div className="mt-1 flex w-full items-center justify-between px-0.5">
            <div className="h-0.5 w-3 rounded-full bg-zinc-300" />
            <div className="h-1.5 w-3 rounded-sm bg-emerald-500" />
          </div>
        </div>
      </div>
      {/* Count badge */}
      {count > 1 && (
        <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
          {count}
        </div>
      )}
    </div>
  );
}

export function MiniFileStack({ count = 1 }: { count?: number }) {
  return (
    <div className="relative h-14 w-12">
      {/* Back file (if more than 1) */}
      {count > 1 && (
        <div className="absolute top-0 left-1 h-10 w-8 rotate-3 rounded-md border border-zinc-200 bg-white shadow-sm">
          {/* Folded corner */}
          <div className="absolute top-0 right-0 h-2 w-2 rounded-bl-sm border-b border-l border-zinc-200 bg-zinc-50" />
          <div className="mt-3 space-y-0.5 px-1">
            <div className="h-0.5 w-full rounded-full bg-zinc-200" />
            <div className="h-0.5 w-2/3 rounded-full bg-zinc-200" />
          </div>
        </div>
      )}
      {/* Front file */}
      <div className="absolute top-1 left-0 h-10 w-8 rounded-md border border-zinc-200 bg-white shadow-sm">
        {/* Folded corner */}
        <div className="absolute top-0 right-0 h-2 w-2 rounded-bl-sm border-b border-l border-zinc-200 bg-zinc-50" />
        <div className="mt-3 space-y-0.5 px-1">
          <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          <div className="h-0.5 w-2/3 rounded-full bg-zinc-200" />
          <div className="h-0.5 w-full rounded-full bg-zinc-200" />
          <div className="h-0.5 w-1/2 rounded-full bg-zinc-200" />
        </div>
      </div>
      {/* Count badge */}
      {count > 1 && (
        <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
          {count}
        </div>
      )}
    </div>
  );
}
