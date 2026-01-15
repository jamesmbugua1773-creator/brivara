'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const supportedLocales = ['en', 'fr', 'pt'] as const;

type SupportedLocale = (typeof supportedLocales)[number];

function hasLocalePrefix(pathname: string): boolean {
  const seg = pathname.split('/')[1];
  return supportedLocales.includes(seg as SupportedLocale);
}

function buildLocalizedPath(pathname: string, newLocale: SupportedLocale): string {
  const path = pathname || '/';
  const segments = path.split('/');
  const next = hasLocalePrefix(path)
    ? ['/', newLocale, ...segments.slice(2)].join('/')
    : `/${newLocale}${path.startsWith('/') ? path : `/${path}`}`;

  return next.replace(/\/+/g, '/');
}

export function LocaleSync({ onlyWhenAuthenticated = true }: { onlyWhenAuthenticated?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (onlyWhenAuthenticated) {
      const token = localStorage.getItem('brivara_jwt');
      if (!token) return;
    }

    const preferred = localStorage.getItem('preferredLanguage') as SupportedLocale | null;
    if (!preferred || !supportedLocales.includes(preferred)) return;

    if (preferred === locale) return;

    try {
      document.cookie = `NEXT_LOCALE=${encodeURIComponent(preferred)}; Path=/; SameSite=Lax`;
    } catch {}

    const nextPath = buildLocalizedPath(pathname || '/', preferred);
    if (nextPath !== (pathname || '/')) {
      router.replace(nextPath);
    }
  }, [locale, pathname, router, onlyWhenAuthenticated]);

  return null;
}
