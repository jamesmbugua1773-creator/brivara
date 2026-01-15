"use client";
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Funding = { id: string; amount: number; totalEarned: number; requiredReturn: number; status: string; fundedAt: string; canWithdraw?: boolean; progress?: number };

export default function FundingPage() {
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const t = useTranslations('funding');

  const [fundingHistory, setFundingHistory] = useState<Funding[]>([]);
  const [currentFunding, setCurrentFunding] = useState<any>(null);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('brivara_jwt');
    if (!token) { window.location.replace(`/${locale}/login`); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
    setLoading(true);
    Promise.all([
      fetch(`${base}/funding/funding-history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/funding/funding-status`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([historyRes, statusRes]) => {
        if (!historyRes.ok || !statusRes.ok) throw new Error(t('loadFailed'));
        const history = await historyRes.json();
        const status = await statusRes.json();
        setFundingHistory(history);
        setCurrentFunding(status.hasFunding ? status.funding : null);
      })
      .catch((e) => setError(e?.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

  const requestFunding = async () => {
    setRequesting(true); setMessage(null); setError(null);
    try {
      const token = localStorage.getItem('brivara_jwt');
      if (!token) throw new Error(t('unauthorized'));
      const amt = parseFloat(amount);
      if (!isFinite(amt) || amt <= 0) throw new Error(t('enterValidAmount'));
      if (amt < 25) throw new Error(t('minAmount', { amount: '$25' }));
      if (amt > 250) throw new Error(t('maxAmount', { amount: '$250' }));
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
      const res = await fetch(`${base}/funding/request-funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('requestFailed'));
      setMessage(json.message);
      // Refresh data
      setAmount('');
      // Reload the page data
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || t('requestFailed'));
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="p-6">{common('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{nav('funding')}</h1>

      {currentFunding && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">{t('currentStatusTitle')}</h2>
          <div className="border rounded-md p-4 bg-slate-800/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500">{t('fundedAmount')}</div>
                <div className="text-lg font-medium text-green-400">${currentFunding.amount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('totalEarned')}</div>
                <div className="text-lg font-medium text-blue-400">${currentFunding.totalEarned.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('requiredReturn')}</div>
                <div className="text-lg font-medium text-yellow-400">${currentFunding.requiredReturn.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('progress')}</div>
                <div className="text-lg font-medium">{currentFunding.progress?.toFixed(1)}%</div>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(currentFunding.progress || 0, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-400">
              {currentFunding.canWithdraw
                ? t('canWithdrawNow')
                : t('earnMoreToUnlock', { amount: `$${(currentFunding.requiredReturn - currentFunding.totalEarned).toFixed(2)}` })
              }
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('requestTitle')}</h2>
        {message && <div className="text-green-500 text-sm">{message}</div>}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="border rounded-md p-4 bg-slate-800/50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('amountLabel')}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-slate-700 border-slate-600 text-white"
                placeholder={t('amountPlaceholder', { min: '$25', max: '$250' })}
                step="0.01"
                min="25"
                max="250"
              />
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• {t('info1')}</p>
              <p>• {t('info2')}</p>
              <p>• {t('info3')}</p>
            </div>
            <button
              onClick={requestFunding}
              disabled={requesting || currentFunding}
              className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requesting ? t('requesting') : currentFunding ? t('activeFunding') : t('requestButton')}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('historyTitle')}</h2>
        {fundingHistory.length === 0 ? (<div className="text-sm text-gray-400">{t('noHistory')}</div>) : (
          <div className="space-y-2">
            {fundingHistory.map((f) => (
              <div key={f.id} className="border rounded-md p-4 bg-slate-800/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">{t('amountCol')}</div>
                    <div className="text-sm font-medium">${f.amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('earnedCol')}</div>
                    <div className="text-sm font-medium">${f.totalEarned.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('requiredCol')}</div>
                    <div className="text-sm font-medium">${f.requiredReturn.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('statusCol')}</div>
                    <div className={`text-sm font-medium ${
                      f.status === 'Active' ? 'text-green-400' :
                      f.status === 'Repaid' ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {f.status === 'Active' ? t('statusActive') : f.status === 'Repaid' ? t('statusRepaid') : f.status === 'Pending' ? t('statusPending') : f.status}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {t('fundedOn')}: {new Date(f.fundedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Account({ label, value }: { label: string; value: string | null }) {
  const common = useTranslations('common');
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-mono break-all">{value || common('notAvailable')}</div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-md bg-slate-800 border-slate-700 text-white"
        placeholder="0.00"
        step="0.01"
        min="0"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-md bg-slate-800 border-slate-700 text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
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