import { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function DetailRow({ label, value, icon }: DetailRowProps) {
  return (
    <div className="flex w-[300px] items-center justify-between gap-8 py-2.5">
      <span className="flex items-center gap-2 text-sm text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="text-sm text-zinc-900">{value}</span>
    </div>
  );
}
