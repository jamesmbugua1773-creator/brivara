"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function WithdrawalsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const t = useTranslations('adminUser');
  const buttons = useTranslations('buttons');

  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/withdrawals?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(t('withdrawalsNotFound'));
        const arr = await r.json();
        setWithdrawals(arr);
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailedWithdrawals')))
      .finally(() => setLoading(false));
  }, [userId, jwt, base, editingId, t]);

  const handleEdit = (w: any) => {
    setEditingId(w.id);
    setEdit(w);
  };

  const handleSave = async () => {
    if (!editingId || !jwt) return;
    try {
      const res = await fetch(`${base}/admin/withdrawals/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error(t('updateFailed'));
      setEditingId(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${base}/admin/withdrawals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      setWithdrawals(withdrawals.filter(w => w.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div>{t('loadingWithdrawals')}</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = withdrawals.filter(w =>
    !search ||
    w.id.includes(search) ||
    (w.status && w.status.includes(search)) ||
    (w.network && w.network.includes(search))
  );
  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        {t('withdrawalsTitle')}
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder={t('withdrawalsSearchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">{t('colId')}</th>
                  <th className="p-2">{t('colAmount')}</th>
                  <th className="p-2">{t('colFee')}</th>
                  <th className="p-2">{t('colNetwork')}</th>
                  <th className="p-2">{t('colStatus')}</th>
                  <th className="p-2">{t('colTimestamp')}</th>
                  <th className="p-2">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="border-b border-slate-700">
                    <td className="p-2">{w.id}</td>
                    <td className="p-2">{w.amount}</td>
                    <td className="p-2">{w.fee}</td>
                    <td className="p-2">{w.network}</td>
                    <td className="p-2">{w.status}</td>
                    <td className="p-2">{w.timestamp ? new Date(w.timestamp).toLocaleString() : ""}</td>
                    <td className="p-2">
                      {editingId === w.id ? (
                        <>
                          <input
                            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
                            value={edit.status}
                            onChange={e => setEdit({ ...edit, status: e.target.value })}
                          />
                          <button
                            onClick={handleSave}
                            className="px-2 py-1 rounded bg-turquoise text-black font-semibold text-xs mr-2"
                          >{buttons('save')}</button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs"
                          >{buttons('cancel')}</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(w)}
                            className="px-2 py-1 rounded bg-blue-700 text-white border border-blue-600 text-xs mr-2"
                          >{buttons('edit')}</button>
                          <button
                            onClick={() => handleDelete(w.id)}
                            className="px-2 py-1 rounded bg-red-700 text-white border border-red-600 text-xs"
                          >{buttons('delete')}</button>
                        </>
                      )}
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
