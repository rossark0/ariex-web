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
    pending: 'bg-amber-50 border-amber-200',
    paid: 'bg-emerald-50 border-emerald-200',
    failed: 'bg-red-50 border-red-200',
  };

  const textColors = {
    pending: 'text-amber-700',
    paid: 'text-emerald-700',
    failed: 'text-red-700',
  };

  return (
    <div className={`rounded-lg border ${colors[status]} p-4`}>
      <p className="text-xs font-medium text-zinc-600">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${textColors[status]}`}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
}
