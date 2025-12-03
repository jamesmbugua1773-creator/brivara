import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const limiter = new RateLimiterMemory({ points: 100, duration: 60 });

export async function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await limiter.consume((req.ip as string) || 'unknown');
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
}
