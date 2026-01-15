"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import logo from '@/app/assets/WhatsApp_Image_2025-12-29_at_13.04.28-removebg-preview.png';

export default function RegisterPage() {
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
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const COUNTRIES = [
    'United States','United Kingdom','Canada','Nigeria','Ghana','Kenya','South Africa','India','Pakistan','Bangladesh','China','Japan','South Korea','Brazil','Argentina','Mexico','Germany','France','Italy','Spain','Portugal','Netherlands','Sweden','Norway','Denmark','Finland','Poland','Czech Republic','Russia','Ukraine','Turkey','Saudi Arabia','United Arab Emirates','Qatar','Egypt','Morocco','Algeria','Tunisia','Indonesia','Philippines','Vietnam','Thailand','Malaysia','Singapore','Australia','New Zealand','Chile','Colombia','Peru','Venezuela'
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref) setReferralCode(ref);
    }
  }, []);

  const handleRegister = async () => {
    try {
      setLoading(true); setErr(null);

      const trimmedReferralCode = referralCode.trim();
      if (!trimmedReferralCode || trimmedReferralCode.length < 3) {
        setErr(t('referralCodeRequired'));
        return;
      }

      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, country, sponsorCode: trimmedReferralCode })
      });
      const j = await res.json();
      if (!res.ok) {
        const extracted =
          typeof j?.error === 'string'
            ? j.error
            : (j?.error?.formErrors?.[0] ?? Object.values(j?.error?.fieldErrors ?? {}).flat()?.[0]);

        const mapped =
          extracted === 'Email already registered'
            ? errors('userExists')
            : extracted === 'Username already taken'
              ? errors('usernameTaken')
              : null;

        throw new Error(mapped || extracted || errors('somethingWrong'));
      }
      localStorage.setItem('brivara_jwt', j.token);
      // Navigate directly to the authenticated dashboard
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
        <h1 className="text-2xl font-bold text-turquoise mb-4">{t('createAccount')}</h1>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        
        <label className="text-xs text-gray-400">{t('email')}</label>
        <input 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          type="email"
          placeholder={t('emailPlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3 text-white placeholder-gray-500" 
        />
        
        <label className="text-xs text-gray-400">{t('username')}</label>
        <input 
          value={username} 
          onChange={e=>setUsername(e.target.value)} 
          placeholder={t('usernamePlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3 text-white placeholder-gray-500" 
        />
        
        <label className="text-xs text-gray-400">{t('password')}</label>
        <input 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          type="password"
          placeholder={t('passwordPlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3 text-white placeholder-gray-500" 
        />
        
        <label className="text-xs text-gray-400">{t('country')}</label>
        <select 
          value={country} 
          onChange={e=>setCountry(e.target.value)}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3 text-white"
        >
          <option value="">{t('selectCountry')}</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <label className="text-xs text-gray-400">{t('referralCodeLabel')}</label>
        <input 
          value={referralCode} 
          onChange={e=>setReferralCode(e.target.value)} 
          required
          placeholder={t('referralCodePlaceholder')}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4 text-white placeholder-gray-500" 
        />
        
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-turquoise text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
        >
          {loading ? common('loading') : buttons('submit')}
        </button>
        
        <p className="text-center text-sm text-gray-400 mt-4">
          {t('alreadyHaveAccount')} 
          <a href={`/${locale}/login`} className="text-turquoise hover:underline ml-1">
            {t('signIn')}
          </a>
        </p>
      </div>
    </div>
  );
}
