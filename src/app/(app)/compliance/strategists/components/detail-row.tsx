import { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-8 py-2.5">
      <span className="flex items-center gap-2 text-sm text-steel-gray">
        {icon}
        {label}
      </span>
      <span className="text-sm text-soft-white">{value}</span>
    </div>
  );
}
