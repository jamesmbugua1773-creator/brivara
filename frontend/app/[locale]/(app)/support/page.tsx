"use client";
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
};

export default function SupportPage() {
  const locale = useLocale();
  const common = useTranslations('common');
  const t = useTranslations('support');

  const [jwt, setJwt] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('GENERAL');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : '';

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brivara_jwt') : null;
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    setJwt(token);
  }, [locale]);

  useEffect(() => {
    if (!jwt) return;
    setLoading(true);
    fetch(`${base}/support/tickets`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(t('loadFailedTickets'));
        const json = await r.json();
        setTickets(json);
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailedTickets')))
      .finally(() => setLoading(false));
  }, [jwt, base, t]);

  const submit = async () => {
    if (!jwt) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${base}/support/tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ category, subject, message })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || t('submitFailed'));
      setSubject(''); setMessage('');
      setTickets((prev) => [j, ...prev]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-gray-400">{t('subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-md p-4 md:col-span-1">
          <label className="text-xs text-gray-400">{t('category')}</label>
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3">
            <option value="DEPOSIT">{t('deposit')}</option>
            <option value="GENERAL">{t('general')}</option>
          </select>
          <label className="text-xs text-gray-400">{t('subject')}</label>
          <input value={subject} onChange={(e)=>setSubject(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3" />
          <label className="text-xs text-gray-400">{t('message')}</label>
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-4" rows={5} />
          <button onClick={submit} disabled={loading || !subject || !message} className="px-4 py-2 rounded bg-turquoise text-black font-semibold">
            {loading ? t('submitting') : t('submitTicket')}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-medium mb-3">{t('myTickets')}</h2>
          {loading ? (
            <div className="text-sm text-gray-400">{common('loading')}</div>
          ) : tickets.length === 0 ? (
            <div className="text-sm text-gray-400">{t('noTickets')}</div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm border rounded-md p-3">
                  <div>
                    <div className="text-xs text-gray-500">{t('category')}</div>
                    <div className="font-medium">{ticket.category}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500">{t('subject')}</div>
                    <div className="font-medium">{ticket.subject}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('status')}</div>
                    <div className="font-medium">{ticket.status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('created')}</div>
                    <div className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="md:col-span-5">
                    <div className="text-xs text-gray-500">{t('message')}</div>
                    <div>{ticket.message}</div>
                  </div>
                  {ticket.adminReply && (
                    <div className="md:col-span-5">
                      <div className="text-xs text-gray-500">{t('adminReply')}</div>
                      <div className="text-green-300">{ticket.adminReply}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
