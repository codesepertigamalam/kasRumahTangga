import { Transaction, Category, Wallet } from '@/types/finance';
import { formatRupiah } from '@/data/initialData';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TransactionItemProps {
  transaction: Transaction;
  category: Category | undefined;
  wallet: Wallet | undefined;
}

const categoryColorMap: Record<string, string> = {
  'category-kitchen': 'bg-category-kitchen',
  'category-school': 'bg-category-school',
  'category-utility': 'bg-category-utility',
  'category-entertainment': 'bg-category-entertainment',
  'category-health': 'bg-category-health',
  'category-transport': 'bg-category-transport',
  'category-shopping': 'bg-category-shopping',
  'category-other': 'bg-category-other',
};

export const TransactionItem = ({ transaction, category, wallet }: TransactionItemProps) => {
  const isIncome = transaction.type === 'income';

  return (
    <div className="transaction-item">
      <div
        className={cn(
          'category-icon text-white',
          category ? categoryColorMap[category.color] : 'bg-category-other'
        )}
      >
        {category?.icon || '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{transaction.description}</p>
        <p className="text-sm text-muted-foreground">
          {category?.name} • {wallet?.name}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'font-bold',
            isIncome ? 'text-income' : 'text-expense'
          )}
        >
          {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(transaction.date, 'd MMM', { locale: localeID })}
        </p>
      </div>
    </div>
  );
};
