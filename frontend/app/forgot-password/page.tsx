"use client";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';

  const submit = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${apiBase}/auth/forgot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setSuccess('If an account with that email exists, a reset link has been sent.');
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
        <h1 className="text-2xl font-bold text-turquoise mb-4">Forgot Password</h1>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <label className="text-xs text-gray-400">Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4" />
        <button onClick={submit} disabled={loading} className="w-full px-4 py-2 rounded bg-turquoise text-black font-semibold">
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">Back to <a href="/login" className="text-turquoise">Login</a></p>
      </div>
    </div>
  );
}
