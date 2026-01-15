"use client";
import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type RebateSummary = {
  totalRebatesEarned: number;
  totalPoints: number;
  pointsUsed: number;
  pointsForfeited?: number;
  remainingPoints: number;
  pointsUntilNextRebate: number;
  impliedAmount?: number;
  eligiblePayouts?: number;
  eligibleAmount?: number;
  computedPaidByThreshold?: number;
  computedUnpaidByThreshold?: number;
  // withdrawable fields removed per request
};

type RebateEntry = {
  id: string;
  userId: string;
  sourceUserId: string;
  level: number;
  pointsUsed: number;
  amount: number;
  timestamp: string;
  txId: string;
};

type PointsEntry = {
  id: string;
  userId: string;
  sourceUserId: string;
  level: number;
  points: number;
  timestamp: string;
  txId: string;
};

export default function RebatesPage() {
  const locale = useLocale();
  const t = useTranslations('rebates');

  const [summary, setSummary] = useState<RebateSummary | null>(null);
  const [history, setHistory] = useState<RebateEntry[]>([]);
  const [points, setPoints] = useState<PointsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    Promise.all([
      fetch(`${base}/earnings/rebates/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/earnings/rebates/history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/earnings/points/ledger`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([s, h, p]) => {
        if (!s.ok) throw new Error(t('loadFailed'));
        if (!h.ok) throw new Error(t('loadFailed'));
        if (!p.ok) throw new Error(t('loadFailed'));
        const sum = (await s.json()) as RebateSummary;
        const hist = (await h.json()) as RebateEntry[];
        const pts = (await p.json()) as PointsEntry[];
        setSummary(sum);
        setHistory(hist);
        setPoints(pts);
        setError(null);
      })
        .catch((e) => setError(e.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

      if (loading) return <div className="p-6">{t('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);
  const num = (n: number) => (n || 0).toLocaleString();
  const implied = summary?.impliedAmount || 0;
  const paid = (summary?.computedPaidByThreshold ?? summary?.totalRebatesEarned) || 0;
  const remainingPoints = summary?.remainingPoints || 0; // points toward next threshold
  const untilNext = summary?.pointsUntilNextRebate || 0;
  // withdrawable removed per request

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Requested metrics only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label={t('totalPointsEarned')} value={num(summary?.totalPoints ?? 0)} />
        <Stat label={t('totalRebatesEarned')} value={fmt(summary?.totalRebatesEarned ?? 0)} />
        <Stat label={t('pointsUntilNextRebate')} value={num(summary?.pointsUntilNextRebate ?? 0)} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">{t('progressTitle')}</div>
          <div className="text-gray-300">{t('progressValue', { points: num(remainingPoints) })}</div>
        </div>
        <div className="mt-2 text-xs text-gray-400">{t('untilNext', { points: num(untilNext) })}</div>
        <div className="mt-2 bg-slate-800 rounded-full h-2">
          <div 
            className="bg-turquoise h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(100, (remainingPoints / 500) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* History removed per request to keep page minimal */}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}

function Row({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-5 gap-2 text-sm border rounded-md p-2">
      {cols.map((c, i) => (
        <div key={i} className="truncate">{c}</div>
      ))}
    </div>
  );
}
