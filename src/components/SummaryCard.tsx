import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  amount: string;
  icon: ReactNode;
  variant: 'balance' | 'income' | 'expense';
  subtitle?: string;
}

const variantStyles = {
  balance: 'card-balance',
  income: 'card-income',
  expense: 'card-expense',
};

export const SummaryCard = ({ title, amount, icon, variant, subtitle }: SummaryCardProps) => {
  return (
    <div className={cn('card-summary', variantStyles[variant])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-90">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{amount}</p>
      {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
    </div>
  );
};
