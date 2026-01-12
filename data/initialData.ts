import { Category, Wallet, Transaction } from '@/types/finance';

export const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Dapur', icon: '🍳', color: 'category-kitchen', type: 'expense' },
  { id: 'cat-2', name: 'Sekolah', icon: '📚', color: 'category-school', type: 'expense' },
  { id: 'cat-3', name: 'Listrik & Air', icon: '💡', color: 'category-utility', type: 'expense' },
  { id: 'cat-4', name: 'Hiburan', icon: '🎬', color: 'category-entertainment', type: 'expense' },
  { id: 'cat-5', name: 'Kesehatan', icon: '💊', color: 'category-health', type: 'expense' },
  { id: 'cat-6', name: 'Transport', icon: '🚗', color: 'category-transport', type: 'expense' },
  { id: 'cat-7', name: 'Belanja', icon: '🛒', color: 'category-shopping', type: 'expense' },
  { id: 'cat-8', name: 'Lainnya', icon: '📦', color: 'category-other', type: 'expense' },
  { id: 'cat-9', name: 'Gaji', icon: '💰', color: 'category-kitchen', type: 'income' },
  { id: 'cat-10', name: 'Bonus', icon: '🎁', color: 'category-entertainment', type: 'income' },
  { id: 'cat-11', name: 'Jualan', icon: '🏪', color: 'category-shopping', type: 'income' },
  { id: 'cat-12', name: 'Lain-lain', icon: '✨', color: 'category-other', type: 'income' },
];

export const defaultWallets: Wallet[] = [
  { id: 'wallet-1', name: 'Dompet', type: 'cash', balance: 500000, icon: '👛' },
  { id: 'wallet-2', name: 'BCA', type: 'bank', balance: 3500000, icon: '🏦' },
  { id: 'wallet-3', name: 'GoPay', type: 'ewallet', balance: 250000, icon: '📱' },
];

export const sampleTransactions: Transaction[] = [
  {
    id: 'tx-1',
    amount: 150000,
    type: 'expense',
    categoryId: 'cat-1',
    walletId: 'wallet-1',
    description: 'Belanja sayur pasar',
    date: new Date(2025, 0, 6),
    createdAt: new Date(2025, 0, 6, 8, 30),
  },
  {
    id: 'tx-2',
    amount: 75000,
    type: 'expense',
    categoryId: 'cat-6',
    walletId: 'wallet-3',
    description: 'Ongkos grab ke mall',
    date: new Date(2025, 0, 5),
    createdAt: new Date(2025, 0, 5, 14, 15),
  },
  {
    id: 'tx-3',
    amount: 5000000,
    type: 'income',
    categoryId: 'cat-9',
    walletId: 'wallet-2',
    description: 'Gaji bulanan',
    date: new Date(2025, 0, 1),
    createdAt: new Date(2025, 0, 1, 9, 0),
  },
  {
    id: 'tx-4',
    amount: 350000,
    type: 'expense',
    categoryId: 'cat-3',
    walletId: 'wallet-2',
    description: 'Tagihan listrik',
    date: new Date(2025, 0, 3),
    createdAt: new Date(2025, 0, 3, 10, 30),
  },
  {
    id: 'tx-5',
    amount: 200000,
    type: 'expense',
    categoryId: 'cat-2',
    walletId: 'wallet-1',
    description: 'Uang jajan anak',
    date: new Date(2025, 0, 4),
    createdAt: new Date(2025, 0, 4, 7, 0),
  },
  {
    id: 'tx-6',
    amount: 500000,
    type: 'income',
    categoryId: 'cat-11',
    walletId: 'wallet-1',
    description: 'Jualan kue',
    date: new Date(2025, 0, 2),
    createdAt: new Date(2025, 0, 2, 16, 0),
  },
];

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatShortRupiah = (amount: number): string => {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}rb`;
  }
  return `Rp ${amount}`;
};
