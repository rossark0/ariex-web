import { FullStrategistMock } from '@/lib/mocks/strategist-full';
import { getStrategistDescription } from '../utils';

interface StrategistCardProps {
  strategist: FullStrategistMock;
  onClick: () => void;
}

export function StrategistCard({ strategist, onClick }: StrategistCardProps) {
  const clientCount = strategist.metrics.totalClients;
  const isActive = strategist.metrics.activeClients > 0;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md"
    >
      {/* Content */}
      <div className="flex flex-1 flex-col items-start p-4">
        {/* Status Badge */}
        <span
          className={`mb-4 flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 pl-2 text-xs font-medium ${
            isActive ? 'text-emerald-700' : 'text-zinc-600'
          }`}
        >
          <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
        {/* Title & Status */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
            {strategist.user.name}
          </h3>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-zinc-500">
          {getStrategistDescription(strategist)} · {clientCount} clients
        </p>
      </div>
    </div>
  );
}
