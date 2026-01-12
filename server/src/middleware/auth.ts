import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    name: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ambil token dari header Authorization atau cookie
    const authHeader = req.headers.authorization;
    const tokenFromCookie = req.cookies?.token;
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : tokenFromCookie;

    if (!token) {
      return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }

    // Verifikasi JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia-smart-kas-ibu') as {
      userId: string;
      email: string;
    };

    // Cek apakah session masih valid di database
    const session = await prisma.session.findFirst({
      where: {
        userId: decoded.userId,
        token: token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    }

    req.userId = session.userId;
    req.user = session.user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token tidak valid.' });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan pada autentikasi.' });
  }
};
