"use client";
import React, { useEffect, useState } from "react";

type PackageItem = { code: string; amount: number };

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) { window.location.replace("/login"); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    fetch(`${base}/packages/list`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PackageItem[];
        setPackages(json);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load packages"))
      .finally(() => setLoading(false));
  }, []);

  const activate = async (pkgCode?: string) => {
    setActivating(true); setMessage(null); setError(null);
    try {
      const token = localStorage.getItem("brivara_jwt");
      if (!token) throw new Error("Unauthorized");
      const toActivate = pkgCode || selected;
      if (!toActivate) throw new Error("Please select a package");
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
      const res = await fetch(`${base}/packages/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageName: toActivate })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Activation failed');
      setMessage(`Activated ${toActivate} successfully.`);
    } catch (e: any) {
      setError(e.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  if (loading) return <div className="p-6">Loading packages…</div>;
  if (error) return (
    <div className="p-6">
      <div className="text-red-600 mb-2">{error}</div>
      <p className="text-sm text-gray-400">Tip: Ensure you have wallet balance before activating.</p>
    </div>
  );

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const sorted = [...packages].sort((a, b) => a.amount - b.amount);
  const popular = sorted[Math.floor(sorted.length / 2)]?.code;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invest Packages</h1>
          <p className="text-sm text-gray-400">Choose a plan and start earning towards a 300% cycle cap.</p>
        </div>
        {message && <div className="text-green-500 text-sm">{message}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((p) => {
          const isSelected = selected === p.code;
          const isPopular = p.code === popular;
          return (
            <div
              key={p.code}
              className={`relative overflow-hidden rounded-2xl border ${isSelected ? 'border-turquoise' : 'border-slate-800'} bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-2xl`}
            >
              {/* glow */}
              <div className="pointer-events-none absolute -inset-1 rounded-2xl opacity-20 blur-2xl" style={{background: 'radial-gradient(600px circle at 0% 0%, rgba(20,184,166,0.25), transparent 40%)'}} />
              {isPopular && (
                <div className="absolute right-3 top-3 rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                  Popular
                </div>
              )}
              <div className="relative p-6">
                <div className="text-sm tracking-wide text-gray-400">Package</div>
                <div className="mt-1 text-2xl font-semibold text-white">{p.code}</div>
                <div className="mt-4 text-4xl font-bold text-white">{fmt(p.amount)}</div>
                <div className="mt-1 text-xs text-gray-400">One-time activation • Instant start</div>

                <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
                  <Feature ok label="Up to 300% cycle cap" />
                  <Feature ok label="Daily ROI accrual" />
                  <Feature ok label="Rebates & referral earnings" />
                  <Feature ok label="Secure wallet & instant crediting" />
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setSelected(p.code)}
                    className={`px-4 py-2 rounded-md border ${isSelected ? 'border-turquoise text-turquoise' : 'border-slate-700 text-gray-200'} hover:border-turquoise hover:text-turquoise transition-colors`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                  <button
                    onClick={() => activate(p.code)}
                    disabled={activating}
                    className="px-4 py-2 rounded-md bg-turquoise text-slate-900 font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {activating ? 'Activating…' : `Activate ${p.code}`}
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-500">Requires sufficient wallet balance.</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-gray-400">
        Tip: Deposit funds in your Wallet first, then activate a package. Your earnings contribute towards a 300% cycle cap.
      </div>
    </div>
  );
}

function Feature({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1 inline-block h-2 w-2 rounded-full ${ok ? 'bg-turquoise' : 'bg-slate-600'}`} />
      <span className="text-white/90">{label}</span>
    </div>
  );
}
