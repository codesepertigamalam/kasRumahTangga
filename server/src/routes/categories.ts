import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(50, 'Nama maksimal 50 karakter'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Tipe harus income atau expense' }),
  }),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/categories - Ambil semua kategori user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    const where: any = { userId: req.userId };
    if (type === 'income' || type === 'expense') {
      where.type = type;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const formattedCategories = categories.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Gagal mengambil data kategori' });
  }
});

// POST /api/categories - Tambah kategori baru
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = categorySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { name, type, icon, color } = validation.data;
    const capitalizedName = capitalize(name);

    // Cek apakah kategori sudah ada
    const existing = await prisma.category.findFirst({
      where: { 
        userId: req.userId, 
        name: capitalizedName,
        type,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Kategori sudah ada' });
    }

    const category = await prisma.category.create({
      data: {
        userId: req.userId!,
        name: capitalizedName,
        type,
        icon,
        color,
      },
    });

    res.status(201).json({
      message: 'Kategori berhasil ditambahkan',
      category: {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
      },
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Gagal menambahkan kategori' });
  }
});

// PUT /api/categories/:id - Update kategori
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = categorySchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    // Cek kategori ada dan milik user
    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    const { name, type, icon, color } = validation.data;
    const capitalizedName = name ? capitalize(name) : undefined;

    // Cek nama duplikat jika nama/tipe diubah
    const newName = capitalizedName ?? existing.name;
    const newType = type ?? existing.type;
    
    if (newName !== existing.name || newType !== existing.type) {
      const duplicate = await prisma.category.findFirst({
        where: { 
          userId: req.userId, 
          name: newName,
          type: newType,
          id: { not: id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Kategori sudah ada' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(capitalizedName && { name: capitalizedName }),
        ...(type && { type }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
    });

    res.json({
      message: 'Kategori berhasil diperbarui',
      category: {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
      },
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Gagal memperbarui kategori' });
  }
});

// DELETE /api/categories/:id - Hapus kategori
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek kategori ada dan milik user
    const category = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    }

    // Cek apakah kategori memiliki transaksi
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        error: `Kategori tidak dapat dihapus karena memiliki ${transactionCount} transaksi.` 
      });
    }

    // Cek apakah kategori memiliki budget
    const budgetCount = await prisma.budget.count({
      where: { categoryId: id },
    });

    if (budgetCount > 0) {
      return res.status(400).json({ 
        error: 'Kategori tidak dapat dihapus karena memiliki alokasi budget.' 
      });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Gagal menghapus kategori' });
  }
});

export default router;
