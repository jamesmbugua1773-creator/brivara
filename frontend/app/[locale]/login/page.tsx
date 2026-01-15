"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import logo from '@/app/assets/WhatsApp_Image_2025-12-29_at_13.04.28-removebg-preview.png';

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const errors = useTranslations('errors');
  const buttons = useTranslations('buttons');
  const common = useTranslations('common');
  
  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErr(null);
      setWelcomeMessage(null);
      setShowWelcome(false);

      const identity = email.trim();
      const trimmedPassword = password;
      if (!identity) {
        setErr(errors('identityRequired'));
        return;
      }
      if (!trimmedPassword || trimmedPassword.length < 8) {
        setErr(errors('shortPassword'));
        return;
      }

      const loginBody = identity.includes('@')
        ? { email: identity, password: trimmedPassword }
        : { username: identity, password: trimmedPassword };

      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginBody)
      });
      const json = await res.json();
      if (!res.ok) {
        const extracted =
          typeof json?.error === 'string'
            ? json.error
            : (json?.error?.formErrors?.[0] ?? Object.values(json?.error?.fieldErrors ?? {}).flat()?.[0]);

        const mapped = extracted === 'Invalid credentials' ? errors('invalidCredentials') : null;
        throw new Error(mapped || extracted || errors('invalidCredentials'));
      }
      
      // Persist token under the same key used across the app
      localStorage.setItem('brivara_jwt', json.token);
      
      // Fetch profile to decide redirect (admin → /admin, user → /dashboard)
      try {
        const headers = { Authorization: `Bearer ${json.token}` } as const;
        const profRes = await fetch(`${apiBase}/profile`, { headers });
        if (profRes.ok) {
          const prof = await profRes.json();
          if (prof?.role) {
            try { localStorage.setItem('brivara_role', prof.role); } catch {}
            
            // Create welcome message
            const roleDisplay = prof.role === 'USER' ? t('roleMember') : (prof.role === 'ADMIN' ? t('roleAdmin') : prof.role);
            const username = prof.username || prof.name || prof.email?.split('@')[0] || t('userFallback');
            const message = t('welcomeBackMessage', { role: roleDisplay, username });
            setWelcomeMessage(message);
            setShowWelcome(true);
            
            // Redirect after showing welcome message
            setTimeout(() => {
              if (prof.role === 'ADMIN') { 
                window.location.replace(`/${locale}/admin`);
              } else { 
                window.location.replace(`/${locale}/dashboard`);
              }
            }, 2000);
            return;
          }
        }
      } catch {}
      
      // Fallback if profile fetch fails
      window.location.replace(`/${locale}/dashboard`);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      {/* Language Switcher in Header */}
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <form autoComplete="off" className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
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
        <h1 className="text-2xl font-bold text-turquoise mb-4">{t('login')}</h1>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        
        {showWelcome && welcomeMessage && (
          <p className="text-green-400 text-sm mb-3">{welcomeMessage}</p>
        )}
        
        <label className="text-xs text-gray-400">{t('emailOrUsername')}</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="text"
          placeholder={t('emailOrUsernamePlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3 text-white placeholder-gray-500"
        />
        
        <label className="text-xs text-gray-400">{t('password')}</label>
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder={t('passwordPlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4 text-white placeholder-gray-500"
        />
        
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-turquoise text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
        >
          {loading ? common('loading') : buttons('submit')}
        </button>
        
        <p className="text-center text-sm text-gray-400 mt-4">
          {t('noAccount')}
          <a href={`/${locale}/register`} className="text-turquoise hover:underline ml-1">
            {t('registerNow')}
          </a>
        </p>
        
        <p className="text-center text-sm text-gray-400 mt-2">
          <a href={`/${locale}/forgot-password`} className="text-turquoise hover:underline">
            {t('forgotPassword')}
          </a>
        </p>
      </form>
    </div>
  );
}
