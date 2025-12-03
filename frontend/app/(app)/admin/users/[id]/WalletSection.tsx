"use client";
import React, { useEffect, useState } from "react";

export default function WalletSection({ userId, jwt }: { userId: string, jwt: string }) {
  const [open, setOpen] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/wallets/${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Wallet not found");
        const w = await r.json();
        setWallet(w);
        setEdit(w);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load wallet"))
      .finally(() => setLoading(false));
  }, [userId, jwt, base]);

  const handleChange = (field: string, value: any) => {
    setEdit((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userId || !jwt) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/admin/wallets/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setWallet(updated);
      setEdit(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        Wallet
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          {loading && <div>Loading wallet…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!wallet && <div className="text-gray-400">No wallet found.</div>}
          {wallet && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(edit).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <label className="block text-xs text-gray-400 mb-1">{key}</label>
                    <input
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700"
                      value={typeof value === 'string' || typeof value === 'number' ? value : (value ? JSON.stringify(value) : "")}
                      onChange={e => handleChange(key, e.target.value)}
                      disabled={key === "id" || key === "userId"}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded bg-turquoise text-black font-semibold mt-2"
              >{saving ? "Saving…" : "Save Wallet"}</button>
            </>
          )}
        </>
      )}
    </div>
  );
}
