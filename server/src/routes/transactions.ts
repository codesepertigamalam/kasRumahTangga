import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Semua route memerlukan autentikasi
router.use(authMiddleware);

// Skema validasi
const transactionSchema = z.object({
  walletId: z.string().uuid('ID wallet tidak valid'),
  categoryId: z.string().uuid('ID kategori tidak valid'),
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  type: z.enum(['income', 'expense'], { 
    errorMap: () => ({ message: 'Tipe harus income atau expense' }) 
  }),
  description: z.string().optional(),
  date: z.string().transform(str => new Date(str)),
});

// GET /api/transactions - Ambil semua transaksi user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, type, categoryId, walletId, limit, offset } = req.query;

    const where: Prisma.TransactionWhereInput = {
      userId: req.userId,
    };

    // Filter berdasarkan tanggal
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Filter berdasarkan tipe
    if (type && (type === 'income' || type === 'expense')) {
      where.type = type;
    }

    // Filter berdasarkan kategori
    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    // Filter berdasarkan wallet
    if (walletId) {
      where.walletId = walletId as string;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, icon: true, type: true },
        },
        wallet: {
          select: { id: true, name: true, icon: true },
        },
      },
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      skip: offset ? parseInt(offset as string) : 0,
    });

    // Format response
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      date: t.date.toISOString(),
      category: t.category.name,
      categoryId: t.categoryId,
      categoryIcon: t.category.icon,
      walletId: t.walletId,
      walletName: t.wallet.name,
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Gagal mengambil data transaksi' });
  }
});

// POST /api/transactions - Tambah transaksi baru (Quick Entry)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = transactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { walletId, categoryId, amount, type, description, date } = validation.data;

    // Verifikasi wallet milik user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: req.userId },
    });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet tidak ditemukan' });
    }

    // Verifikasi kategori milik user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.userId },
    });
    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    // Buat transaksi dan update saldo wallet dalam satu transaksi database
    const result = await prisma.$transaction(async (tx) => {
      // Buat transaksi
      const transaction = await tx.transaction.create({
        data: {
          userId: req.userId!,
          walletId,
          categoryId,
          amount: new Prisma.Decimal(amount),
          type,
          description,
          date,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          wallet: { select: { id: true, name: true } },
        },
      });

      // Update saldo wallet
      const balanceChange = type === 'income' ? amount : -amount;
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: { increment: balanceChange },
        },
      });

      return transaction;
    });

    res.status(201).json({
      message: type === 'income' ? 'Uang masuk berhasil dicatat!' : 'Pengeluaran berhasil dicatat!',
      transaction: {
        id: result.id,
        amount: Number(result.amount),
        type: result.type,
        description: result.description,
        date: result.date.toISOString(),
        category: result.category.name,
        categoryId: result.categoryId,
        walletId: result.walletId,
        walletName: result.wallet.name,
      },
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Gagal menyimpan transaksi' });
  }
});

// PUT /api/transactions/:id - Update transaksi
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = transactionSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    // Cek transaksi ada dan milik user
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    const { walletId, categoryId, amount, type, description, date } = validation.data;

    // Update transaksi dan saldo dalam satu transaksi database
    const result = await prisma.$transaction(async (tx) => {
      // Rollback saldo lama
      const oldBalanceChange = existingTransaction.type === 'income' 
        ? -Number(existingTransaction.amount) 
        : Number(existingTransaction.amount);
      
      await tx.wallet.update({
        where: { id: existingTransaction.walletId },
        data: { balance: { increment: oldBalanceChange } },
      });

      // Update transaksi
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          ...(walletId && { walletId }),
          ...(categoryId && { categoryId }),
          ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
          ...(type && { type }),
          ...(description !== undefined && { description }),
          ...(date && { date }),
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          wallet: { select: { id: true, name: true } },
        },
      });

      // Apply saldo baru
      const newAmount = amount ?? Number(existingTransaction.amount);
      const newType = type ?? existingTransaction.type;
      const newWalletId = walletId ?? existingTransaction.walletId;
      const newBalanceChange = newType === 'income' ? newAmount : -newAmount;

      await tx.wallet.update({
        where: { id: newWalletId },
        data: { balance: { increment: newBalanceChange } },
      });

      return updated;
    });

    res.json({
      message: 'Transaksi berhasil diperbarui',
      transaction: {
        id: result.id,
        amount: Number(result.amount),
        type: result.type,
        description: result.description,
        date: result.date.toISOString(),
        category: result.category.name,
        categoryId: result.categoryId,
        walletId: result.walletId,
        walletName: result.wallet.name,
      },
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Gagal memperbarui transaksi' });
  }
});

// DELETE /api/transactions/:id - Hapus transaksi
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek transaksi ada dan milik user
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    // Hapus transaksi dan update saldo dalam satu transaksi database
    await prisma.$transaction(async (tx) => {
      // Rollback saldo
      const balanceChange = transaction.type === 'income' 
        ? -Number(transaction.amount) 
        : Number(transaction.amount);
      
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: balanceChange } },
      });

      // Hapus transaksi
      await tx.transaction.delete({ where: { id } });
    });

    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Gagal menghapus transaksi' });
  }
});

export default router;
