import { Transaction, Category, Wallet } from '@/types/finance';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  transactions: Transaction[];
  getCategoryById: (id: string) => Category | undefined;
  getWalletById: (id: string) => Wallet | undefined;
}

export const TransactionList = ({
  transactions,
  getCategoryById,
  getWalletById,
}: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-muted-foreground font-medium">Belum ada transaksi bulan ini</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tekan tombol + untuk menambah catatan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          category={getCategoryById(transaction.categoryId)}
          wallet={getWalletById(transaction.walletId)}
        />
      ))}
    </div>
  );
};
