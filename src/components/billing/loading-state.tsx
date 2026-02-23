export function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-2 h-3 w-16 rounded bg-zinc-100" />
            <div className="h-8 w-32 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border border-zinc-200 bg-white py-12">
        <div className="h-8 w-full rounded bg-zinc-100" />
      </div>
    </div>
  );
}
