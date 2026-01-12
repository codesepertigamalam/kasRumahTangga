import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Skema validasi
const reminderSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(100, 'Judul maksimal 100 karakter'),
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  dueDate: z.string().transform(str => new Date(str)),
  isRecurring: z.boolean().optional().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
});

// GET /api/reminders - Ambil semua reminder user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { upcoming, isPaid } = req.query;

    const where: any = { userId: req.userId };

    // Filter upcoming (belum jatuh tempo)
    if (upcoming === 'true') {
      where.dueDate = { gte: new Date() };
      where.isPaid = false;
    }

    // Filter berdasarkan status pembayaran
    if (isPaid === 'true') {
      where.isPaid = true;
    } else if (isPaid === 'false') {
      where.isPaid = false;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    const formattedReminders = reminders.map(r => ({
      id: r.id,
      title: r.title,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString(),
      isRecurring: r.isRecurring,
      frequency: r.frequency,
      isPaid: r.isPaid,
      paidAt: r.paidAt?.toISOString(),
      isOverdue: !r.isPaid && r.dueDate < new Date(),
      daysUntilDue: Math.ceil((r.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));

    res.json(formattedReminders);
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Gagal mengambil data pengingat' });
  }
});

// POST /api/reminders - Tambah reminder baru
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = reminderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { title, amount, dueDate, isRecurring, frequency } = validation.data;

    // Validasi: jika recurring, frequency wajib
    if (isRecurring && !frequency) {
      return res.status(400).json({ 
        error: 'Frekuensi wajib diisi untuk pengingat berulang' 
      });
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: req.userId!,
        title,
        amount: new Prisma.Decimal(amount),
        dueDate,
        isRecurring,
        frequency: isRecurring ? frequency : null,
      },
    });

    res.status(201).json({
      message: 'Pengingat berhasil ditambahkan',
      reminder: {
        id: reminder.id,
        title: reminder.title,
        amount: Number(reminder.amount),
        dueDate: reminder.dueDate.toISOString(),
        isRecurring: reminder.isRecurring,
        frequency: reminder.frequency,
        isPaid: reminder.isPaid,
      },
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Gagal menambahkan pengingat' });
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = reminderSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    // Cek reminder ada dan milik user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pengingat tidak ditemukan' });
    }

    const { title, amount, dueDate, isRecurring, frequency } = validation.data;

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
        ...(dueDate && { dueDate }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(frequency !== undefined && { frequency }),
      },
    });

    res.json({
      message: 'Pengingat berhasil diperbarui',
      reminder: {
        id: reminder.id,
        title: reminder.title,
        amount: Number(reminder.amount),
        dueDate: reminder.dueDate.toISOString(),
        isRecurring: reminder.isRecurring,
        frequency: reminder.frequency,
        isPaid: reminder.isPaid,
      },
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Gagal memperbarui pengingat' });
  }
});

// PUT /api/reminders/:id/mark-paid - Tandai sebagai sudah dibayar
router.put('/:id/mark-paid', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek reminder ada dan milik user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pengingat tidak ditemukan' });
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    });

    // Jika recurring, buat reminder baru untuk periode berikutnya
    if (existing.isRecurring && existing.frequency) {
      const nextDueDate = new Date(existing.dueDate);
      
      switch (existing.frequency) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }

      await prisma.reminder.create({
        data: {
          userId: req.userId!,
          title: existing.title,
          amount: existing.amount,
          dueDate: nextDueDate,
          isRecurring: true,
          frequency: existing.frequency,
        },
      });
    }

    res.json({
      message: `"${reminder.title}" ditandai sudah dibayar`,
      reminder: {
        id: reminder.id,
        title: reminder.title,
        isPaid: reminder.isPaid,
        paidAt: reminder.paidAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Gagal menandai pembayaran' });
  }
});

// DELETE /api/reminders/:id - Hapus reminder
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cek reminder ada dan milik user
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Pengingat tidak ditemukan' });
    }

    await prisma.reminder.delete({ where: { id } });

    res.json({ message: 'Pengingat berhasil dihapus' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Gagal menghapus pengingat' });
  }
});

export default router;
