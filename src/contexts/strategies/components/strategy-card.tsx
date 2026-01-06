'use client';

interface StrategyCardProps {
  strategy: any;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <div className="hover:bg-accent rounded-lg border p-6 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{strategy.title}</h3>
          <p className="text-muted-foreground mt-2 text-sm">{strategy.description}</p>
        </div>
        {strategy.estimatedSavings && (
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${strategy.estimatedSavings.toLocaleString()}
            </div>
            <div className="text-muted-foreground text-sm">Est. Savings</div>
          </div>
        )}
      </div>
    </div>
  );
}
