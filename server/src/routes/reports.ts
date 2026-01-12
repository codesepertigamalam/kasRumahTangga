import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/reports/monthly - Laporan bulanan
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;

    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Ambil transaksi bulan ini
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: { select: { name: true, icon: true } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Hitung total income dan expense
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Breakdown per kategori
    const categoryBreakdown: Record<string, { 
      name: string; 
      icon: string | null; 
      total: number; 
      count: number;
      type: string;
    }> = {};

    transactions.forEach(t => {
      const key = t.categoryId;
      if (!categoryBreakdown[key]) {
        categoryBreakdown[key] = {
          name: t.category.name,
          icon: t.category.icon,
          total: 0,
          count: 0,
          type: t.type,
        };
      }
      categoryBreakdown[key].total += Number(t.amount);
      categoryBreakdown[key].count += 1;
    });

    // Konversi ke array dan urutkan
    const expenseByCategory = Object.values(categoryBreakdown)
      .filter(c => c.type === 'expense')
      .sort((a, b) => b.total - a.total)
      .map(c => ({
        name: c.name,
        icon: c.icon,
        total: c.total,
        count: c.count,
        percentage: totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0,
      }));

    const incomeByCategory = Object.values(categoryBreakdown)
      .filter(c => c.type === 'income')
      .sort((a, b) => b.total - a.total)
      .map(c => ({
        name: c.name,
        icon: c.icon,
        total: c.total,
        count: c.count,
        percentage: totalIncome > 0 ? Math.round((c.total / totalIncome) * 100) : 0,
      }));

    // Daily breakdown untuk chart
    const dailyBreakdown: Record<string, { income: number; expense: number }> = {};
    
    for (let d = 1; d <= endDate.getDate(); d++) {
      dailyBreakdown[d] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const day = new Date(t.date).getDate();
      if (t.type === 'income') {
        dailyBreakdown[day].income += Number(t.amount);
      } else {
        dailyBreakdown[day].expense += Number(t.amount);
      }
    });

    const dailyData = Object.entries(dailyBreakdown).map(([day, data]) => ({
      day: parseInt(day),
      income: data.income,
      expense: data.expense,
    }));

    res.json({
      period: {
        month: targetMonth + 1,
        year: targetYear,
        monthName: startDate.toLocaleString('id-ID', { month: 'long' }),
      },
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: transactions.length,
      },
      expenseByCategory,
      incomeByCategory,
      dailyData,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        description: t.description,
        date: t.date.toISOString(),
        category: t.category.name,
        categoryIcon: t.category.icon,
        wallet: t.wallet.name,
      })),
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: 'Gagal mengambil laporan bulanan' });
  }
});

// GET /api/reports/trend - Tren mingguan/bulanan
router.get('/trend', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'monthly', months = '6' } = req.query;
    const monthsCount = parseInt(months as string);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    let trendData: Array<{
      label: string;
      income: number;
      expense: number;
      balance: number;
    }> = [];

    if (period === 'weekly') {
      // Group by week
      const weeklyData: Record<string, { income: number; expense: number }> = {};

      transactions.forEach(t => {
        const date = new Date(t.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { income: 0, expense: 0 };
        }

        if (t.type === 'income') {
          weeklyData[weekKey].income += Number(t.amount);
        } else {
          weeklyData[weekKey].expense += Number(t.amount);
        }
      });

      trendData = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekKey, data]) => {
          const date = new Date(weekKey);
          return {
            label: `${date.getDate()}/${date.getMonth() + 1}`,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
          };
        });
    } else {
      // Group by month
      const monthlyData: Record<string, { income: number; expense: number }> = {};

      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0 };
        }

        if (t.type === 'income') {
          monthlyData[monthKey].income += Number(t.amount);
        } else {
          monthlyData[monthKey].expense += Number(t.amount);
        }
      });

      trendData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, data]) => {
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            label: date.toLocaleString('id-ID', { month: 'short', year: '2-digit' }),
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
          };
        });
    }

    // Hitung rata-rata
    const avgIncome = trendData.length > 0 
      ? Math.round(trendData.reduce((sum, d) => sum + d.income, 0) / trendData.length)
      : 0;
    const avgExpense = trendData.length > 0
      ? Math.round(trendData.reduce((sum, d) => sum + d.expense, 0) / trendData.length)
      : 0;

    res.json({
      period,
      trendData,
      averages: {
        income: avgIncome,
        expense: avgExpense,
        balance: avgIncome - avgExpense,
      },
    });
  } catch (error) {
    console.error('Trend report error:', error);
    res.status(500).json({ error: 'Gagal mengambil data tren' });
  }
});

// GET /api/reports/comparison - Perbandingan antar bulan
router.get('/comparison', async (req: AuthRequest, res: Response) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Bulan ini
    const currentStart = new Date(currentYear, currentMonth, 1);
    const currentEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Bulan lalu
    const prevStart = new Date(currentYear, currentMonth - 1, 1);
    const prevEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const [currentTransactions, prevTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: req.userId,
          date: { gte: currentStart, lte: currentEnd },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: req.userId,
          date: { gte: prevStart, lte: prevEnd },
        },
      }),
    ]);

    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const currentExpense = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevIncome = prevTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const prevExpense = prevTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeChange = prevIncome > 0 
      ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100) 
      : 100;
    const expenseChange = prevExpense > 0 
      ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100) 
      : 100;

    res.json({
      currentMonth: {
        name: currentStart.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
        income: currentIncome,
        expense: currentExpense,
        balance: currentIncome - currentExpense,
      },
      previousMonth: {
        name: prevStart.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
        income: prevIncome,
        expense: prevExpense,
        balance: prevIncome - prevExpense,
      },
      changes: {
        income: incomeChange,
        expense: expenseChange,
        incomeDirection: incomeChange >= 0 ? 'up' : 'down',
        expenseDirection: expenseChange >= 0 ? 'up' : 'down',
      },
    });
  } catch (error) {
    console.error('Comparison report error:', error);
    res.status(500).json({ error: 'Gagal mengambil data perbandingan' });
  }
});

export default router;
