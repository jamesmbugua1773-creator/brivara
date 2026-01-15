"use client";
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Withdrawal = { amount: number; fee: number; network: string; txId: string; status: string; timestamp?: string };

export default function WithdrawPage() {
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const t = useTranslations('withdraw');
  const buttons = useTranslations('buttons');

  const [balance, setBalance] = useState<number>(0);
  const [bep20, setBep20] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<'REBATE'|'REFERRAL'|'AWARDS'>('REBATE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<Withdrawal[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('brivara_jwt');
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
    setLoading(true);
    Promise.all([
      fetch(`${base}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/profile`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/wallet/withdrawal-history`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([sumRes, profRes, histRes]) => {
        if (!sumRes.ok || !profRes.ok || !histRes.ok) throw new Error(t('loadFailed'));
        const sum = await sumRes.json();
        const prof = await profRes.json();
        const hist = await histRes.json();
        setBalance(Number(sum?.availableBalance ?? 0));
        setBep20(prof?.withdraw_wallet_bep20 ?? null);
        setHistory(hist);
      })
      .catch((e) => setError(e?.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

  const request = async () => {
    setCreating(true); setMessage(null); setError(null);
    try {
      const token = localStorage.getItem('brivara_jwt');
      if (!token) throw new Error(t('unauthorized'));
      const amt = parseFloat(amount);
      if (!isFinite(amt) || amt <= 0) throw new Error(t('enterValidAmount'));
      if (!bep20) throw new Error(t('addBep20InProfile'));
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
      const res = await fetch(`${base}/wallet/withdrawal/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, network: 'BEP20', source })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('requestFailed'));
      setMessage(t('requestedMessage', { txId: json.txId, source, status: json.status }));
      setHistory((prev) => [json, ...prev]);
      setBalance((b) => Math.max(0, b - (json.amount + json.fee)));
    } catch (e: any) {
      setError(e?.message || t('withdrawalFailed'));
    } finally {
      setCreating(false);
    }
  };

  const feePercent = 5;
  const minWithdrawal = 10;
  const amtNum = parseFloat(amount);
  const fee = isFinite(amtNum) && amtNum > 0 ? (amtNum * feePercent) / 100 : 0;
  const total = isFinite(amtNum) && amtNum > 0 ? amtNum + fee : 0;
  const netReceive = isFinite(amtNum) && amtNum > 0 ? amtNum - fee : 0;

  if (loading) return <div className="p-6">{common('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{nav('withdraw')} (BEP20)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label={t('availableBalance')} value={`$${balance.toFixed(2)}`} />
        <Stat label={t('fee')} value={`${feePercent}%`} />
        <Stat label={t('minimum')} value={`$${minWithdrawal}`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('requestTitle')}</h2>
        {!bep20 && <div className="text-yellow-400 text-sm">{t('addBep20Notice')}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select label={t('source')} value={source} onChange={(v)=>setSource(v as any)} options={[{label:t('sourceRebate'),value:'REBATE'},{label:t('sourceReferral'),value:'REFERRAL'},{label:t('sourceAwards'),value:'AWARDS'}]} />
          <Input label={t('amountUsd')} value={amount} onChange={setAmount} />
          <div className="border rounded-md p-3 space-y-1">
            <div className="text-xs text-gray-500">{t('feeTotalReceive')}</div>
            <div className="text-sm">{t('feeLine', { amount: fee.toFixed(2) })}</div>
            <div className="text-sm">{t('totalDeductedLine', { amount: total.toFixed(2) })}</div>
            <div className="text-sm">{t('youReceiveLine', { amount: netReceive.toFixed(2) })}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">{t('payoutAddress')}</div>
            <div className="text-sm break-all">{bep20 ?? '—'}</div>
          </div>
        </div>
        <button onClick={request} disabled={creating || !bep20} className="px-4 py-2 rounded bg-turquoise text-slate-900 font-medium hover:opacity-90 disabled:opacity-50">
          {creating ? t('requesting') : t('requestButton')}
        </button>
        <p className="text-xs text-gray-400">{t('note24h')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('historyTitle')}</h2>
        {history.length === 0 ? (<div className="text-sm text-gray-400">{t('noWithdrawals')}</div>) : (
          <div className="space-y-2">
            {history.map((w) => (
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

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="border rounded-md p-3">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-turquoise" value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: {label:string; value:string}[] }) {
  return (
    <div className="border rounded-md p-3">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <select className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-turquoise" value={value} onChange={(e)=>onChange(e.target.value)}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function Row({ cols }: { cols: (string)[] }) {
  return (
    <div className="grid grid-cols-5 gap-2 text-sm border rounded-md p-2">
      {cols.map((c, i) => <div key={i} className="truncate">{c}</div>)}
    </div>
  );
}
