"use client";
import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type TreeLevel = { level: number; users: { id: string; username: string; phone?: string; type: 'direct' | 'indirect'; package?: { packageName: string; amount: number } | null }[] };

export default function ReferralsPage() {
  const locale = useLocale();
  const t = useTranslations('referrals');
  const buttons = useTranslations('buttons');

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
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    Promise.all([
      fetch(`${base}/referrals/tree`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/referrals/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([treeRes, analyticsRes]) => {
        if (!treeRes.ok) throw new Error(t('loadFailed'));
        if (!analyticsRes.ok) throw new Error(t('loadFailed'));
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
        .catch((e) => setError(e.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

      if (loading) return <div className="p-6">{t('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {/* Shareable referral link */}
      {refLink && (
        <div className="border rounded-md p-3 bg-slate-900/60">
          <div className="text-sm text-gray-400">{t('yourReferralLink')}</div>
          <div className="mt-1 flex items-center gap-2">
            <input readOnly value={refLink.url} className="flex-1 bg-transparent border border-slate-800 rounded px-2 py-1 text-sm" />
            <button
              onClick={() => { navigator.clipboard.writeText(refLink.url); }}
              className="px-3 py-1 rounded bg-turquoise text-black text-sm font-semibold"
            >{buttons('copy')}</button>
          </div>
          <div className="text-xs text-gray-500 mt-1">{t('code')}: {refLink.code}</div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-medium mb-3">{t('yourDownline')}</h2>
        {tree.length === 0 ? (
          <div className="text-sm text-gray-400">{t('noReferralsYet')}</div>
        ) : (
          <div className="space-y-4">
            {tree.map((lvl) => (
              <div key={lvl.level}>
                <div className="text-sm mb-2">{t('level', { level: lvl.level })}</div>
                {lvl.users.length === 0 ? (
                  <div className="text-xs text-gray-500">{t('noUsersAtLevel')}</div>
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
                            {u.type === 'direct' ? t('direct') : t('indirect')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>{t('phone')}: {u.phone || '—'}</div>
                          <div>{t('package')}: {u.package ? `${u.package.packageName} ($${Number(u.package.amount).toLocaleString()})` : '—'}</div>
                        </div>
                        {analytics && (
                          (() => {
                            const row = analytics.perReferral.find(r => r.sourceUserId === u.id);
                            return row ? (
                              <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <div>{t('directPoints')}: {Math.round(row.directPoints).toLocaleString()}</div>
                                <div>{t('indirectPoints')}: {Math.round(row.indirectPoints).toLocaleString()}</div>
                                <div>{t('directBonus')}: ${row.directBonus.toFixed(2)}</div>
                                <div>{t('indirectBonus')}: ${row.indirectBonus.toFixed(2)}</div>
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
        <h2 className="text-xl font-medium mb-3">{t('referralTotals')}</h2>
        {!analytics ? (
          <div className="text-sm text-gray-400">{t('noAnalytics')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">{t('totalReferralBonus')}</div>
              <div className="text-2xl font-semibold">${analytics.totals.totalReferralBonus.toFixed(2)}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">{t('directBonus')}</div>
              <div className="text-lg">${analytics.totals.totalDirectBonus.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-2">{t('indirectBonus')}</div>
              <div className="text-lg">${analytics.totals.totalIndirectBonus.toFixed(2)}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">{t('directPoints')}</div>
              <div className="text-lg">{Math.round(analytics.totals.totalDirectPoints).toLocaleString()}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-gray-500">{t('indirectPoints')}</div>
              <div className="text-lg">{Math.round(analytics.totals.totalIndirectPoints).toLocaleString()}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
