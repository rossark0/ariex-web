interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
}

const variants = {
  default: 'bg-white/8 text-steel-gray',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
};

export function StatusBadge({ children, variant = 'default' }: StatusBadgeProps) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
