"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

type User = { id: string; email: string; username: string; role?: string; created_at?: string; status?: string };

export default function AdminPage() {
  const locale = useLocale();
  const common = useTranslations('common');
  const t = useTranslations('admin');

  const [jwt, setJwt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : '';

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brivara_jwt') : null;
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    setJwt(token);
  }, [locale]);

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
          setError(t('notAuthorized'));
          return;
        }
        const u = await fetch(`${base}/admin/users`, { headers });
        if (!u.ok) throw new Error(`Users HTTP ${u.status}`);
        const usersJson = await u.json();
        setUsers(usersJson || []);
        setError(null);
        setLoading(false);
      })
        .catch((e) => { setError(e.message || t('loadFailed')); setLoading(false); });
  }, [jwt, base, locale]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Link href={`/${locale}/dashboard`} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">{t('switchToUserDashboard')}</Link>
      </div>
      {role !== 'ADMIN' && !loading && (
        <div className="text-sm text-yellow-400">{t('notAuthorizedView')}</div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-sm text-gray-400">{common('loading')}</div>
      ) : (
        role === 'ADMIN' ? (
        <div>
          <h2 className="text-xl font-medium mb-3">{t('allUsers')}</h2>
          {users.length === 0 ? (
            <div className="text-sm text-gray-400">{t('noUsers')}</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Link key={u.id} href={`/${locale}/admin/users/${u.id}`} className="block border rounded-md p-3 hover:bg-slate-800 transition">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">{t('email')}</div>
                      <div className="font-medium">{u.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t('username')}</div>
                      <div className="font-medium">{u.username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t('role')}</div>
                      <div className="font-medium">{u.role ?? 'USER'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t('status')}</div>
                      <div className="font-medium">{u.status ?? 'Active'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t('created')}</div>
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
