"use client";

import React, { useEffect, useState } from 'react';

export default function RegisterPage() {
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
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, country, sponsorCode: referralCode })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Registration failed');
      localStorage.setItem('brivara_jwt', j.token);
      // Navigate directly to the authenticated dashboard
      window.location.replace('/dashboard');
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
        <h1 className="text-2xl font-bold text-turquoise mb-4">Register</h1>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <label className="text-xs text-gray-400">Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Referral Code</label>
        <input value={referralCode} onChange={e=>setReferralCode(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Country</label>
        <select value={country} onChange={e=>setCountry(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4">
          <option value="">Select Country</option>
          {COUNTRIES.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
        <button onClick={handleRegister} disabled={loading} className="w-full px-4 py-2 rounded bg-turquoise text-black font-semibold">
          {loading ? 'Submitting…' : 'Register'}
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">Already have an account? <a href="/login" className="text-turquoise">Login</a></p>
      </div>
    </div>
  );
}
