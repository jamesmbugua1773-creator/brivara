import { getRequestConfig } from 'next-intl/server';
import en from './messages/en.json';
import fr from './messages/fr.json';
import pt from './messages/pt.json';

const locales = ['en', 'fr', 'pt'];
export const defaultLocale = 'en';

const messagesByLocale = {
  en,
  fr,
  pt,
} as const;

export default getRequestConfig(async (ctx: any) => {
  const rawLocale =
    typeof ctx?.locale === 'string'
      ? ctx.locale
      : typeof ctx?.requestLocale === 'string'
        ? ctx.requestLocale
        : await ctx?.requestLocale;

  const safeLocale = locales.includes(rawLocale) ? rawLocale : defaultLocale;

  const messages = messagesByLocale[safeLocale as keyof typeof messagesByLocale];

  return {
    locale: safeLocale,
    messages,
  };
});
