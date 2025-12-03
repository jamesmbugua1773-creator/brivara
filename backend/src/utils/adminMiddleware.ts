import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Admin check failed' });
  }
}
