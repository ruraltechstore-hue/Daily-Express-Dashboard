import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { WithdrawalStats } from '@/features/withdrawals/api/withdrawals.api';

interface WithdrawalStatsCardsProps {
  stats?: WithdrawalStats;
  isLoading: boolean;
  activeStatus?: string;
  onFilterClick?: (status: 'pending' | 'processing' | 'completed' | 'all') => void;
}

export function WithdrawalStatsCards({
  stats,
  isLoading,
  activeStatus = 'all',
  onFilterClick,
}: WithdrawalStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Pending Payouts',
      amount: stats?.pendingAmount ?? 0,
      count: stats?.pendingCount ?? 0,
      statusKey: 'pending' as const,
      dotColor: 'bg-amber-500',
    },
    {
      label: 'In Clearing',
      amount: stats?.processingAmount ?? 0,
      count: stats?.processingCount ?? 0,
      statusKey: 'processing' as const,
      dotColor: 'bg-blue-500',
    },
    {
      label: 'Settled Payouts',
      amount: stats?.completedAmount ?? 0,
      count: stats?.completedCount ?? 0,
      statusKey: 'completed' as const,
      dotColor: 'bg-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const isSelected = activeStatus === item.statusKey;
        return (
          <div
            key={item.label}
            onClick={() => onFilterClick && onFilterClick(isSelected ? 'all' : item.statusKey)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              isSelected
                ? 'border-primary shadow-sm ring-1 ring-primary/20'
                : 'border-border hover:border-border-hover hover:bg-surface/30'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                {item.label}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">
                {item.count} {item.count === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <div className="text-xl font-bold text-text-primary tracking-tight mt-1.5">
              {formatCurrency(item.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
