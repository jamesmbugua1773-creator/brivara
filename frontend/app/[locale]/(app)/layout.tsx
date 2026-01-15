"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { BrandingHeader } from '@/app/components/BrandingHeader';

function Footer() {
  const footer = useTranslations('footer');
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-gray-400">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{footer('copyright', { year })}</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-turquoise">{footer('privacy')}</a>
          <a href="#" className="hover:text-turquoise">{footer('terms')}</a>
          <a href="#" className="hover:text-turquoise">{footer('contact')}</a>
        </div>
      </div>
    </footer>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const buttons = useTranslations('buttons');

  const [jwt, setJwt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : '';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('brivara_jwt');
    if (!t) {
      // Redirect unauthenticated users directly to the login page
      window.location.replace(`/${locale}/login`);
    } else if (!jwt) {
      setJwt(t);
    }
  }, [jwt, locale]);

  useEffect(() => {
    if (!jwt) return;
    const headers = { Authorization: `Bearer ${jwt}` } as const;
    fetch(`${base}/profile`, { headers })
      .then(async (r) => {
        if (!r.ok) return;
        const p = await r.json();
        if (p?.role) {
          setRole(p.role);
          try { localStorage.setItem('brivara_role', p.role); } catch {}
          try {
            const path = window.location.pathname;
            if (p.role === 'ADMIN' && (path === `/${locale}` || path === `/${locale}/dashboard`)) {
              window.location.replace(`/${locale}/admin`);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [jwt, base, locale]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-turquoise">BRIVARA</h2>
            <p className="text-xs text-gray-400 italic">{common('tagline')}</p>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">☰</button>
        </div>
        <aside className={`w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 md:block ${menuOpen ? 'block' : 'hidden'} md:relative absolute inset-y-0 left-0 z-50`}>
          <BrandingHeader role={role} size="lg" />
          <nav className="space-y-2">
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/dashboard`} onClick={() => setMenuOpen(false)}>{nav('dashboard')}</Link>
            {role === 'ADMIN' && (
              <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/admin`} onClick={() => setMenuOpen(false)}>{nav('adminDashboard')}</Link>
            )}
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/profile`} onClick={() => setMenuOpen(false)}>{nav('profile')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/funding`} onClick={() => setMenuOpen(false)}>{nav('funding')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/wallet`} onClick={() => setMenuOpen(false)}>{nav('wallet')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/packages`} onClick={() => setMenuOpen(false)}>{nav('packages')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/withdraw`} onClick={() => setMenuOpen(false)}>{nav('withdraw')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/awards`} onClick={() => setMenuOpen(false)}>{nav('awards')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/rebates`} onClick={() => setMenuOpen(false)}>{nav('rebates')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/referrals`} onClick={() => setMenuOpen(false)}>{nav('referrals')}</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href={`/${locale}/support`} onClick={() => setMenuOpen(false)}>{nav('support')}</Link>
          </nav>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => { localStorage.removeItem('brivara_jwt'); window.location.href = `/${locale}`; }}
              className="w-full px-3 py-2 rounded bg-red-700/30 border border-red-600 text-red-300 hover:bg-red-700/40"
            >{buttons('logout')}</button>
          </div>
        </aside>
        <main className="flex-1 p-6 md:p-10">
          {jwt ? children : (<div className="text-sm text-gray-400">{common('loading')}</div>)}
          <Footer />
        </main>
      </div>
    </div>
  );
}
