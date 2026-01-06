'use client';

import { useStrategy } from '../StrategyStore';
import { StrategyCard } from './strategy-card';

export function StrategyList() {
  const strategies = useStrategy(state => state.strategies);

  if (strategies.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">No strategies generated yet</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {strategies.map(strategy => (
        <StrategyCard key={strategy.id} strategy={strategy} />
      ))}
    </div>
  );
}
