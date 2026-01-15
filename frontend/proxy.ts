import createMiddleware from 'next-intl/middleware';

import { defaultLocale } from './i18n';

export default createMiddleware({
  locales: ['en', 'fr', 'pt'],
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
