"use client";
import React, { useEffect, useState } from "react";

export default function DepositsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/deposits?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Deposits not found");
        const arr = await r.json();
        setDeposits(arr);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load deposits"))
      .finally(() => setLoading(false));
  }, [userId, jwt, base, editingId]);

  const handleEdit = (d: any) => {
    setEditingId(d.id);
    setEdit(d);
  };

  const handleSave = async () => {
    if (!editingId || !jwt) return;
    try {
      const res = await fetch(`${base}/admin/deposits/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error("Update failed");
      setEditingId(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${base}/admin/deposits/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeposits(deposits.filter(d => d.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div>Loading deposits…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = deposits.filter(d =>
    !search ||
    d.id.includes(search) ||
    (d.status && d.status.includes(search)) ||
    (d.network && d.network.includes(search))
  );
  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        Deposits
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder="Search by ID, status, network"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">ID</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Network</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-slate-700">
                    <td className="p-2">{d.id}</td>
                    <td className="p-2">{d.amount}</td>
                    <td className="p-2">{d.network}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2">{d.timestamp ? new Date(d.timestamp).toLocaleString() : ""}</td>
                    <td className="p-2">
                      {editingId === d.id ? (
                        <>
                          <input
                            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 mr-2"
                            value={edit.status}
                            onChange={e => setEdit({ ...edit, status: e.target.value })}
                          />
                          <button
                            onClick={handleSave}
                            className="px-2 py-1 rounded bg-turquoise text-black font-semibold text-xs mr-2"
                          >Save</button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs"
                          >Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(d)}
                            className="px-2 py-1 rounded bg-blue-700 text-white border border-blue-600 text-xs mr-2"
                          >Edit</button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="px-2 py-1 rounded bg-red-700 text-white border border-red-600 text-xs"
                          >Delete</button>
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
