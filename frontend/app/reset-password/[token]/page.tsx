"use client";
import React, { useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();

  useEffect(() => {
    const cookieLocale = typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/)?.[1] ?? 'en')
      : 'en';

    params.then(p => {
      router.replace(`/${decodeURIComponent(cookieLocale)}/reset-password/${p.token}`);
    });
  }, [params, router]);

  return null;
}
