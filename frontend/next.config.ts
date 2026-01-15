import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

function getCspConnectSrc(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const candidates = [
    process.env.NEXT_PUBLIC_API_BASE,
    process.env.API_URL,
    ...(isProd ? [] : ['http://localhost:4000', 'http://localhost:4001']),
  ].filter(Boolean) as string[];

  const origins: string[] = [];
  for (const value of candidates) {
    try {
      // NEXT_PUBLIC_API_BASE may include a path like /api
      const url = value.includes('://') ? new URL(value) : new URL(`http://${value}`);
      origins.push(url.origin);
    } catch {
      // Ignore invalid values
    }
  }

  return Array.from(new Set(["'self'", ...origins, 'https:'])).join(' ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const connectSrc = getCspConnectSrc();
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src ${connectSrc};`,
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
