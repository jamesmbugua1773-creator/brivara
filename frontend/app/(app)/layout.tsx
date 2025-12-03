"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-gray-400">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} Brivara Capital. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-turquoise">Privacy Policy</a>
          <a href="#" className="hover:text-turquoise">Terms</a>
          <a href="#" className="hover:text-turquoise">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [jwt, setJwt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : '';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('brivara_jwt');
    if (!t) {
      // Redirect unauthenticated users directly to the login page
      window.location.replace('/login');
    } else if (!jwt) {
      setJwt(t);
    }
  }, [jwt]);

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
            if (p.role === 'ADMIN' && (path === '/' || path === '/dashboard')) {
              window.location.replace('/admin');
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [jwt, base]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-turquoise">BRIVARA</h2>
            <div className="mt-1 text-xs text-gray-400">Role: <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-gray-200">{role ?? '...'}</span></div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white text-2xl">☰</button>
        </div>
        <aside className={`w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 md:block ${menuOpen ? 'block' : 'hidden'} md:relative absolute inset-y-0 left-0 z-50`}>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-turquoise">BRIVARA</h2>
            <div className="mt-1 text-xs text-gray-400">Role: <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-gray-200">{role ?? '...'}</span></div>
          </div>
          <nav className="space-y-2">
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            {role === 'ADMIN' && (
              <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/admin" onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>
            )}
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/wallet" onClick={() => setMenuOpen(false)}>Wallet</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/packages" onClick={() => setMenuOpen(false)}>Invest / Packages</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/withdraw" onClick={() => setMenuOpen(false)}>Withdraw</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/awards" onClick={() => setMenuOpen(false)}>Awards</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/rebates" onClick={() => setMenuOpen(false)}>Rebates</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/referrals" onClick={() => setMenuOpen(false)}>Referrals</Link>
            <Link className="block px-3 py-2 rounded hover:bg-slate-800" href="/support" onClick={() => setMenuOpen(false)}>Support</Link>
          </nav>
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => { localStorage.removeItem('brivara_jwt'); window.location.href = '/'; }}
              className="w-full px-3 py-2 rounded bg-red-700/30 border border-red-600 text-red-300 hover:bg-red-700/40"
            >Logout</button>
          </div>
        </aside>
        <main className="flex-1 p-6 md:p-10">
          {jwt ? children : (<div className="text-sm text-gray-400">Loading…</div>)}
          <Footer />
        </main>
      </div>
    </div>
  );
}
