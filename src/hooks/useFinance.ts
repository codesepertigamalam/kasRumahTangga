import { useCallback, useEffect, useMemo, useState } from 'react';
import { Transaction, Wallet, Category, MonthSummary, Budget, Reminder } from '@/types/finance';
import { defaultCategories, defaultWallets, sampleTransactions } from '@/data/initialData';
import { useLocalStorage } from './useLocalStorage';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

const STORAGE_KEY = 'smart-kas-ibu-data';

interface StoredData {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  reminders: Reminder[];
}

const initialData: StoredData = {
  transactions: sampleTransactions,
  wallets: defaultWallets,
  categories: defaultCategories,
  budgets: [],
  reminders: [],
};

// Check if API is available
const isApiAvailable = (): boolean => {
  return !!api.getToken();
};

export const useFinance = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Local storage fallback
  const [localData, setLocalData] = useLocalStorage<StoredData>(STORAGE_KEY, initialData);
  const [activeWalletId, setActiveWalletId] = useLocalStorage<string | null>('smart-kas-active-wallet', null);
  
  // API state
  const [apiData, setApiData] = useState<StoredData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use API data if authenticated, otherwise use local data
  const data = isAuthenticated && apiData ? apiData : localData;
  const setData = isAuthenticated ? setApiData : setLocalData;

  const { transactions, wallets, categories, budgets, reminders } = data;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Fetch data from API when authenticated
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !isApiAvailable()) return;

    setIsLoading(true);
    setError(null);

    try {
      const [transactionsRes, walletsRes, categoriesRes, budgetsRes, remindersRes] = await Promise.all([
        api.getTransactions(),
        api.getWallets(),
        api.getCategories(),
        api.getBudgets({ month: currentMonth, year: currentYear }),
        api.getReminders(),
      ]);

      const hasError = transactionsRes.error || walletsRes.error || categoriesRes.error || budgetsRes.error || remindersRes.error;
      
      if (hasError) {
        setError('Gagal memuat data dari server');
        return;
      }

      setApiData({
        transactions: (transactionsRes.data as Transaction[]) || [],
        wallets: (walletsRes.data as Wallet[]) || [],
        categories: (categoriesRes.data as Category[]) || [],
        budgets: (budgetsRes.data as Budget[]) || [],
        reminders: (remindersRes.data as Reminder[]) || [],
      });
    } catch (err) {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentMonth, currentYear]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // All transactions for reporting
  const allTransactions = transactions;

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(
      (t) => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }
    );

    if (activeWalletId) {
      filtered = filtered.filter((t) => t.walletId === activeWalletId);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentMonth, currentYear, activeWalletId]);

  const monthSummary: MonthSummary = useMemo(() => {
    const summary = filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.totalIncome += t.amount;
        } else {
          acc.totalExpense += t.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 }
    );

    summary.balance = summary.totalIncome - summary.totalExpense;
    return summary;
  }, [filteredTransactions]);

  const totalBalance = useMemo(() => {
    if (activeWalletId) {
      const wallet = wallets.find((w) => w.id === activeWalletId);
      return wallet?.balance || 0;
    }
    return wallets.reduce((acc, w) => acc + w.balance, 0);
  }, [wallets, activeWalletId]);

  const expenseByCategory = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    const byCategory = expenses.reduce((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCategory).map(([categoryId, amount]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        name: category?.name || 'Lainnya',
        icon: category?.icon || '📦',
        color: category?.color || 'category-other',
        amount,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories]);

  // Budget with spent calculation
  const budgetsWithSpent = useMemo(() => {
    return budgets
      .filter((b) => b.month === currentMonth && b.year === currentYear)
      .map((budget) => {
        const spent = filteredTransactions
          .filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId)
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...budget, spent };
      });
  }, [budgets, filteredTransactions, currentMonth, currentYear]);

  // Helper to sync to API or update local
  const syncAction = useCallback(async <T>(
    apiCall: () => Promise<{ data?: T; error?: string }>,
    localUpdate: () => void,
    successMessage: string
  ) => {
    if (isAuthenticated && isApiAvailable()) {
      setIsSyncing(true);
      const response = await apiCall();
      setIsSyncing(false);

      if (response.error) {
        toast({
          variant: 'destructive',
          title: 'Gagal Menyimpan',
          description: response.error,
        });
        return false;
      }

      toast({
        title: 'Berhasil',
        description: successMessage,
      });
      await fetchData(); // Refresh data
      return true;
    } else {
      localUpdate();
      toast({
        title: 'Tersimpan Lokal',
        description: successMessage,
      });
      return true;
    }
  }, [isAuthenticated, fetchData, toast]);

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
      const localUpdate = () => {
        const newTransaction: Transaction = {
          ...transaction,
          id: `tx-${Date.now()}`,
          createdAt: new Date(),
        };

        setLocalData((prev) => ({
          ...prev,
          transactions: [newTransaction, ...prev.transactions],
          wallets: prev.wallets.map((w) =>
            w.id === transaction.walletId
              ? {
                  ...w,
                  balance:
                    transaction.type === 'income'
                      ? w.balance + transaction.amount
                      : w.balance - transaction.amount,
                }
              : w
          ),
        }));
      };

      await syncAction(
        () => api.createTransaction(transaction),
        localUpdate,
        'Transaksi berhasil ditambahkan'
      );
    },
    [syncAction, setLocalData]
  );

  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );

  const getWalletById = useCallback(
    (id: string) => wallets.find((w) => w.id === id),
    [wallets]
  );

  // Budget management
  const addBudget = useCallback(
    async (budget: Omit<Budget, 'id' | 'spent'>) => {
      const localUpdate = () => {
        const newBudget: Budget = {
          ...budget,
          id: `budget-${Date.now()}`,
          spent: 0,
        };
        setLocalData((prev) => ({
          ...prev,
          budgets: [...prev.budgets.filter(
            (b) => !(b.categoryId === budget.categoryId && b.month === budget.month && b.year === budget.year)
          ), newBudget],
        }));
      };

      await syncAction(
        () => api.createBudget(budget),
        localUpdate,
        'Budget berhasil ditambahkan'
      );
    },
    [syncAction, setLocalData]
  );

  const updateBudget = useCallback(
    async (id: string, amount: number) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          budgets: prev.budgets.map((b) =>
            b.id === id ? { ...b, amount } : b
          ),
        }));
      };

      await syncAction(
        () => api.updateBudget(id, { amount }),
        localUpdate,
        'Budget berhasil diupdate'
      );
    },
    [syncAction, setLocalData]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          budgets: prev.budgets.filter((b) => b.id !== id),
        }));
      };

      await syncAction(
        () => api.deleteBudget(id),
        localUpdate,
        'Budget berhasil dihapus'
      );
    },
    [syncAction, setLocalData]
  );

  // Category management
  const addCategory = useCallback(
    async (category: Omit<Category, 'id'>) => {
      const localUpdate = () => {
        const newCategory: Category = {
          ...category,
          id: `cat-${Date.now()}`,
        };
        setLocalData((prev) => ({
          ...prev,
          categories: [...prev.categories, newCategory],
        }));
      };

      await syncAction(
        () => api.createCategory(category),
        localUpdate,
        'Kategori berhasil ditambahkan'
      );
    },
    [syncAction, setLocalData]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      };

      await syncAction(
        () => api.updateCategory(id, updates),
        localUpdate,
        'Kategori berhasil diupdate'
      );
    },
    [syncAction, setLocalData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== id),
        }));
      };

      await syncAction(
        () => api.deleteCategory(id),
        localUpdate,
        'Kategori berhasil dihapus'
      );
    },
    [syncAction, setLocalData]
  );

  // Wallet management
  const addWallet = useCallback(
    async (wallet: Omit<Wallet, 'id'>) => {
      const localUpdate = () => {
        const newWallet: Wallet = {
          ...wallet,
          id: `wallet-${Date.now()}`,
        };
        setLocalData((prev) => ({
          ...prev,
          wallets: [...prev.wallets, newWallet],
        }));
      };

      await syncAction(
        () => api.createWallet(wallet),
        localUpdate,
        'Dompet berhasil ditambahkan'
      );
    },
    [syncAction, setLocalData]
  );

  const updateWallet = useCallback(
    async (id: string, updates: Partial<Wallet>) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          wallets: prev.wallets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      };

      await syncAction(
        () => api.updateWallet(id, updates),
        localUpdate,
        'Dompet berhasil diupdate'
      );
    },
    [syncAction, setLocalData]
  );

  const deleteWallet = useCallback(
    async (id: string) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          wallets: prev.wallets.filter((w) => w.id !== id),
        }));
      };

      await syncAction(
        () => api.deleteWallet(id),
        localUpdate,
        'Dompet berhasil dihapus'
      );
    },
    [syncAction, setLocalData]
  );

  // Reminder management
  const addReminder = useCallback(
    async (reminder: Omit<Reminder, 'id'>) => {
      const localUpdate = () => {
        const newReminder: Reminder = {
          ...reminder,
          id: `reminder-${Date.now()}`,
        };
        setLocalData((prev) => ({
          ...prev,
          reminders: [...prev.reminders, newReminder],
        }));
      };

      await syncAction(
        () => api.createReminder(reminder),
        localUpdate,
        'Pengingat berhasil ditambahkan'
      );
    },
    [syncAction, setLocalData]
  );

  const updateReminder = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          reminders: prev.reminders.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      };

      await syncAction(
        () => api.updateReminder(id, updates),
        localUpdate,
        'Pengingat berhasil diupdate'
      );
    },
    [syncAction, setLocalData]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const localUpdate = () => {
        setLocalData((prev) => ({
          ...prev,
          reminders: prev.reminders.filter((r) => r.id !== id),
        }));
      };

      await syncAction(
        () => api.deleteReminder(id),
        localUpdate,
        'Pengingat berhasil dihapus'
      );
    },
    [syncAction, setLocalData]
  );

  return {
    transactions: filteredTransactions,
    allTransactions,
    wallets,
    categories,
    budgets: budgetsWithSpent,
    reminders,
    activeWalletId,
    setActiveWalletId,
    monthSummary,
    totalBalance,
    expenseByCategory,
    isLoading,
    isSyncing,
    error,
    refetch: fetchData,
    addTransaction,
    getCategoryById,
    getWalletById,
    // Budget
    addBudget,
    updateBudget,
    deleteBudget,
    // Category
    addCategory,
    updateCategory,
    deleteCategory,
    // Wallet
    addWallet,
    updateWallet,
    deleteWallet,
    // Reminder
    addReminder,
    updateReminder,
    deleteReminder,
  };
};
