'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function HomePage() {
  const router = useRouter();
  const locale = useLocale();
  const common = useTranslations('common');

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('brivara_jwt') : null;
    
    if (token) {
      // Redirect authenticated users to dashboard
      router.push(`/${locale}/dashboard`);
    } else {
      // Redirect unauthenticated users to login
      router.push(`/${locale}/login`);
    }
  }, [router, locale]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg text-gray-400">{common('loading')}</p>
      </div>
    </div>
  );
}
