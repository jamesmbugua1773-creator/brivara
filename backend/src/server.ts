import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimiterMiddleware } from './utils/rateLimit.js';
import { sanitizeMiddleware, securityHeadersMiddleware, detectAttackPatterns } from './utils/security.js';
import router from './routes/index.js';
import { scheduleDailyROI } from './engines/roi.js';
import { startDepositVerificationScheduler } from './engines/depositVerifier.js';
import { startWithdrawalProcessor } from './engines/withdrawalProcessor.js';
import { env } from './config/env.js';

const app = express();

// Reduce fingerprinting
app.disable('x-powered-by');

// Trust proxy in production (e.g., Nginx) so req.ip is accurate and rate limiting
// cannot be trivially bypassed/spoofed via X-Forwarded-For.
if (env.trustProxy ?? env.isProduction) {
  app.set('trust proxy', 1);
}

// Dev-only self-test to ensure security patterns aren't over-blocking
if (process.env.NODE_ENV !== 'production') {
  try {
    console.log('[SECURITY] detectAttackPatterns self-test', {
      emailLooksSafe: !detectAttackPatterns('u1@example.com'),
      dotdotIsBlocked: detectAttackPatterns('../etc/passwd'),
    });
  } catch {}
}

// Enhanced Helmet configuration with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS: allow all origins in dev for ease; restrict in production
const isDev = process.env.NODE_ENV !== 'production';
const corsOptions = isDev
  ? {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      optionsSuccessStatus: 200,
    }
  : {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowed = Array.from(
          new Set([...(env.corsOrigins ?? []), ...(env.frontendUrl ? [env.frontendUrl] : [])])
        );
        if (!origin || allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      optionsSuccessStatus: 200,
    };

app.use(cors(corsOptions));
// Ensure preflight requests are handled with the same policy
app.options('*', cors(corsOptions));
// Extra dev headers to avoid Safari strictness
if (isDev) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}

// Security: JSON parsing with size limits
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security middleware
app.use(securityHeadersMiddleware);
app.use(sanitizeMiddleware);

// Request logging
app.use(morgan('combined'));

// Attack pattern detection
app.use((req, res, next) => {
  const findAttack = (input: any, path: string): { path: string; valueType: string } | null => {
    if (typeof input === 'string') {
      return detectAttackPatterns(input) ? { path, valueType: 'string' } : null;
    }
    if (Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        const hit = findAttack(input[i], `${path}[${i}]`);
        if (hit) return hit;
      }
      return null;
    }
    if (input && typeof input === 'object') {
      for (const [key, val] of Object.entries(input)) {
        const hit = findAttack(val, path ? `${path}.${key}` : key);
        if (hit) return hit;
      }
      return null;
    }
    return null;
  };

  const hit =
    findAttack(req.body, 'body') ||
    findAttack(req.query, 'query') ||
    findAttack(req.params, 'params');

  if (hit) {
    console.warn('[SECURITY] Attack pattern detected:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      field: hit.path,
    });
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
});

// Rate limiting
app.use(rateLimiterMiddleware);

app.use('/api', router);

const port = Number(process.env.PORT) || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Brivara backend running on port ${port}`);
});

// Start background deposit verification scheduler (configurable via env)
startDepositVerificationScheduler();
// Start withdrawal processor (initiate + complete)
startWithdrawalProcessor();

// Start schedulers
try {
  scheduleDailyROI();
  console.log('ROI scheduler started successfully');
} catch (e) {
  console.error('Failed to start ROI scheduler:', (e as any)?.message || e);
}
