import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category, Wallet, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  wallets: Wallet[];
  onSubmit: (data: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    walletId: string;
    description: string;
    date: Date;
  }) => void;
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

export const QuickAddModal = ({
  open,
  onOpenChange,
  categories,
  wallets,
  onSubmit,
}: QuickAddModalProps) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [description, setDescription] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = () => {
    if (!amount || !categoryId || !walletId) return;

    onSubmit({
      amount: Number(amount),
      type,
      categoryId,
      walletId,
      description: description || filteredCategories.find(c => c.id === categoryId)?.name || '',
      date: new Date(),
    });

    // Reset form
    setAmount('');
    setCategoryId('');
    setDescription('');
    onOpenChange(false);
  };

  const formatAmountDisplay = (value: string) => {
    const num = Number(value.replace(/\D/g, ''));
    if (isNaN(num) || num === 0) return '';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Catat Transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type Toggle */}
          <div className="flex rounded-full bg-muted p-1">
            <button
              onClick={() => setType('expense')}
              className={cn(
                'flex-1 py-2.5 rounded-full font-semibold text-sm transition-all',
                type === 'expense'
                  ? 'bg-expense text-white shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              💸 Uang Keluar
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                'flex-1 py-2.5 rounded-full font-semibold text-sm transition-all',
                type === 'income'
                  ? 'bg-income text-white shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              💰 Uang Masuk
            </button>
          </div>

          {/* Amount Input */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">Nominal</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl text-muted-foreground">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountDisplay(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="input-money w-48 text-foreground"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Kategori</p>
            <div className="grid grid-cols-4 gap-3">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
                    categoryId === cat.id
                      ? 'bg-primary/10 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <span
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-lg text-white',
                      categoryColorMap[cat.color]
                    )}
                  >
                    {cat.icon}
                  </span>
                  <span className="text-xs font-medium truncate w-full text-center">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Dari/Ke</p>
            <div className="flex gap-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => setWalletId(wallet.id)}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-medium transition-all text-sm',
                    walletId === wallet.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {wallet.icon} {wallet.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Keterangan (opsional)</p>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Belanja sayur di pasar"
              className="rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!amount || !categoryId}
            className="w-full h-12 rounded-xl font-bold text-base bg-primary hover:bg-primary/90"
          >
            💾 Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
