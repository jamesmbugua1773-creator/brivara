import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LocaleSync } from '@/app/components/LocaleSync';

type Props = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Brivara Capital - Investment Platform',
  description: 'Brivara Capital Investment Platform',
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!['en', 'fr', 'pt'].includes(locale)) {
    redirect('/en');
  }

  // Get messages for the locale
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSync />
      {children}
    </NextIntlClientProvider>
  );
}
