export function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-lg border border-white/10 bg-deep-navy p-4">
            <div className="mb-2 h-3 w-16 rounded bg-white/8" />
            <div className="h-8 w-32 rounded bg-white/8" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border border-white/10 bg-deep-navy py-12">
        <div className="h-8 w-full rounded bg-white/8" />
      </div>
    </div>
  );
}
