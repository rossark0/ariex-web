import { MagnifyingGlassIcon } from '@phosphor-icons/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
  hideRefresh?: boolean;
}

export function SearchBar({ value, onChange, onRefresh, hideRefresh = false }: SearchBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-xs">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          placeholder="Search by agreement, client, or ID..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
        />
      </div>
      {!hideRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
