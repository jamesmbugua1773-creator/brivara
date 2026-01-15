import './loadEnv.js';

import { z } from 'zod';

const truthy = z.union([z.literal('true'), z.literal('false')]).transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  TRUST_PROXY: z.string().optional(),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),

  TRANSACTION_AUTH_SECRET: z.string().optional(),
  WITHDRAWAL_PROVIDER_URL: z.string().optional(),
  WITHDRAWAL_PROVIDER_SECRET: z.string().optional(),

  FRONTEND_URL: z.string().optional(),
  API_URL: z.string().optional(),
  WEBSITE_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.string().optional(),

  DEPOSIT_AUTO_CONFIRM: z.string().optional(),
});

const raw = envSchema.parse(process.env);

export const env = {
  nodeEnv: raw.NODE_ENV ?? 'development',
  isProduction: (raw.NODE_ENV ?? '').toLowerCase() === 'production',
  port: Number(raw.PORT ?? '4000'),

  trustProxy: raw.TRUST_PROXY ? truthy.parse(raw.TRUST_PROXY) : undefined,

  databaseUrl: raw.DATABASE_URL,

  jwtSecret: raw.JWT_SECRET,
  jwtExpiresIn: raw.JWT_EXPIRES_IN ?? '7d',

  transactionAuthSecret: raw.TRANSACTION_AUTH_SECRET,
  withdrawalProviderUrl: raw.WITHDRAWAL_PROVIDER_URL,
  withdrawalProviderSecret: raw.WITHDRAWAL_PROVIDER_SECRET,

  frontendUrl: raw.FRONTEND_URL,
  apiUrl: raw.API_URL,
  websiteUrl: raw.WEBSITE_URL,
  corsOrigins: (raw.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  smtpHost: raw.SMTP_HOST,
  smtpPort: raw.SMTP_PORT ? Number(raw.SMTP_PORT) : undefined,
  smtpSecure: raw.SMTP_SECURE ? truthy.parse(raw.SMTP_SECURE) : undefined,
  smtpUser: raw.SMTP_USER,
  smtpPass: raw.SMTP_PASS,
  emailFrom: raw.EMAIL_FROM,

  redisUrl: raw.REDIS_URL,
  logLevel: raw.LOG_LEVEL ?? (raw.NODE_ENV === 'production' ? 'info' : 'debug'),

  depositAutoConfirm: raw.DEPOSIT_AUTO_CONFIRM ? truthy.parse(raw.DEPOSIT_AUTO_CONFIRM) : false,
} as const;

function requireStrongSecret(name: string, value: string | undefined, minLen: number): string {
  if (value && value.trim().length >= minLen) return value;
  if (env.isProduction) throw new Error(`Missing required env var ${name} (production)`);
  // eslint-disable-next-line no-console
  console.warn(`[WARN] ${name} not set; using insecure dev fallback`);
  return 'dev-secret';
}

export function requireJwtSecret(): string {
  // 32+ chars in production (JWT signing); allow shorter in dev for convenience.
  const minLen = env.isProduction ? 32 : 16;
  return requireStrongSecret('JWT_SECRET', env.jwtSecret, minLen);
}

export function requireDatabaseUrl(): string {
  if (env.databaseUrl && env.databaseUrl.trim().length > 0) return env.databaseUrl;
  // Prisma is configured for PostgreSQL (see prisma/schema.prisma), so we cannot
  // safely fall back to SQLite here.
  throw new Error(
    env.isProduction
      ? 'Missing required env var DATABASE_URL (production)'
      : 'Missing env var DATABASE_URL. Set it to your Supabase Postgres URL (recommended) or your local Postgres URL (e.g. docker-compose uses localhost:15432).',
  );
}
