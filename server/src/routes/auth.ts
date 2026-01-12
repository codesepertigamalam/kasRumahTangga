import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia-smart-kas-ibu';

// Skema validasi
const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  rememberMe: z.boolean().optional().default(false),
});

// Helper: Capitalize nama
const capitalize = (str: string): string => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { name, email, username, password } = validation.data;

    // Cek apakah email atau username sudah terdaftar
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email sudah terdaftar' });
      }
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        name: capitalize(name),
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
      },
    });

    // Buat kategori default untuk user
    const defaultCategories = [
      { name: 'Gaji', type: 'income', icon: '💰' },
      { name: 'Bonus', type: 'income', icon: '🎁' },
      { name: 'Investasi', type: 'income', icon: '📈' },
      { name: 'Makanan', type: 'expense', icon: '🍽️' },
      { name: 'Transportasi', type: 'expense', icon: '🚗' },
      { name: 'Belanja', type: 'expense', icon: '🛒' },
      { name: 'Listrik', type: 'expense', icon: '⚡' },
      { name: 'Internet', type: 'expense', icon: '📶' },
      { name: 'Kesehatan', type: 'expense', icon: '🏥' },
      { name: 'Pendidikan', type: 'expense', icon: '📚' },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        userId: user.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
      })),
    });

    // Buat wallet default
    await prisma.wallet.create({
      data: {
        userId: user.id,
        name: 'Dompet Utama',
        type: 'cash',
        balance: 0,
        icon: '👛',
      },
    });

    // Buat token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Simpan session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: 'Registrasi berhasil! Selamat datang di Smart Kas Ibu.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat registrasi' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: validation.error.errors[0].message 
      });
    }

    const { email, password, rememberMe } = validation.data;

    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Durasi token: 30 hari jika Remember Me, 1 hari jika tidak
    const tokenDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresIn = rememberMe ? '30d' : '1d';

    // Buat token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn }
    );

    // Simpan session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + tokenDuration),
      },
    });

    // Set cookie jika Remember Me
    if (rememberMe) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenDuration,
      });
    }

    res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      username: req.user?.username,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.cookies?.token;

    if (token) {
      // Hapus session dari database
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Hapus cookie
    res.clearCookie('token');

    res.json({ message: 'Logout berhasil' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan saat logout' });
  }
});

export default router;
