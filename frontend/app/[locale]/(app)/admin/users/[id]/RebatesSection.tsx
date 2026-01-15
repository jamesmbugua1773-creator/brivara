"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function RebatesSection({ userId, jwt }: { userId: string, jwt: string }) {
  const t = useTranslations('adminUser');
  const buttons = useTranslations('buttons');

  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [rebates, setRebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRebate, setNewRebate] = useState({ pointsUsed: "", amount: "", sourceUserId: "", level: 1 });
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/rebates?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(t('rebatesNotFound'));
        const arr = await r.json();
        setRebates(arr);
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailedRebates')))
      .finally(() => setLoading(false));
  }, [userId, jwt, base, adding, t]);

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${base}/admin/rebates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ ...newRebate, userId }),
      });
      if (!res.ok) throw new Error(t('addFailed'));
      setNewRebate({ pointsUsed: "", amount: "", sourceUserId: "", level: 1 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${base}/admin/rebates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      setRebates(rebates.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div>{t('loadingRebates')}</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = rebates.filter(r =>
    !search ||
    r.id.includes(search) ||
    (r.sourceUserId && r.sourceUserId.includes(search)) ||
    (r.pointsUsed && String(r.pointsUsed).includes(search))
  );
  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        {t('rebatesLedgerTitle')}
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder={t('rebatesSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              placeholder={t('pointsUsedPlaceholder')}
              value={newRebate.pointsUsed}
              onChange={e => setNewRebate({ ...newRebate, pointsUsed: e.target.value })}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              placeholder={t('amountPlaceholder')}
              value={newRebate.amount}
              onChange={e => setNewRebate({ ...newRebate, amount: e.target.value })}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              placeholder={t('sourceUserIdPlaceholder')}
              value={newRebate.sourceUserId}
              onChange={e => setNewRebate({ ...newRebate, sourceUserId: e.target.value })}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              type="number"
              placeholder={t('levelPlaceholder')}
              value={newRebate.level}
              onChange={e => setNewRebate({ ...newRebate, level: Number(e.target.value) })}
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-3 py-1 rounded bg-turquoise text-black font-semibold"
            >{adding ? t('adding') : t('addRebate', { action: buttons('add') })}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">{t('colId')}</th>
                  <th className="p-2">{t('colPointsUsed')}</th>
                  <th className="p-2">{t('colAmount')}</th>
                  <th className="p-2">{t('colSourceUser')}</th>
                  <th className="p-2">{t('colLevel')}</th>
                  <th className="p-2">{t('colTimestamp')}</th>
                  <th className="p-2">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-slate-700">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2">{r.pointsUsed}</td>
                    <td className="p-2">{r.amount}</td>
                    <td className="p-2">{r.sourceUserId}</td>
                    <td className="p-2">{r.level}</td>
                    <td className="p-2">{r.timestamp ? new Date(r.timestamp).toLocaleString() : ""}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2 py-1 rounded bg-red-700 text-white border border-red-600 text-xs"
                      >{buttons('delete')}</button>
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
