"use client";
import React, { useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    const cookieLocale = typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/)?.[1] ?? 'en')
      : 'en';
    router.replace(`/${decodeURIComponent(cookieLocale)}/forgot-password`);
  }, [router]);

  return null;
}
