export type TransactionType = 'income' | 'expense';

export type WalletType = 'cash' | 'bank' | 'ewallet';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  icon: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  walletId: string;
  description: string;
  date: Date;
  createdAt: Date;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  walletId: string;
  dueDay: number; // day of month (1-31)
  isActive: boolean;
}

export interface FinanceData {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  reminders: Reminder[];
}
