"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function TicketsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const t = useTranslations('adminUser');

  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState<string>("");
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/tickets?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(t('loadFailedTickets'));
        const data = await r.json();
        setTickets(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || t('loadFailedTickets'));
        setLoading(false);
      });
  }, [userId, jwt, base, t]);
  if (loading) return <div>{t('loadingTickets')}</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = tickets.filter(t =>
    !search ||
    t.id.includes(search) ||
    (t.status && t.status.includes(search)) ||
    (t.subject && t.subject.includes(search))
  );

  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        {t('ticketsTitle')}
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder={t('ticketsSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">{t('colId')}</th>
                  <th className="p-2">{t('colCategory')}</th>
                  <th className="p-2">{t('colSubject')}</th>
                  <th className="p-2">{t('colMessage')}</th>
                  <th className="p-2">{t('colStatus')}</th>
                  <th className="p-2">{t('colAdminReply')}</th>
                  <th className="p-2">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-slate-700">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">{t.category}</td>
                    <td className="p-2">{t.subject}</td>
                    <td className="p-2">{t.message}</td>
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">{t.adminReply ?? ""}</td>
                    <td className="p-2">
                      {/* Add edit/delete/reply logic here if needed */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
