import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Helper: Capitalize nama
const capitalize = (str: string): string => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Skema validasi
const walletSchema = z.object({
  name: z.string().min(1, 'Nama wallet wajib diisi').max(50, 'Nama maksimal 50 karakter'),
  type: z.enum(['cash', 'bank', 'e-wallet', 'other'], {
    errorMap: () => ({ message: 'Tipe wallet tidak valid' }),
  }),
  balance: z.number().optional().default(0),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/wallets - Ambil semua wallet user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    const formattedWallets = wallets.map(w => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance),
      icon: w.icon,
      color: w.color,
    }));

    res.json(formattedWallets);
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Gagal mengambil data wallet' });
  }
});

// POST /api/wallets - Tambah wallet baru
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = walletSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { name, type, balance, icon, color } = validation.data;
    const capitalizedName = capitalize(name);

    // Cek apakah nama wallet sudah ada
    const existing = await prisma.wallet.findFirst({
      where: { userId: req.userId, name: capitalizedName },
    });

    if (existing) {
      return res.status(400).json({ error: 'Nama wallet sudah digunakan' });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: req.userId!,
        name: capitalizedName,
        type,
        balance: new Prisma.Decimal(balance),
        icon,
        color,
      },
    });

    res.status(201).json({
      message: 'Wallet berhasil ditambahkan',
      wallet: {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        balance: Number(wallet.balance),
        icon: wallet.icon,
        color: wallet.color,
      },
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: 'Gagal menambahkan wallet' });
  }
});

// PUT /api/wallets/:id - Update wallet
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = walletSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    // Cek wallet ada dan milik user
    const existing = await prisma.wallet.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Wallet tidak ditemukan' });
    }

    const { name, type, balance, icon, color } = validation.data;
    const capitalizedName = name ? capitalize(name) : undefined;

    // Cek nama duplikat jika nama diubah
    if (capitalizedName && capitalizedName !== existing.name) {
      const duplicate = await prisma.wallet.findFirst({
        where: { 
          userId: req.userId, 
          name: capitalizedName,
          id: { not: id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Nama wallet sudah digunakan' });
      }
    }

    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(capitalizedName && { name: capitalizedName }),
        ...(type && { type }),
        ...(balance !== undefined && { balance: new Prisma.Decimal(balance) }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
    });

    res.json({
      message: 'Wallet berhasil diperbarui',
      wallet: {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        balance: Number(wallet.balance),
        icon: wallet.icon,
        color: wallet.color,
      },
    });
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: 'Gagal memperbarui wallet' });
  }
});

// DELETE /api/wallets/:id - Hapus wallet
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek wallet ada dan milik user
    const wallet = await prisma.wallet.findFirst({
      where: { id, userId: req.userId },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet tidak ditemukan' });
    }

    // Cek apakah wallet memiliki transaksi
    const transactionCount = await prisma.transaction.count({
      where: { walletId: id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: `Wallet tidak dapat dihapus karena memiliki ${transactionCount} transaksi. Hapus transaksi terlebih dahulu.` 
      });
    }

    await prisma.wallet.delete({ where: { id } });

    res.json({ message: 'Wallet berhasil dihapus' });
  } catch (error) {
    console.error('Delete wallet error:', error);
    res.status(500).json({ error: 'Gagal menghapus wallet' });
  }
});

export default router;
