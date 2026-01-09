interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
}

const variants = {
  default: 'bg-zinc-100 text-zinc-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
};

export function StatusBadge({ children, variant = 'default' }: StatusBadgeProps) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
