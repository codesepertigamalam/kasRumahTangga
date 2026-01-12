import { useState } from 'react';
import { Header } from '@/components/Header';
import { SummaryCard } from '@/components/SummaryCard';
import { WalletTabs } from '@/components/WalletTabs';
import { TransactionList } from '@/components/TransactionList';
import { ExpenseChart } from '@/components/ExpenseChart';
import { FloatingAddButton } from '@/components/FloatingAddButton';
import { QuickAddModal } from '@/components/QuickAddModal';
import { BudgetSection } from '@/components/BudgetSection';
import { BottomNav } from '@/components/BottomNav';
import { useFinance } from '@/hooks/useFinance';
import { formatRupiah } from '@/data/initialData';

const Index = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    transactions,
    wallets,
    categories,
    budgets,
    activeWalletId,
    setActiveWalletId,
    monthSummary,
    totalBalance,
    expenseByCategory,
    addTransaction,
    addBudget,
    getCategoryById,
    getWalletById,
  } = useFinance();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="container max-w-lg mx-auto px-4 pt-6">
        <Header />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <SummaryCard
            title="Saldo Bulan Ini"
            amount={formatRupiah(monthSummary.balance)}
            icon="💰"
            variant="balance"
            subtitle={`Total di semua dompet: ${formatRupiah(totalBalance)}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              title="Uang Masuk"
              amount={formatRupiah(monthSummary.totalIncome)}
              icon="📥"
              variant="income"
            />
            <SummaryCard
              title="Uang Keluar"
              amount={formatRupiah(monthSummary.totalExpense)}
              icon="📤"
              variant="expense"
            />
          </div>
        </div>

        {/* Wallet Tabs */}
        <div className="mb-6">
          <WalletTabs
            wallets={wallets}
            activeWalletId={activeWalletId}
            onWalletChange={setActiveWalletId}
          />
        </div>

        {/* Budget Section (Amplop Digital) */}
        <div className="mb-6">
          <BudgetSection
            budgets={budgets}
            categories={categories}
            getCategoryById={getCategoryById}
            onAddBudget={addBudget}
          />
        </div>

        {/* Expense Chart */}
        <div className="mb-6">
          <ExpenseChart data={expenseByCategory} />
        </div>

        {/* Transaction List */}
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-4">📋 Riwayat Transaksi</h2>
          <TransactionList
            transactions={transactions}
            getCategoryById={getCategoryById}
            getWalletById={getWalletById}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Floating Add Button */}
      <FloatingAddButton onClick={() => setIsModalOpen(true)} />

      {/* Quick Add Modal */}
      <QuickAddModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={categories}
        wallets={wallets}
        onSubmit={addTransaction}
      />
    </div>
  );
};

export default Index;
