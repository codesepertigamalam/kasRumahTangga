import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Skema validasi
const budgetSchema = z.object({
  categoryId: z.string().uuid('ID kategori tidak valid'),
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Periode harus weekly, monthly, atau yearly' }),
  }),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
});

// Helper: Hitung pengeluaran untuk kategori dalam periode tertentu
const calculateSpent = async (
  userId: string, 
  categoryId: string, 
  startDate: Date, 
  endDate: Date
): Promise<number> => {
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: 'expense',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return Number(result._sum.amount || 0);
};

// GET /api/budgets - Ambil semua budget user dengan perhitungan spent
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hitung spent untuk setiap budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await calculateSpent(
          req.userId!,
          budget.categoryId,
          budget.startDate,
          budget.endDate
        );

        const amount = Number(budget.amount);
        const remaining = amount - spent;
        const percentage = Math.min(Math.round((spent / amount) * 100), 100);

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          categoryIcon: budget.category.icon,
          amount,
          spent,
          remaining,
          percentage,
          period: budget.period,
          startDate: budget.startDate.toISOString(),
          endDate: budget.endDate.toISOString(),
          isOverBudget: spent > amount,
          isNearLimit: percentage >= 80 && percentage < 100,
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Gagal mengambil data budget' });
  }
});

// POST /api/budgets - Tambah budget baru (Amplop Digital)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = budgetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { categoryId, amount, period, startDate, endDate } = validation.data;

    // Verifikasi kategori milik user dan tipe expense
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    if (category.type !== 'expense') {
      return res.status(400).json({ error: 'Budget hanya bisa dibuat untuk kategori pengeluaran' });
    }

    // Cek apakah budget untuk kategori dan periode ini sudah ada
    const existing = await prisma.budget.findFirst({
      where: {
        userId: req.userId,
        categoryId,
        period,
      },
    });

    if (existing) {
      return res.status(400).json({ 
        error: `Budget ${period} untuk kategori ini sudah ada. Silakan edit budget yang ada.` 
      });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        categoryId,
        amount: new Prisma.Decimal(amount),
        period,
        startDate,
        endDate,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    // Hitung spent
    const spent = await calculateSpent(req.userId!, categoryId, startDate, endDate);
    const remaining = amount - spent;
    const percentage = Math.min(Math.round((spent / amount) * 100), 100);

    res.status(201).json({
      message: `Amplop "${category.name}" berhasil dibuat!`,
      budget: {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon,
        amount,
        spent,
        remaining,
        percentage,
        period: budget.period,
        startDate: budget.startDate.toISOString(),
        endDate: budget.endDate.toISOString(),
        isOverBudget: spent > amount,
        isNearLimit: percentage >= 80 && percentage < 100,
      },
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Gagal membuat budget' });
  }
});

// PUT /api/budgets/:id - Update budget
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = budgetSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    // Cek budget ada dan milik user
    const existing = await prisma.budget.findFirst({
      where: { id, userId: req.userId },
      include: { category: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Budget tidak ditemukan' });
    }

    const { categoryId, amount, period, startDate, endDate } = validation.data;

    // Jika categoryId diubah, verifikasi kategori baru
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.userId, type: 'expense' },
      });
      if (!category) {
        return res.status(400).json({ error: 'Kategori tidak valid' });
      }
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
        ...(period && { period }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    // Hitung spent
    const spent = await calculateSpent(
      req.userId!, 
      budget.categoryId, 
      budget.startDate, 
      budget.endDate
    );
    const budgetAmount = Number(budget.amount);
    const remaining = budgetAmount - spent;
    const percentage = Math.min(Math.round((spent / budgetAmount) * 100), 100);

    res.json({
      message: 'Budget berhasil diperbarui',
      budget: {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon,
        amount: budgetAmount,
        spent,
        remaining,
        percentage,
        period: budget.period,
        startDate: budget.startDate.toISOString(),
        endDate: budget.endDate.toISOString(),
        isOverBudget: spent > budgetAmount,
        isNearLimit: percentage >= 80 && percentage < 100,
      },
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Gagal memperbarui budget' });
  }
});

// DELETE /api/budgets/:id - Hapus budget
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek budget ada dan milik user
    const budget = await prisma.budget.findFirst({
      where: { id, userId: req.userId },
      include: { category: true },
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget tidak ditemukan' });
    }

    await prisma.budget.delete({ where: { id } });

    res.json({ message: `Amplop "${budget.category.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Gagal menghapus budget' });
  }
});

export default router;
