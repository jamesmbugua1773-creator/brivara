"use client";
import React, { useEffect, useState } from 'react';

type Deposit = { amount: number; fee: number; network: string; txId: string; status: string; timestamp?: string };
type Withdrawal = { amount: number; fee: number; network: string; txId: string; status: string; timestamp?: string };
type ProfileMinimal = { deposit_wallet_trc20: string | null; deposit_wallet_bep20: string | null };

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [network, setNetwork] = useState<'SYSTEM' | 'TRC20' | 'BEP20'>('SYSTEM');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [accounts, setAccounts] = useState<ProfileMinimal>({ deposit_wallet_trc20: null, deposit_wallet_bep20: null });

  useEffect(() => {
    const token = localStorage.getItem('brivara_jwt');
    if (!token) { window.location.replace('/login'); return; }
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
    setLoading(true);
    Promise.all([
      fetch(`${base}/wallet/deposit-history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/wallet/withdrawal-history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/profile`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([depRes, wdRes, sumRes, profRes]) => {
        if (!depRes.ok || !wdRes.ok || !sumRes.ok || !profRes.ok) throw new Error('Failed to load wallet');
        const deps = await depRes.json();
        const wds = await wdRes.json();
        const sum = await sumRes.json();
        const prof = await profRes.json();
        setDeposits(deps);
        setWithdrawals(wds);
        setBalance(Number(sum?.availableBalance ?? 0));
        setAccounts({
          deposit_wallet_trc20: prof?.deposit_wallet_trc20 ?? null,
          deposit_wallet_bep20: prof?.deposit_wallet_bep20 ?? null,
        });
      })
      .catch((e) => setError(e.message || 'Failed to load wallet'))
      .finally(() => setLoading(false));
  }, []);

  const createDeposit = async () => {
    setCreating(true); setMessage(null); setError(null);
    try {
      const token = localStorage.getItem('brivara_jwt');
      if (!token) throw new Error('Unauthorized');
      const amt = parseFloat(amount);
      if (!isFinite(amt) || amt <= 0) throw new Error('Enter a valid amount');
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
      const res = await fetch(`${base}/wallet/create-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, network })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Deposit failed');
      setMessage(`Deposit ${json.txId} created. Status: ${json.status}.`);
      // Refresh lists
      setDeposits((prev) => [json, ...prev]);
    } catch (e: any) {
      setError(e.message || 'Deposit failed');
    } finally {
      setCreating(false);
    }
  };

  const feePercent = 1.5;
  const amtNum = parseFloat(amount);
  const fee = isFinite(amtNum) && amtNum > 0 ? (amtNum * feePercent) / 100 : 0;
  const gross = isFinite(amtNum) && amtNum > 0 ? amtNum + fee : 0; // charged amount
  const net = isFinite(amtNum) && amtNum > 0 ? amtNum : 0; // credited amount

  if (loading) return <div className="p-6">Loading wallet…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Available Balance" value={`$${balance.toFixed(2)}`} />
        <Stat label="Deposit Fee" value={`${feePercent}%`} />
        <Stat label="Network" value={network} />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Deposit Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Account label="TRC20 USDT" value={accounts.deposit_wallet_trc20} />
          <Account label="BEP20 USDT" value={accounts.deposit_wallet_bep20} />
        </div>
        <p className="text-xs text-gray-400">Send USDT to the corresponding network address or use SYSTEM for instant dev funding.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Deposit Funds</h2>
        {message && <div className="text-green-500 text-sm">{message}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Amount (USD)" value={amount} onChange={setAmount} />
          <Select label="Deposit Network" value={network} onChange={setNetwork} options={[{label:'SYSTEM',value:'SYSTEM'},{label:'TRC20',value:'TRC20'},{label:'BEP20',value:'BEP20'}]} />
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-500">Estimated Fee / Credit</div>
            <div className="text-sm">Fee: ${fee.toFixed(2)} • Wallet Credit: ${net.toFixed(2)} • You Pay: ${gross.toFixed(2)}</div>
          </div>
        </div>
        <button
          onClick={createDeposit}
          disabled={creating}
          className="px-4 py-2 rounded bg-turquoise text-slate-900 font-medium hover:opacity-90 disabled:opacity-50"
        >{creating ? 'Creating…' : 'Create Deposit'}</button>
        <p className="text-xs text-gray-400">Note: SYSTEM deposits simulate instant funding after a short delay.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Deposit History</h2>
        {deposits.length === 0 ? (<div className="text-sm text-gray-400">No deposits.</div>) : (
          <div className="space-y-2">
            {deposits.map((d) => (
              <Row key={d.txId} cols={[d.txId, `$${d.amount.toFixed(2)}`, `$${d.fee.toFixed(2)}`, d.network, d.status]} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Withdrawal History</h2>
        {withdrawals.length === 0 ? (<div className="text-sm text-gray-400">No withdrawals.</div>) : (
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

function Row({ cols }: { cols: (string)[] }) {
  return (
    <div className="grid grid-cols-5 gap-2 text-sm border rounded-md p-2">
      {cols.map((c, i) => <div key={i} className="truncate">{c}</div>)}
    </div>
  );
}

function Account({ label, value }: { label: string; value: string | null }) {
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
          >Copy</button>
        )}
      </div>
    </div>
  );
}
