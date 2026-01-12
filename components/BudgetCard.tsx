import { Budget, Category } from '@/types/finance';
import { Progress } from '@/components/ui/progress';
import { formatRupiah } from '@/data/initialData';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface BudgetCardProps {
  budget: Budget & { spent: number };
  category: Category | undefined;
}

export const BudgetCard = ({ budget, category }: BudgetCardProps) => {
  const percentage = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
  const isOverBudget = budget.spent > budget.amount;
  const isNearLimit = percentage >= 80 && !isOverBudget;
  const remaining = budget.amount - budget.spent;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
            {category?.icon || '📦'}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{category?.name || 'Kategori'}</h3>
            <p className="text-xs text-muted-foreground">
              {formatRupiah(budget.spent)} / {formatRupiah(budget.amount)}
            </p>
          </div>
        </div>
        <div className="text-right">
          {isOverBudget ? (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Melebihi!</span>
            </div>
          ) : isNearLimit ? (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Hampir habis</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-income">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Aman</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={percentage} 
          className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-income'}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage.toFixed(0)}% terpakai</span>
          <span className={remaining < 0 ? 'text-destructive font-medium' : ''}>
            {remaining < 0 ? `Lebih ${formatRupiah(Math.abs(remaining))}` : `Sisa ${formatRupiah(remaining)}`}
          </span>
        </div>
      </div>
    </div>
  );
};
