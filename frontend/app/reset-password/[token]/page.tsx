"use client";
import React, { useState, useEffect } from "react";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  const submit = async () => {
    if (!token) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${apiBase}/auth/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reset failed');
      setSuccess('Password changed successfully. Redirecting to login…');
      setTimeout(() => { window.location.replace('/login'); }, 1500);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30">
        <h1 className="text-2xl font-bold text-turquoise mb-4">Reset Password</h1>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-2">{success}</p>}
        <label className="text-xs text-gray-400">New Password</label>
        <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
        <label className="text-xs text-gray-400">Confirm Password</label>
        <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4" />
        <button onClick={submit} disabled={loading || !token} className="w-full px-4 py-2 rounded bg-turquoise text-black font-semibold">
          {loading ? 'Changing…' : 'Change Password'}
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">Back to <a href="/login" className="text-turquoise">Login</a></p>
      </div>
    </div>
  );
}
