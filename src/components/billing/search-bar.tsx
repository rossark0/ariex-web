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
          className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-steel-gray"
        />
        <input
          type="text"
          placeholder="Search by agreement, client, or ID..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-deep-navy py-2 pl-9 pr-3 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/30 focus:outline-none"
        />
      </div>
      {!hideRefresh && onRefresh && (
        <button
          onClick={onRefresh}
          className="rounded-lg border border-white/10 bg-deep-navy px-3 py-2 text-sm font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-white/8"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
