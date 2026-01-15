"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import logo from '@/app/assets/WhatsApp_Image_2025-12-29_at_13.04.28-removebg-preview.png';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const buttons = useTranslations('buttons');
  const errors = useTranslations('errors');
  const common = useTranslations('common');

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';

  const submit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${apiBase}/auth/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || errors('somethingWrong'));
      setSuccess(t('forgotPasswordSent'));
    } catch (e: any) {
      setError(e?.message || errors('somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
        <div className="text-center mb-6">
          <Image
            src={logo}
            alt={common('logoAlt')}
            width={200}
            height={200}
            className="mx-auto mb-3 w-40 h-auto brightness-0 invert"
            priority
          />
            <p className="text-sm text-gray-400 italic">{common('tagline')}</p>
        </div>

        <h1 className="text-2xl font-bold text-turquoise mb-4">{t('forgotPassword')}</h1>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-2">{success}</p>}

        <label className="text-xs text-gray-400">{t('email')}</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4 text-white placeholder-gray-500"
          placeholder={t('emailPlaceholder')}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-turquoise text-black font-semibold disabled:opacity-50"
        >
          {loading ? buttons('submit') : t('sendResetLink')}
        </button>

        <p className="text-xs text-gray-400 mt-3 text-center">
          {t('backToLogin')}{' '}
          <a href={`/${locale}/login`} className="text-turquoise hover:underline">{t('signIn')}</a>
        </p>
      </div>
    </div>
  );
}
