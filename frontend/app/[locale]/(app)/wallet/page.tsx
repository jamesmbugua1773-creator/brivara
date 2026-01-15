"use client";
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Withdrawal = { amount: number; fee: number; network: string; txId: string; status: string; timestamp?: string };

export default function WalletPage() {
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const t = useTranslations('wallet');

  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [fundingStatus, setFundingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('brivara_jwt');
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
    setLoading(true);
    Promise.all([
      fetch(`${base}/wallet/withdrawal-history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/funding/funding-status`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([wdRes, sumRes, fundRes]) => {
        if (!wdRes.ok || !sumRes.ok) throw new Error(t('loadFailed'));
        const wds = await wdRes.json();
        const sum = await sumRes.json();
        const fund = fundRes.ok ? await fundRes.json() : { hasFunding: false };
        setWithdrawals(wds);
        setBalance(Number(sum?.availableBalance ?? 0));
        setFundingStatus(fund);
      })
      .catch((e) => setError(e?.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

  if (loading) return <div className="p-6">{common('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{nav('wallet')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label={t('availableBalance')} value={`$${balance.toFixed(2)}`} />
        {fundingStatus?.hasFunding && (
          <>
            <Stat label={t('fundedAmount')} value={`$${fundingStatus.funding.amount.toFixed(2)}`} />
            <Stat label={t('fundingProgress')} value={`${fundingStatus.funding.progress?.toFixed(1)}%`} />
          </>
        )}
      </div>

      {fundingStatus?.hasFunding && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">{t('fundingStatusTitle')}</h2>
          <div className="border rounded-md p-4 bg-slate-800/50">
            <div className="text-sm text-gray-400 mb-2">
              {fundingStatus.funding.canWithdraw
                ? t('canWithdrawFunding')
                : t('mustEarnMore', { amount: `$${(fundingStatus.funding.requiredReturn - fundingStatus.funding.totalEarned).toFixed(2)}` })
              }
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(fundingStatus.funding.progress || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('withdrawalHistoryTitle')}</h2>
        {withdrawals.length === 0 ? (<div className="text-sm text-gray-400">{t('noWithdrawals')}</div>) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <Row key={w.txId} cols={[w.txId, `$${w.amount.toFixed(2)}`, `$${w.fee.toFixed(2)}`, w.network, w.status]} />
            ))}
          </div>
        )}
      </section>
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
    <div className="grid grid-cols-5 gap-2 p-2 border rounded-md bg-slate-800/50">
      {cols.map((col, i) => (
        <div key={i} className="text-sm truncate">{col}</div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="border rounded-md p-3">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-turquoise" value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: any) => void; options: {label:string,value:string}[] }) {
  return (
    <div className="border rounded-md p-3">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <select className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-turquoise" value={value} onChange={(e)=>onChange(e.target.value)}>
        {options.map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Account({ label, value }: { label: string; value: string | null }) {
  const buttons = useTranslations('buttons');
  const maskedValue = value ? `${value.slice(0, 6)}...${value.slice(-4)}` : null;
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm flex items-center justify-between gap-2">
        <span className="truncate">{maskedValue ?? '—'}</span>
        {value && (
          <button
            className="px-2 py-1 text-xs rounded border border-slate-700 hover:border-turquoise"
            onClick={() => { navigator.clipboard.writeText(value); }}
          >{buttons('copy')}</button>
        )}
      </div>
    </div>
  );
}
