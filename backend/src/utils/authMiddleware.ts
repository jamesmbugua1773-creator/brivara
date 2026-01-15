import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireJwtSecret } from '../config/env.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, requireJwtSecret()) as any;
    (req as any).userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
