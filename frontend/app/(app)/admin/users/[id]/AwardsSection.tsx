"use client";
import React, { useEffect, useState } from "react";

export default function AwardsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/awards/history?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Awards not found");
        const arr = await r.json();
        setAwards(arr);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load awards"))
      .finally(() => setLoading(false));
  }, [userId, jwt, base]);

  const filtered = awards.filter(a =>
    !search ||
    a.awardName.includes(search) ||
    a.packageName.includes(search) ||
    (a.packageAmount && a.packageAmount.toString().includes(search))
  );

  // Add Award form state
  const [showAdd, setShowAdd] = useState(false);
  const [newAward, setNewAward] = useState({ awardName: '', packageName: '', packageAmount: '' });
  const [adding, setAdding] = useState(false);

  const handleDelete = async (id: string) => {
    if (!jwt) return;
    if (!confirm('Delete this award?')) return;
    try {
      await fetch(`${base}/admin/awards/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setAwards(awards.filter(a => a.id !== id));
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleAdd = async () => {
    if (!jwt || !userId) return;
    setAdding(true);
    try {
      const res = await fetch(`${base}/admin/awards/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ ...newAward, userId, packageAmount: Number(newAward.packageAmount) }),
      });
      if (!res.ok) throw new Error('Add failed');
      const entry = await res.json();
      setAwards([entry, ...awards]);
      setShowAdd(false);
      setNewAward({ awardName: '', packageName: '', packageAmount: '' });
    } catch (e) {
      alert('Add failed');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        Awards
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder="Search by award, package, amount"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="px-2 py-1 rounded bg-blue-700 text-white text-xs" onClick={() => setShowAdd(s => !s)}>
              {showAdd ? 'Cancel' : 'Add Award'}
            </button>
          </div>
          {showAdd && (
            <div className="mb-2 flex gap-2 items-center">
              <select className="px-2 py-1 rounded bg-slate-800 border border-slate-700" value={newAward.awardName} onChange={e => setNewAward(n => ({ ...n, awardName: e.target.value }))}>
                <option value="">Award</option>
                {['Star','Achiever','Leader','Emerald','Diamond','Director','Ambassador','Vice President','President','Royal'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="px-2 py-1 rounded bg-slate-800 border border-slate-700" value={newAward.packageName} onChange={e => setNewAward(n => ({ ...n, packageName: e.target.value }))}>
                <option value="">Package</option>
                {['P3','P5','P6','P7','P8','P9'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="px-2 py-1 rounded bg-slate-800 border border-slate-700" type="number" min="1" placeholder="Amount" value={newAward.packageAmount} onChange={e => setNewAward(n => ({ ...n, packageAmount: e.target.value }))} />
              <button className="px-2 py-1 rounded bg-turquoise text-black text-xs" onClick={handleAdd} disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
            </div>
          )}
          {loading ? (
            <div>Loading awards…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="p-2">Award</th>
                    <th className="p-2">Package</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className="border-b border-slate-700">
                      <td className="p-2">{a.awardName}</td>
                      <td className="p-2">{a.packageName}</td>
                      <td className="p-2">{a.packageAmount}</td>
                      <td className="p-2">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</td>
                      <td className="p-2">
                        <button className="px-2 py-1 rounded bg-red-700 text-white text-xs" onClick={() => handleDelete(a.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
