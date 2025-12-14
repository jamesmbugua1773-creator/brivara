"use client";
import React, { useEffect, useState } from "react";

type TreeLevel = { level: number; users: { id: string; username: string; phone?: string; type: 'direct' | 'indirect'; package?: { packageName: string; amount: number } | null }[] };

export default function ReferralsPage() {
  const [tree, setTree] = useState<TreeLevel[]>([]);
  const [refLink, setRefLink] = useState<{ code: string; url: string } | null>(null);
  const [analytics, setAnalytics] = useState<{
    totals: { totalDirectPoints: number; totalIndirectPoints: number; totalDirectBonus: number; totalIndirectBonus: number; totalReferralBonus: number };
    perReferral: Array<{ sourceUserId: string; username: string; package?: { packageName: string; amount: number } | null; directPoints: number; indirectPoints: number; directBonus: number; indirectBonus: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) { window.location.replace("/login"); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    Promise.all([
      fetch(`${base}/referrals/tree`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/referrals/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([treeRes, analyticsRes]) => {
        if (!treeRes.ok) throw new Error(`Tree HTTP ${treeRes.status}`);
        if (!analyticsRes.ok) throw new Error(`Analytics HTTP ${analyticsRes.status}`);
        const treeJson = await treeRes.json();
        const analyticsJson = await analyticsRes.json();
        setTree((treeJson?.levels ?? []) as TreeLevel[]);
        setAnalytics(analyticsJson);
        // Fetch referral link non-blocking; ignore errors
        try {
          const linkRes = await fetch(`${base}/referrals/link`, { headers: { Authorization: `Bearer ${token}` } });
          if (linkRes.ok) setRefLink(await linkRes.json());
        } catch {}
      })
      .catch((e) => setError(e.message || "Failed to load referrals"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading referrals…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Referrals</h1>

      {/* Shareable referral link */}
      {refLink && (
        <div className="border rounded-md p-3 bg-slate-900/60">
          <div className="text-sm text-gray-400">Your Referral Link</div>
          <div className="mt-1 flex items-center gap-2">
            <input readOnly value={refLink.url} className="flex-1 bg-transparent border border-slate-800 rounded px-2 py-1 text-sm" />
            <button
              onClick={() => { navigator.clipboard.writeText(refLink.url); }}
              className="px-3 py-1 rounded bg-turquoise text-black text-sm font-semibold"
            >Copy</button>
          </div>
          <div className="text-xs text-gray-500 mt-1">Code: {refLink.code}</div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-medium mb-3">Your Downline</h2>
        {tree.length === 0 ? (
          <div className="text-sm text-gray-400">No referrals yet.</div>
        ) : (
          <div className="space-y-4">
            {tree.map((lvl) => (
              <div key={lvl.level}>
                <div className="text-sm mb-2">Level {lvl.level}</div>
                {lvl.users.length === 0 ? (
                  <div className="text-xs text-gray-500">No users at this level.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {lvl.users.map((u) => (
                      <div key={u.id} className="border rounded-md p-3 text-sm bg-slate-900/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{u.username}</div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            u.type === 'direct' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {u.type === 'direct' ? 'Direct' : 'Indirect'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Phone: {u.phone || '—'}</div>
                          <div>Package: {u.package ? `${u.package.packageName} ($${Number(u.package.amount).toLocaleString()})` : '—'}</div>
                        </div>
                        {analytics && (
                          (() => {
                            const row = analytics.perReferral.find(r => r.sourceUserId === u.id);
                            return row ? (
                              <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <div>Direct Points: {Math.round(row.directPoints).toLocaleString()}</div>
                                <div>Indirect Points: {Math.round(row.indirectPoints).toLocaleString()}</div>
                                <div>Direct Bonus: ${row.directBonus.toFixed(2)}</div>
                                <div>Indirect Bonus: ${row.indirectBonus.toFixed(2)}</div>
                              </div>
                            ) : null;
                          })()
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Referral Totals</h2>
        {!analytics ? (
          <div className="text-sm text-gray-400">No analytics available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">Total Referral Bonus</div>
              <div className="text-2xl font-semibold">${analytics.totals.totalReferralBonus.toFixed(2)}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">Direct Bonus</div>
              <div className="text-lg">${analytics.totals.totalDirectBonus.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-2">Indirect Bonus</div>
              <div className="text-lg">${analytics.totals.totalIndirectBonus.toFixed(2)}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">Direct Points</div>
              <div className="text-lg">{Math.round(analytics.totals.totalDirectPoints).toLocaleString()}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">Indirect Points</div>
              <div className="text-lg">{Math.round(analytics.totals.totalIndirectPoints).toLocaleString()}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
