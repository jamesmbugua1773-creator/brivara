"use client";

import React, { useState } from 'react';

export default function LoginPage() {
  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
        setLoading(true);
        setErr(null);
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
        const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Login failed');
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
              if (prof.role === 'ADMIN') { window.location.replace('/admin'); return; }
            }
          }
        } catch {}
        window.location.replace('/dashboard');
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form autoComplete="off" className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
        <h1 className="text-2xl font-bold text-turquoise mb-4">Login</h1>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        {/* Hidden inputs to prevent browser autofill */}
        <input type="text" style={{display: 'none'}} />
        <input type="password" style={{display: 'none'}} />
        <label className="text-xs text-gray-400">Email</label>
        <input autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Password</label>
        <input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4" />
        <div className="text-xs mb-4 text-right">
          <a href="/forgot-password" className="text-turquoise hover:underline">Forgot password?</a>
        </div>
        <button onClick={handleLogin} disabled={loading} className="w-full px-4 py-2 rounded bg-turquoise text-black font-semibold">
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">Don't have an account? <a href="/register" className="text-turquoise">Register</a></p>
      </form>
    </div>
  );
}
