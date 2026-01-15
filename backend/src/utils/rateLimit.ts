import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { env } from '../config/env.js';

const commonLimiterOptions = {
  points: 300,
  duration: 60,
  blockDuration: 0,
} as const;

const authLimiterOptions = {
  points: 10,
  duration: 60,
  blockDuration: 300,
} as const;

function createRedisClient(): Redis | null {
  if (!env.redisUrl) return null;
  try {
    const client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // Avoid unhandled error events bringing down the process.
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.warn('[WARN] Redis rate limiter error:', err?.message ?? err);
    });

    return client;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[WARN] Failed to init Redis client for rate limiting; falling back to memory');
    return null;
  }
}

const redisClient = createRedisClient();

const limiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl',
      ...commonLimiterOptions,
    })
  : new RateLimiterMemory(commonLimiterOptions);

const authLimiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_auth',
      ...authLimiterOptions,
    })
  : new RateLimiterMemory(authLimiterOptions);

function getClientKey(req: Request): string {
  // With trust proxy set correctly in production, req.ip is safe and consistent.
  return req.ip || 'unknown';
}

export async function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const key = getClientKey(req);

    // Use stricter limits for auth endpoints
    if (
      req.path.includes('/auth/login') ||
      req.path.includes('/auth/register') ||
      req.path.includes('/auth/forgot-password') ||
      req.path.includes('/auth/reset-password')
    ) {
      await authLimiter.consume(key);
    } else {
      await limiter.consume(key);
    }
    next();
  } catch (error) {
    // rate-limiter-flexible throws a RateLimiterRes-like object on limit exceeded
    const retryAfterSeconds =
      typeof (error as any)?.msBeforeNext === 'number'
        ? Math.max(1, Math.ceil(((error as any).msBeforeNext as number) / 1000))
        : 60;

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: retryAfterSeconds,
    });
  }
}
