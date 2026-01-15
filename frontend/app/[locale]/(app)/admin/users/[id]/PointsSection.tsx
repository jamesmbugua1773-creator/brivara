"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function PointsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const t = useTranslations('adminUser');
  const buttons = useTranslations('buttons');

  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPoints, setNewPoints] = useState({ points: "", sourceUserId: "", level: 1 });
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/points?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(t('pointsNotFound'));
        const arr = await r.json();
        setPoints(arr);
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailedPoints')))
      .finally(() => setLoading(false));
  }, [userId, jwt, base, adding, t]);

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${base}/admin/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ ...newPoints, userId }),
      });
      if (!res.ok) throw new Error(t('addFailed'));
      setNewPoints({ points: "", sourceUserId: "", level: 1 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${base}/admin/points/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      setPoints(points.filter(p => p.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div>{t('loadingPoints')}</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = points.filter(p =>
    !search ||
    p.id.includes(search) ||
    (p.sourceUserId && p.sourceUserId.includes(search)) ||
    (p.points && String(p.points).includes(search))
  );
  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        {t('pointsLedgerTitle')}
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder={t('pointsSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              placeholder={t('pointsPlaceholder')}
              value={newPoints.points}
              onChange={e => setNewPoints({ ...newPoints, points: e.target.value })}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              placeholder={t('sourceUserIdPlaceholder')}
              value={newPoints.sourceUserId}
              onChange={e => setNewPoints({ ...newPoints, sourceUserId: e.target.value })}
            />
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
              type="number"
              placeholder={t('levelPlaceholder')}
              value={newPoints.level}
              onChange={e => setNewPoints({ ...newPoints, level: Number(e.target.value) })}
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-3 py-1 rounded bg-turquoise text-black font-semibold"
            >{adding ? t('adding') : t('addPoints', { action: buttons('add') })}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">{t('colId')}</th>
                  <th className="p-2">{t('colPoints')}</th>
                  <th className="p-2">{t('colSourceUser')}</th>
                  <th className="p-2">{t('colLevel')}</th>
                  <th className="p-2">{t('colTimestamp')}</th>
                  <th className="p-2">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-700">
                    <td className="p-2">{p.id}</td>
                    <td className="p-2">{p.points}</td>
                    <td className="p-2">{p.sourceUserId}</td>
                    <td className="p-2">{p.level}</td>
                    <td className="p-2">{p.timestamp ? new Date(p.timestamp).toLocaleString() : ""}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(p.id)}
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
