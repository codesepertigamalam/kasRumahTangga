import { useState } from 'react';
import { Budget, Category } from '@/types/finance';
import { BudgetCard } from './BudgetCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { formatRupiah } from '@/data/initialData';

interface BudgetSectionProps {
  budgets: (Budget & { spent: number })[];
  categories: Category[];
  getCategoryById: (id: string) => Category | undefined;
  onAddBudget: (budget: Omit<Budget, 'id' | 'spent'>) => void;
}

export const BudgetSection = ({ budgets, categories, getCategoryById, onAddBudget }: BudgetSectionProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const existingBudgetCategoryIds = budgets.map((b) => b.categoryId);
  const availableCategories = expenseCategories.filter((c) => !existingBudgetCategoryIds.includes(c.id));

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  const handleSubmit = () => {
    if (!selectedCategory || !amount) return;
    
    const now = new Date();
    onAddBudget({
      categoryId: selectedCategory,
      amount: parseInt(amount),
      month: now.getMonth(),
      year: now.getFullYear(),
    });
    
    setOpen(false);
    setSelectedCategory('');
    setAmount('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            ✉️ Amplop Digital
          </h2>
          <p className="text-sm text-muted-foreground">
            Total: {formatRupiah(totalSpent)} / {formatRupiah(totalBudget)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full">
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Buat Amplop Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Kategori</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Batas Budget</label>
                <Input
                  type="number"
                  placeholder="Contoh: 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                Simpan Amplop
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-muted/50 rounded-2xl p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Belum ada amplop budget. Tambahkan untuk mengatur pengeluaran bulanan Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              category={getCategoryById(budget.categoryId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
