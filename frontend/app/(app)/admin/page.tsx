"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type User = { id: string; email: string; username: string; role?: string; created_at?: string; status?: string };

export default function AdminPage() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : '';

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('brivara_jwt') : null;
    if (!t) { window.location.replace('/login'); return; }
    setJwt(t);
  }, []);

  useEffect(() => {
    if (!jwt) return;
    const headers = { Authorization: `Bearer ${jwt}` } as const;
    setLoading(true);
    fetch(`${base}/profile`, { headers })
      .then(async (p) => {
        if (!p.ok) throw new Error(`Profile HTTP ${p.status}`);
        const profile = await p.json();
        setRole(profile?.role ?? 'USER');
        if (profile?.role !== 'ADMIN') {
          setLoading(false);
          setError('Not authorized');
          return;
        }
        const u = await fetch(`${base}/admin/users`, { headers });
        if (!u.ok) throw new Error(`Users HTTP ${u.status}`);
        const usersJson = await u.json();
        setUsers(usersJson || []);
        setError(null);
        setLoading(false);
      })
      .catch((e) => { setError(e.message || 'Failed to load admin'); setLoading(false); });
  }, [jwt, base]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link href="/dashboard" className="px-3 py-2 rounded bg-slate-800 border border-slate-700">Switch to User Dashboard</Link>
      </div>
      {role !== 'ADMIN' && !loading && (
        <div className="text-sm text-yellow-400">You are not authorized to view admin dashboard.</div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        role === 'ADMIN' ? (
        <div>
          <h2 className="text-xl font-medium mb-3">All Users</h2>
          {users.length === 0 ? (
            <div className="text-sm text-gray-400">No users.</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`} className="block border rounded-md p-3 hover:bg-slate-800 transition">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Email</div>
                      <div className="font-medium">{u.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Username</div>
                      <div className="font-medium">{u.username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Role</div>
                      <div className="font-medium">{u.role ?? 'USER'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="font-medium">{u.status ?? 'Active'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Created</div>
                      <div className="font-medium">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        ) : null
      )}
    </div>
  );
}
