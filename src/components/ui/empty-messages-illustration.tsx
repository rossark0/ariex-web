export function EmptyMessagesIllustration() {
  return (
    <div className="relative mb-8 h-24 w-32">
      {/* Main message bubble - chat interface */}
      <div className="absolute top-2 left-4 h-24 w-20 rounded-lg border border-zinc-200 bg-white shadow-md">
        <div className="mt-2 space-y-1.5 px-2">
          {/* Chat bubble 1 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-12 rounded-full rounded-bl-none bg-zinc-200" />
          </div>
          {/* Chat bubble 2 - right aligned */}
          <div className="flex justify-end">
            <div className="h-1.5 w-10 rounded-full rounded-br-none bg-zinc-400" />
          </div>
          {/* Chat bubble 3 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-14 rounded-full rounded-bl-none bg-zinc-200" />
          </div>

          {/* Chat bubble 3 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-14 rounded-full rounded-bl-none bg-zinc-200" />
          </div>
          {/* Chat bubble 3 - left aligned */}
          <div className="flex justify-end">
            <div className="h-1.5 w-14 rounded-full rounded-bl-none bg-zinc-400" />
          </div>
        </div>
        {/* Small watermark */}
        <div className="absolute right-2 bottom-2 text-xs font-medium text-zinc-300">ariex</div>
      </div>
      {/* Tilted message bubble on top */}
      <div className="absolute top-0 right-2 h-20 w-16 rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="mt-2 space-y-1 px-2">
          {/* Chat bubble 1 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-8 rounded-full rounded-bl-none bg-zinc-200" />
          </div>
          {/* Chat bubble 2 - right aligned */}
          <div className="flex justify-end">
            <div className="h-1.5 w-6 rounded-full rounded-br-none bg-zinc-400" />
          </div>
          {/* Chat bubble 3 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-9 rounded-full rounded-bl-none bg-zinc-200" />
          </div>
          {/* Chat bubble 4 - left aligned */}
          <div className="flex justify-start">
            <div className="h-1.5 w-3 rounded-full rounded-bl-none bg-zinc-200" />
          </div>
          {/* Chat bubble 2 - right aligned */}
          <div className="flex justify-end">
            <div className="h-1.5 w-8 rounded-full rounded-br-none bg-zinc-400" />
          </div>
        </div>
        {/* Small watermark */}
        <div className="absolute right-2 bottom-1 text-xs font-medium text-zinc-300">ariex</div>
      </div>
    </div>
  );
}
