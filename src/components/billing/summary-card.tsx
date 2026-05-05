interface SummaryCardProps {
  title: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function SummaryCard({ title, amount, status }: SummaryCardProps) {
  const colors = {
    pending: 'bg-amber-500/10 border-amber-500/30',
    paid: 'bg-emerald-500/10 border-emerald-500/30',
    failed: 'bg-red-500/10 border-red-500/30',
  };

  const textColors = {
    pending: 'text-amber-400',
    paid: 'text-emerald-400',
    failed: 'text-red-400',
  };

  return (
    <div className={`rounded-lg border ${colors[status]} p-4`}>
      <p className="text-xs font-medium text-steel-gray">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${textColors[status]}`}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
}
