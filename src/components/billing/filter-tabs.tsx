import { type ChargeFilter } from '@/contexts/strategist-contexts/billing/BillingStore';

interface FilterTabsProps {
  activeFilter: ChargeFilter;
  onFilterChange: (filter: ChargeFilter) => void;
}

export function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  const filters: { label: string; value: ChargeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className="mb-6 flex gap-2 border-b border-white/8">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeFilter === filter.value
              ? 'border-b-2 border-electric-blue text-electric-blue'
              : 'text-steel-gray hover:text-soft-white'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
