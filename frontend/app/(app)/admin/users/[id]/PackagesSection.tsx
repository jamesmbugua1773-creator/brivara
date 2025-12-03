"use client";
import React, { useEffect, useState } from "react";

export default function PackagesSection({ userId, jwt }: { userId: string, jwt: string }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/packages?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Packages not found");
        const arr = await r.json();
        setPackages(arr);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load packages"))
      .finally(() => setLoading(false));
  }, [userId, jwt, base]);

  const filtered = packages.filter(p =>
    !search ||
    p.packageName.includes(search) ||
    (p.amount && p.amount.toString().includes(search))
  );

  // Add Package form state
  const [showAdd, setShowAdd] = useState(false);
  const [newPackage, setNewPackage] = useState({ packageName: '', });
  const [adding, setAdding] = useState(false);

  const handleDelete = async (id: string) => {
    if (!jwt) return;
    if (!confirm('Delete this package activation?')) return;
    try {
      await fetch(`${base}/admin/packages/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setPackages(packages.filter(p => p.id !== id));
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleAdd = async () => {
    if (!jwt || !userId || !newPackage.packageName) return;
    setAdding(true);
    try {
      const res = await fetch(`${base}/admin/packages/admin-activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ userId, packageName: newPackage.packageName }),
      });
      if (!res.ok) throw new Error('Add failed');
      const entry = await res.json();
      setPackages([entry, ...packages]);
      setShowAdd(false);
      setNewPackage({ packageName: '' });
    } catch (e) {
      alert('Add failed');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        Packages
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder="Search by package, amount"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="px-2 py-1 rounded bg-blue-700 text-white text-xs" onClick={() => setShowAdd(s => !s)}>
              {showAdd ? 'Cancel' : 'Add Package'}
            </button>
          </div>
          {showAdd && (
            <div className="mb-2 flex gap-2 items-center">
              <select className="px-2 py-1 rounded bg-slate-800 border border-slate-700" value={newPackage.packageName} onChange={e => setNewPackage(n => ({ ...n, packageName: e.target.value }))}>
                <option value="">Package</option>
                {['P1','P2','P3','P4','P5','P6','P7','P8','P9'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button className="px-2 py-1 rounded bg-turquoise text-black text-xs" onClick={handleAdd} disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
            </div>
          )}
          {loading ? (
            <div>Loading packages…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="p-2">Package</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Activated At</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-slate-700">
                      <td className="p-2">{p.packageName}</td>
                      <td className="p-2">{p.amount}</td>
                      <td className="p-2">{p.activatedAt ? new Date(p.activatedAt).toLocaleString() : ""}</td>
                      <td className="p-2">
                        <button className="px-2 py-1 rounded bg-red-700 text-white text-xs" onClick={() => handleDelete(p.id)}>Delete</button>
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
