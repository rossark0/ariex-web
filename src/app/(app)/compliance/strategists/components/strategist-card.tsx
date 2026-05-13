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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/10 bg-deep-navy transition-all hover:border-white/20"
    >
      {/* Content */}
      <div className="flex flex-1 flex-col items-start p-4">
        {/* Status Badge */}
        <span
          className={`mb-4 flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 pl-2 text-xs font-medium ${
            isActive ? 'text-emerald-400' : 'text-steel-gray'
          }`}
        >
          <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-steel-gray'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
        {/* Title & Status */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-soft-white group-hover:text-soft-white/80">
            {strategist.user.name}
          </h3>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-steel-gray">
          {getStrategistDescription(strategist)} · {clientCount} clients
        </p>
      </div>
    </div>
  );
}
