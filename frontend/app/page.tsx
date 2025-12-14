'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, Wallet, ArrowDownCircle, Gift, Trophy, Users, 
  DollarSign, TrendingUp, LogOut, Menu, X, Package, 
  BarChart3, Award, UserCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiGet } from './lib/api';
import { saveToken, loadToken, clearToken } from './lib/auth';

const TURQUOISE = '#1ABCBC';

interface DashboardData {
  availableBalance: number;
  totalEarnings: number;
  currentPackage: { name: string; amount: number; activatedAt: string; dailyRoi: string };
  totalPoints: number;
  rebateBonus: number;
  progress300: { percentage: number; earned: number; target: number };
  awards: { total: number; currentLevel: string };
  todayRoi: number;
  roi7d: Array<{ date: string; amount: number }>;
  roiRecent: Array<{ amount: number; timestamp: string }>;
  roiAll: Array<{ amount: number; timestamp: string }>;
}

import dynamic from 'next/dynamic';
const HealthBadge = dynamic(() => import('./components/HealthBadge'), { ssr: false });

const fmt = (ts: any) => {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts ?? '');
    return format(d, 'yyyy-MM-dd HH:mm');
  } catch {
    return String(ts ?? '');
  }
};

export default function BrivaraCapital() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(loadToken());
  const [packages, setPackages] = useState<Array<{ code: string; amount: number }>>([]);
  const [referralLink, setReferralLink] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositPkg, setDepositPkg] = useState<{ code: string; amount: number } | null>(null);
  const [depositNetwork, setDepositNetwork] = useState<'TRC20'|'BEP20'>('TRC20');
  const [depositTxId, setDepositTxId] = useState('');
  const [depositAutoActivate, setDepositAutoActivate] = useState(true);
  const [depositNotice, setDepositNotice] = useState<{ amount: number; fee: number; net: number; status: string; txId: string } | null>(null);
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiStart, setRoiStart] = useState<string>('');
  const [roiEnd, setRoiEnd] = useState<string>('');
  const [roiPage, setRoiPage] = useState<number>(1);
  const roiPageSize = 10;
  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';

  useEffect(() => {
    // If already authenticated, ensure we are on the dashboard route
    if (typeof window !== 'undefined') {
      if (jwt && window.location.pathname === '/') {
        window.location.replace('/dashboard');
      }
    }
  }, [jwt]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!jwt) {
          setLoading(false);
          return;
        }
        const headers = { Authorization: `Bearer ${jwt}` } as const;
        const [summaryRes, progressRes, rebateSummaryRes, roiHistoryRes, referralRes] = await Promise.all([
          fetch(`${apiBase}/dashboard/summary`, { headers }),
          fetch(`${apiBase}/progress/300`, { headers }),
          fetch(`${apiBase}/earnings/rebates/summary`, { headers }),
          fetch(`${apiBase}/earnings/roi/history`, { headers }),
          fetch(`${apiBase}/referrals/link`, { headers }),
        ]);
        if (!summaryRes.ok) {
          const sBody = await summaryRes.text();
          throw new Error(`API error: summary ${summaryRes.status} ${summaryRes.statusText} -> ${sBody}`);
        }
        const summary = await summaryRes.json();
        let progress: any = { cap: 0, total: 0, percentage: 0 };
        let rebateSummary: any = { totalRebatesEarned: 0 };
        let roiHistory: any[] = [];
        if (progressRes.ok) {
          progress = await progressRes.json();
        } else {
          // Gracefully handle 404 No active package by using zeros
          progress = { cap: 0, total: 0, percentage: 0 };
        }
        if (rebateSummaryRes.ok) {
          rebateSummary = await rebateSummaryRes.json();
        }
        if (roiHistoryRes.ok) {
          roiHistory = await roiHistoryRes.json();
        }
        if (referralRes.ok) {
          setReferralLink(await referralRes.json());
        } else {
          console.error('Failed to fetch referral link:', referralRes.status, referralRes.statusText);
        }

        // Compute today's ROI and last 7 days series
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const grouped = new Map<string, number>();
        for (const r of (roiHistory || [])) {
          const d = new Date(r.timestamp);
          if (isNaN(d.getTime())) continue;
          const key = format(d, 'yyyy-MM-dd');
          grouped.set(key, Number((grouped.get(key) || 0) + Number(r.amount || 0)));
        }
        const todayRoi = Number(grouped.get(todayKey) || 0);
        const roi7d: Array<{ date: string; amount: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const dt = new Date();
          dt.setDate(dt.getDate() - i);
          const key = format(dt, 'yyyy-MM-dd');
          roi7d.push({ date: key.slice(5), amount: Number(grouped.get(key) || 0) });
        }
        const roiAll = Array.isArray(roiHistory) ? roiHistory.map((r:any) => ({ amount: Number(r.amount || 0), timestamp: String(r.timestamp) })) : [];
        const roiRecent = roiAll.slice(0, 10);

        const mapped: DashboardData = {
          availableBalance: Number(summary.availableBalance ?? 0),
          totalEarnings: Number(summary.totalEarnings ?? 0),
          currentPackage: summary.currentPackage
            ? { name: summary.currentPackage.packageName, amount: Number(summary.currentPackage.amount), activatedAt: summary.currentPackage.activatedAt, dailyRoi: '1.5%' }
            : { name: '—', amount: 0, activatedAt: '', dailyRoi: '1.5%' },
          totalPoints: Number(summary.totalPoints ?? 0),
          rebateBonus: Number(rebateSummary?.totalRebatesEarned ?? 0),
          progress300: {
            percentage: Number(progress?.percentage ?? 0),
            earned: Number(progress?.total ?? 0),
            target: Number(progress?.cap ?? 0),
          },
          awards: { total: 0, currentLevel: '—' },
          todayRoi,
          roi7d,
          roiRecent,
          roiAll,
        };
        setData(mapped);
      } catch (e: any) {
        console.error(e);
        setApiError(e?.message || 'API error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [jwt]);

  // Load package list for UI (public endpoint)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/packages/list`, { cache: 'no-store' });
        if (res.ok) {
          const list = await res.json();
          setPackages(Array.isArray(list) ? list : []);
        }
      } catch {}
    })();
  }, [apiBase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref) setReferralCode(ref);
    }
  }, []);

  const [email, setEmail] = useState('u4@example.com');
  const [password, setPassword] = useState('password123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [username, setUsername] = useState('user123');
  const [referralCode, setReferralCode] = useState('');
  const [country, setCountry] = useState('');
  const COUNTRIES = [
    'United States','United Kingdom','Canada','Nigeria','Ghana','Kenya','South Africa','India','Pakistan','Bangladesh','China','Japan','South Korea','Brazil','Argentina','Mexico','Germany','France','Italy','Spain','Portugal','Netherlands','Sweden','Norway','Denmark','Finland','Poland','Czech Republic','Russia','Ukraine','Turkey','Saudi Arabia','United Arab Emirates','Qatar','Egypt','Morocco','Algeria','Tunisia','Indonesia','Philippines','Vietnam','Thailand','Malaysia','Singapore','Australia','New Zealand','Chile','Colombia','Peru','Venezuela'
  ];

  const handleLogin = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Login failed');
      setJwt(json.token);
      saveToken(json.token);
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, country, sponsorCode: referralCode })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');
      setJwt(json.token);
      saveToken(json.token);
      setActivePage('profile');
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const activatePackage = async (pkg: 'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8'|'P9') => {
    if (!jwt) return;
    try {
      const res = await fetch(`${apiBase}/packages/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ packageName: pkg }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Activation failed');
      }
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    } catch (e) {
      console.error(e);
    }
  };

  const submitPackageDeposit = async () => {
    if (!jwt || !depositPkg) return;
    try {
      const res = await fetch(`${apiBase}/wallet/deposit/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ amount: depositPkg.amount, network: depositNetwork, txId: depositTxId || undefined })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Deposit failed');
      const net = Number(j.amount) - Number(j.fee || 0);
      setDepositNotice({ amount: Number(j.amount), fee: Number(j.fee || 0), net, status: String(j.status || 'Processing'), txId: String(j.txId || '') });
      if (depositAutoActivate) {
        await activatePackage(depositPkg.code as any);
      }
      setDepositOpen(false);
      setDepositTxId('');
    } catch (e: any) {
      alert(e.message || 'Deposit failed');
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', page: 'dashboard' },
    { icon: Package, label: 'Packages / Invest', page: 'packages' },
    { icon: Wallet, label: 'Wallet', page: 'wallet' },
    { icon: ArrowDownCircle, label: 'Withdraw', page: 'withdraw' },
    { icon: Gift, label: 'Rebates', page: 'rebates' },
    { icon: Award, label: 'Awards', page: 'awards' },
    { icon: Users, label: 'Referrals', page: 'referrals' },
    { icon: DollarSign, label: 'Funding', page: 'funding' },
    { icon: UserCircle, label: 'Profile', page: 'profile' },
    { icon: LogOut, label: 'Logout', page: 'logout' },
  ] as const;

  const SkeletonCard = () => (
    <div className="bg-gray-800 rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="h-10 bg-gray-700 rounded w-48"></div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          BRIVARA CAPITAL
        </h1>
        <p className="text-turquoise text-lg font-semibold">
          Updated With Rebate Bonus on Dashboard
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-2 lg:col-span-1"
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Available Balance</h3>
                <Wallet className="w-8 h-8 text-turquoise" />
              </div>
              <p className="text-4xl font-bold text-white">
                ${Number(data?.availableBalance ?? 0).toFixed(2)}
              </p>
              <p className="text-green-400 text-sm mt-2">Withdrawable Now</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Total Earnings</h3>
                <TrendingUp className="w-8 h-8 text-turquoise" />
              </div>
              <p className="text-4xl font-bold text-white">
                ${Number(data?.totalEarnings ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Awards are not counted in the 300% Total Return.
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <h3 className="text-gray-400 text-sm font-medium mb-4">Current Package</h3>
              <p className="text-3xl font-bold text-turquoise mb-2">
                {data?.currentPackage.name}
              </p>
              <p className="text-xl text-white">${Number(data?.currentPackage?.amount ?? 0)}</p>
              <p className="text-sm text-gray-400 mt-2">
                Activated: {data?.currentPackage.activatedAt ? fmt(data?.currentPackage.activatedAt) : '—'}
              </p>
              <p className="text-turquoise font-semibold mt-3">
                {data?.currentPackage.dailyRoi} daily ROI
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <h3 className="text-gray-400 text-sm font-medium mb-4">Total Points</h3>
              <p className="text-4xl font-bold text-white">
                {Math.round(Number(data?.totalPoints ?? 0)).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400 mt-2">From referrals only</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03 }}
          className="cursor-pointer"
          onClick={() => setActivePage('rebates')}
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-turquoise/20 to-cyan-600/20 rounded-2xl p-8 border-2 border-turquoise shadow-2xl shadow-turquoise/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold">Rebate Bonus</h3>
                <Gift className="w-10 h-10 text-turquoise animate-pulse" />
              </div>
              <p className="text-5xl font-bold text-turquoise">
                ${Number(data?.rebateBonus ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-turquoise mt-3">Click to view details →</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Today's ROI</h3>
                <TrendingUp className="w-8 h-8 text-turquoise" />
              </div>
              <p className="text-4xl font-bold text-white">${Number(data?.todayRoi ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Included in 300% progress</p>
              <div className="h-24 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.roi7d || []} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(26,188,188,0.3)' }} labelStyle={{ color: '#9ca3af' }} />
                    <Line type="monotone" dataKey="amount" stroke="#1ABCBC" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {(data?.roiRecent?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <button onClick={() => setRoiModalOpen(true)} className="px-3 py-2 rounded bg-slate-800 border border-turquoise/40 text-sm hover:bg-slate-700">View details</button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-3"
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6">300% Total Return Progress</h3>
              <div className="relative">
                <div className="flex justify-between text-sm text-gray-400 mb-3">
                  <span>${data?.progress300.earned.toFixed(2)} Earned</span>
                  <span>${data?.progress300.target.toFixed(0)} Target</span>
                </div>
                <div className="h-16 bg-slate-700 rounded-full overflow-hidden relative">
                  {typeof data?.progress300.percentage === 'number' ? (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data?.progress300.percentage}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-turquoise to-cyan-400 relative"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-slate-600" style={{ width: '0%' }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-3xl font-bold text-white">
                      {Number(data?.progress300.percentage ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {Number(data?.progress300.target ?? 0) === 0 && (
                  <p className="text-xs text-yellow-300 mt-2 text-center">Activate a package to start your 300% progress.</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="col-span-1 md:col-span-2 lg:col-span-1"
        >
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-800/30 rounded-2xl p-8 border border-amber-500/30 shadow-2xl shadow-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-amber-300 font-bold text-lg">Awards Summary</h3>
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-4xl font-bold text-amber-300">
                ${data?.awards.total}
              </p>
              <p className="text-amber-400 mt-3">{data?.awards.currentLevel}</p>
              {jwt && (
                <button
                  onClick={async () => {
                    try {
                      const items = await apiGet<any[]>(`${apiBase}/awards/history`, jwt!);
                      alert(`Awards history items: ${items.length}`);
                    } catch (e: any) {
                      alert(e.message || 'Failed to load awards history');
                    }
                  }}
                  className="mt-4 px-3 py-2 rounded bg-amber-500/30 border border-amber-400 text-amber-200 text-sm hover:bg-amber-500/40"
                >View Awards History</button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-2 text-center text-white bg-black/20">If you see this, the page rendered.</div>
      <div className="min-h-screen bg-slate-950 text-white">
        {!jwt && (
          <>
            {/* Hero section with CTA buttons, mirroring repo structure */}
            <section className="min-h-[70vh] flex items-center justify-center px-6 md:px-10 text-center bg-gradient-to-b from-slate-900 to-slate-950">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Brivara Capital</h1>
                <p className="text-gray-300 mb-6">Invest confidently with transparent returns, rebates, and rewards.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a href="/login" className="px-5 py-3 rounded-xl bg-turquoise text-black font-semibold">Login</a>
                  <a href="/register" className="px-5 py-3 rounded-xl bg-slate-800 border border-slate-700">Register</a>
                </div>
              </div>
            </section>

            {/* Feature highlights */}
            <section className="px-6 md:px-10 py-12">
              <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <p className="font-semibold">Daily ROI</p>
                  <p className="text-sm text-gray-400">1.5% daily with clear limits.</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <p className="font-semibold">Rebates</p>
                  <p className="text-sm text-gray-400">Earn from referral activity.</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <p className="font-semibold">Awards</p>
                  <p className="text-sm text-gray-400">Milestone bonuses unlocked.</p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="px-6 md:px-10 pb-8 text-sm text-gray-400 border-t border-slate-800">
              <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <p>© {new Date().getFullYear()} Brivara Capital. All rights reserved.</p>
                <div className="flex gap-4">
                  <a href="#" className="hover:text-turquoise">About</a>
                  <a href="#" className="hover:text-turquoise">Privacy</a>
                  <a href="#" className="hover:text-turquoise">Contact</a>
                </div>
              </div>
            </footer>
          </>
        )}
        {jwt && (
          <>
            {/* Overlay when sidebar is open (mobile) */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <motion.div
              initial={false}
              animate={{ x: sidebarOpen ? 0 : -300 }}
              className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-turquoise/20 z-50"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-bold text-turquoise">BRIVARA</h2>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.page}
                      onClick={() => {
                        setActivePage(item.page);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                        activePage === item.page
                          ? 'bg-turquoise text-black font-semibold shadow-lg shadow-turquoise/30'
                          : 'hover:bg-slate-800 text-gray-300'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>

            <div className={jwt ? 'lg:ml-72' : ''}> 
              <div className="bg-slate-900/80 backdrop-blur border-b border-turquoise/20 sticky top-0 z-30">
                <div className="flex items-center justify-between p-4">
                  <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden"
                  >
                    <Menu className="w-7 h-7 text-turquoise" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-turquoise rounded-full flex items-center justify-center font-bold">
                      U
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm text-gray-400">Welcome back</p>
                      <p className="font-semibold">User12345</p>
                    </div>
                    <div className="hidden md:block">
                      <HealthBadge />
                    </div>
                  </div>
                </div>
                {/* Top navigation bar for quick page switching on large screens */}
                <div className="hidden lg:block border-t border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    {menuItems.map((item) => (
                      <button
                        key={`top-${item.page}`}
                        onClick={() => setActivePage(item.page)}
                        className={`px-3 py-1 rounded-md text-sm transition-colors ${
                          activePage === item.page
                            ? 'bg-turquoise text-black font-semibold'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-10">
                {apiError && (
                  <div className="mb-4 p-3 rounded border border-red-600 bg-red-900/20 text-red-300">
                    {apiError}
                  </div>
                )}
                {activePage === 'dashboard' && <Dashboard />}
                {activePage !== 'dashboard' && (
                  <div className="text-center py-20">
                    <h2 className="text-3xl font-bold text-turquoise mb-4">
                      {menuItems.find(m => m.page === activePage)?.label}
                    </h2>
                    {jwt && activePage === 'packages' && (
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                        {(packages.length ? packages : [
                          {code:'P1', amount:25},
                          {code:'P2', amount:50},
                          {code:'P3', amount:100},
                          {code:'P4', amount:250},
                          {code:'P5', amount:500},
                          {code:'P6', amount:1000},
                          {code:'P7', amount:2000},
                          {code:'P8', amount:3000},
                          {code:'P9', amount:5000},
                        ]).map(p => (
                          <button
                            key={p.code}
                            onClick={()=>{ setDepositPkg(p); setDepositOpen(true); }}
                            className="px-4 py-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-turquoise/30 text-white hover:shadow-lg hover:shadow-turquoise/20"
                          >
                            <span className="block text-lg font-bold text-turquoise">{p.code}</span>
                            <span className="block text-sm text-gray-300">${Number(p.amount).toLocaleString()}</span>
                            <span className="mt-1 inline-block text-xs text-gray-500">Deposit & Activate</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {jwt && activePage === 'awards' && (
                      <AwardsView jwt={jwt} apiBase={apiBase} />
                    )}
                    {jwt && activePage === 'rebates' && (
                      <RebatesView jwt={jwt} apiBase={apiBase} />
                    )}
                    {jwt && activePage === 'referrals' && (
                      <ReferralsView jwt={jwt} apiBase={apiBase} />
                    )}
                    {jwt && activePage === 'wallet' && (
                      <WalletView jwt={jwt} apiBase={apiBase} summary={data} />
                    )}
                    {jwt && activePage === 'funding' && (
                      <FundingView jwt={jwt} apiBase={apiBase} />
                    )}
                    {jwt && activePage === 'withdraw' && (
                      <WithdrawView jwt={jwt} apiBase={apiBase} />
                    )}
                    {jwt && activePage === 'profile' && (
                      <ProfileView jwt={jwt} apiBase={apiBase} />
                    )}
                    {activePage === 'logout' && (
                      <div className="mt-6">
                        <button
                          onClick={() => { clearToken(); setJwt(null); }}
                          className="px-4 py-2 rounded bg-red-600 text-white font-semibold"
                        >Logout</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Styled-JSX removed; using Tailwind classes with custom color in tailwind.config.ts */}

      {depositOpen && depositPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-turquoise/30 text-left">
            <h3 className="text-xl font-bold text-turquoise mb-2">Deposit for {depositPkg.code}</h3>
            {(() => {
              const feePct = Number(process.env.NEXT_PUBLIC_DEPOSIT_FEE_PERCENT || 1.5);
              const base = Number(depositPkg.amount);
              const fee = Number(((base * feePct) / 100).toFixed(3));
              const gross = Number((base + fee).toFixed(3));
              const net = Number((base - fee).toFixed(3));
              return (
                <div className="mb-4 text-sm">
                  <p className="text-gray-300">Base Amount: ${base.toFixed(3)}</p>
                  <p className="text-gray-300">Deposit Fee ({feePct}%): ${fee.toFixed(3)}</p>
                  <p className="text-white font-semibold">Total to Send: ${gross.toFixed(3)}</p>
                  <p className="text-gray-400 mt-1">Net Credited After Fee: ${net.toFixed(3)}</p>
                </div>
              );
            })()}
            <label className="block text-sm">Network</label>
            <select value={depositNetwork} onChange={e=>setDepositNetwork(e.target.value as any)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700">
              <option value="TRC20">TRC20</option>
              <option value="BEP20">BEP20</option>
            </select>
            <div className="mt-3 p-3 rounded-xl border border-turquoise/30 bg-slate-900/40">
              <p className="text-sm text-gray-400">Wallet Address ({depositNetwork})</p>
              <p className="text-sm break-all font-mono">{depositNetwork==='TRC20' ? (process.env.NEXT_PUBLIC_TRON_ADDRESS || 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') : (process.env.NEXT_PUBLIC_BEP20_ADDRESS || '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')}</p>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(depositNetwork==='TRC20' ? (process.env.NEXT_PUBLIC_TRON_ADDRESS || 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') : (process.env.NEXT_PUBLIC_BEP20_ADDRESS || '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'))}`} alt="Wallet QR" className="mt-2 rounded" width={160} height={160} />
            </div>
            <ul className="mt-3 text-xs text-amber-300 list-disc pl-5 space-y-1">
              <li>Deposit the exact total amount shown above (includes fee).</li>
              <li>Use only the wallet address provided for the selected network.</li>
              <li>Include the transaction ID (TxID) after sending funds.</li>
              <li>Fee defaults to 1.5% unless otherwise announced.</li>
            </ul>
            <label className="block text-sm mt-3">TxID</label>
            <input value={depositTxId} onChange={e=>setDepositTxId(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={depositAutoActivate} onChange={e=>setDepositAutoActivate(e.target.checked)} />
              Auto-activate {depositPkg.code} after deposit
            </label>
            <div className="mt-4 flex gap-2">
              <button onClick={submitPackageDeposit} className="px-4 py-2 rounded bg-turquoise text-black font-semibold">Submit Deposit</button>
              <button onClick={()=>{ setDepositOpen(false); setDepositTxId(''); }} className="px-4 py-2 rounded bg-slate-800 border border-slate-700">Cancel</button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Processing time: 1–10 minutes. You will see the deposit confirmed shortly.</p>
          </div>
        </div>
      )}

      {depositNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-turquoise/30 text-left">
            <h4 className="font-semibold text-turquoise mb-2">Deposit Recorded</h4>
            <p className="text-sm text-white">Net amount to be credited after fee: ${depositNotice.net.toFixed(2)}</p>
            {(() => {
              const pct = depositNotice.amount > 0 ? (depositNotice.fee / depositNotice.amount) * 100 : 1.5;
              return (
                <p className="text-sm text-gray-300 mt-1">A {pct.toFixed(1)}% fee of ${depositNotice.fee.toFixed(2)} has been applied.</p>
              );
            })()}
            <p className="text-xs text-gray-400 mt-2">TxID: {depositNotice.txId}</p>
            <p className="text-xs text-gray-400">Status: {depositNotice.status}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setDepositNotice(null)} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ROI Details Modal */}
      {roiModalOpen && data?.roiAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-turquoise/30 text-left">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-turquoise">ROI Details</h4>
              <button onClick={() => setRoiModalOpen(false)} className="p-1 rounded hover:bg-slate-800">
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div>
                <label className="block text-xs text-gray-400">Start date</label>
                <input type="date" value={roiStart} onChange={e=>{ setRoiStart(e.target.value); setRoiPage(1); }} className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-400">End date</label>
                <input type="date" value={roiEnd} onChange={e=>{ setRoiEnd(e.target.value); setRoiPage(1); }} className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700" />
              </div>
            </div>
            {(() => {
              const all = (data?.roiAll || []).slice().sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              const filtered = all.filter(r => {
                const t = new Date(r.timestamp).getTime();
                if (roiStart) {
                  const s = new Date(roiStart + 'T00:00:00').getTime();
                  if (t < s) return false;
                }
                if (roiEnd) {
                  const e = new Date(roiEnd + 'T23:59:59').getTime();
                  if (t > e) return false;
                }
                return true;
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / roiPageSize));
              const curPage = Math.min(roiPage, totalPages);
              const startIdx = (curPage - 1) * roiPageSize;
              const pageRows = filtered.slice(startIdx, startIdx + roiPageSize);
              return (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>{filtered.length} entries</span>
                    <span>Page {curPage} / {totalPages}</span>
                  </div>
                  <div className="overflow-x-auto rounded border border-slate-800">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-800/70">
                        <tr>
                          <th className="px-3 py-2 text-left">Amount</th>
                          <th className="px-3 py-2 text-left">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, idx) => (
                          <tr key={idx} className="border-t border-slate-800">
                            <td className="px-3 py-2">${Number(r.amount).toFixed(2)}</td>
                            <td className="px-3 py-2">{fmt(r.timestamp)}</td>
                          </tr>
                        ))}
                        {pageRows.length === 0 && (
                          <tr>
                            <td className="px-3 py-4 text-gray-400" colSpan={2}>No ROI in this range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <button onClick={()=> setRoiPage(p=> Math.max(1, p-1))} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-50" disabled={curPage<=1}>Prev</button>
                    <button onClick={()=> setRoiPage(p=> p<totalPages? p+1 : p)} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-50" disabled={curPage>=totalPages}>Next</button>
                  </div>
                </>
              );
            })()}
            <div className="mt-3 text-right">
              <button onClick={() => setRoiModalOpen(false)} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AwardsView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [items, setItems] = React.useState<any[] | null>(null);
  const [defs, setDefs] = React.useState<any[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [history, definitions] = await Promise.all([
          apiGet<any[]>(`${apiBase}/awards/history`, jwt),
          apiGet<any[]>(`${apiBase}/earnings/awards-list`, jwt),
        ]);
        if (mounted) {
          setItems(history);
          setDefs(definitions);
        }
      } catch (e: any) {
        if (mounted) setErr(e.message || 'Failed to load awards');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [jwt, apiBase]);

  if (loading && !items && !defs) return <p className="text-gray-400">Loading awards…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  const noHistory = !items || items.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Definitions */}
      {defs && defs.length > 0 && (
        <div>
          <h3 className="text-amber-300 font-semibold mb-3">Award Definitions</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {defs.map((d) => (
              <div key={`${d.awardName}-${d.packageName}-${d.packageAmount}`} className="p-4 rounded-xl border border-amber-500/30 bg-amber-900/20">
                <p className="text-lg font-bold text-amber-200">{d.awardName}</p>
                <p className="text-sm text-amber-300">Qualifying Package: {d.packageName}</p>
                <p className="text-sm text-amber-300">Reward: ${Number(d.packageAmount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-amber-300 font-semibold mb-2">Award History</h3>
        {noHistory ? (
          <p className="text-gray-400">No awards yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-amber-400/30">
            <table className="min-w-full text-left">
              <thead className="bg-amber-900/30">
                <tr>
                  <th className="px-4 py-2">Award</th>
                  <th className="px-4 py-2">Package</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {items!.map((it) => (
                  <tr key={it.id} className="border-t border-amber-400/10">
                    <td className="px-4 py-2">{it.awardName}</td>
                    <td className="px-4 py-2">{it.packageName}</td>
                    <td className="px-4 py-2">${Number(it.packageAmount).toFixed(2)}</td>
                    <td className="px-4 py-2">{fmt(it.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RebatesView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet<any[]>(`${apiBase}/earnings/rebates/history`, jwt);
        setRows(data);
      } catch (e: any) {
        setErr(e.message || 'Failed to load rebates');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);
  if (loading && !rows.length) return <p className="text-gray-400">Loading rebates…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!rows.length) return <p className="text-gray-400">No rebates yet.</p>;
  const total = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  return (
    <div className="max-w-4xl mx-auto text-left">
      <p className="mb-3 text-sm text-gray-400">Total rebate: ${total.toFixed(2)}</p>
      <div className="overflow-x-auto rounded-xl border border-turquoise/30">
        <table className="min-w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Points Used</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-700">
                <td className="px-4 py-2">{r.level}</td>
                <td className="px-4 py-2">{Number(r.pointsUsed).toLocaleString()}</td>
                <td className="px-4 py-2">${Number(r.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{fmt(r.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BonusesView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet<any[]>(`${apiBase}/earnings/bonus-history`, jwt);
        setRows(data);
      } catch (e: any) {
        setErr(e.message || 'Failed to load bonuses');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);
  if (loading && !rows.length) return <p className="text-gray-400">Loading bonuses…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!rows.length) return <p className="text-gray-400">No bonuses yet.</p>;
  const total = rows.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  return (
    <div className="max-w-4xl mx-auto text-left">
      <p className="mb-3 text-sm text-gray-400">Total bonus: ${total.toFixed(2)}</p>
      <div className="overflow-x-auto rounded-xl border border-turquoise/30">
        <table className="min-w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-700">
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.level}</td>
                <td className="px-4 py-2">${Number(r.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{fmt(r.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PointsView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet<any[]>(`${apiBase}/earnings/points/ledger`, jwt);
        setRows(data);
      } catch (e: any) {
        setErr(e.message || 'Failed to load points');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);
  if (loading && !rows.length) return <p className="text-gray-400">Loading points…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!rows.length) return <p className="text-gray-400">No points yet.</p>;
  const total = rows.reduce((a, r) => a + Number(r.points ?? 0), 0);
  return (
    <div className="max-w-4xl mx-auto text-left">
      <p className="mb-3 text-sm text-gray-400">Total points: {total.toLocaleString()}</p>
      <div className="overflow-x-auto rounded-xl border border-turquoise/30">
        <table className="min-w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Points</th>
              <th className="px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-700">
                <td className="px-4 py-2">{r.level}</td>
                <td className="px-4 py-2">{Number(r.points).toLocaleString()}</td>
                <td className="px-4 py-2">{fmt(r.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReferralsView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [levels, setLevels] = React.useState<{ level: number; users: any[] }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet<{ levels: { level: number; users: any[] }[] }>(`${apiBase}/referrals/tree`, jwt);
        setLevels(data.levels || []);
      } catch (e: any) {
        setErr(e.message || 'Failed to load referrals');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);
  if (loading && !levels.length) return <p className="text-gray-400">Loading referrals…</p>;
  if (err) return <p className="text-red-400">{err}</p>;
  if (!levels.length) return <p className="text-gray-400">No referrals yet.</p>;
  return (
    <div className="max-w-3xl mx-auto text-left space-y-4">
      {levels.map((lvl) => (
        <div key={lvl.level} className="p-4 rounded-xl border border-slate-700 bg-slate-900/50">
          <p className="font-semibold text-turquoise">Level {lvl.level} • {lvl.users.length} users</p>
          {lvl.users.length > 0 && (
            <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-300">
              {lvl.users.map((u) => (
                <li key={u.id} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">{u.username}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function WalletView({ jwt, apiBase, summary }: { jwt: string; apiBase: string; summary: any }) {
  const [deps, setDeps] = React.useState<any[]>([]);
  const [wds, setWds] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [d, w] = await Promise.all([
          apiGet<any[]>(`${apiBase}/wallet/deposit/history`, jwt),
          apiGet<any[]>(`${apiBase}/wallet/withdrawal/history`, jwt),
        ]);
        setDeps(d); setWds(w);
      } catch (e: any) {
        setErr(e.message || 'Failed to load wallet');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);

  return (
    <div className="max-w-4xl mx-auto text-left space-y-8">
      <div className="p-4 rounded-xl border border-turquoise/30 bg-slate-900/50">
        <p className="text-sm text-gray-400">Available Balance</p>
        <p className="text-3xl font-bold">${Number(summary?.availableBalance ?? 0).toFixed(2)}</p>
      </div>
      {err && <p className="text-red-400">{err}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Deposit History</h3>
          {loading && !deps.length ? <p className="text-gray-400">Loading…</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Network</th>
                    <th className="px-3 py-2">TxID</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {deps.map(d => (
                    <tr key={d.id} className="border-t border-slate-700">
                      <td className="px-3 py-2">${Number(d.amount).toFixed(2)}</td>
                      <td className="px-3 py-2">${Number(d.fee ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{d.network}</td>
                      <td className="px-3 py-2">{d.txId}</td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2">{fmt(d.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-2">Withdrawal History</h3>
          {loading && !wds.length ? <p className="text-gray-400">Loading…</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Network</th>
                    <th className="px-3 py-2">TxID</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {wds.map(w => (
                    <tr key={w.id} className="border-t border-slate-700">
                      <td className="px-3 py-2">${Number(w.amount).toFixed(2)}</td>
                      <td className="px-3 py-2">${Number(w.fee).toFixed(2)}</td>
                      <td className="px-3 py-2">{w.network}</td>
                      <td className="px-3 py-2">{w.txId}</td>
                      <td className="px-3 py-2">{w.status}</td>
                      <td className="px-3 py-2">{fmt(w.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FundingView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [amount, setAmount] = React.useState<number>(100);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const submit = async () => {
    try {
      setMsg(null); setErr(null);
      const res = await fetch(`${apiBase}/wallet/deposit/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ amount, network: 'SYSTEM' })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Deposit failed');
      setMsg('System deposit recorded. Wallet updated.');
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="max-w-md mx-auto text-left space-y-3">
      {msg && <p className="text-green-400">{msg}</p>}
      {err && <p className="text-red-400">{err}</p>}
      <p className="text-sm text-gray-400">Funding is processed internally by the system.</p>
      <label className="block text-sm">Amount</label>
      <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
      <button onClick={submit} className="mt-4 px-4 py-2 rounded bg-turquoise text-black font-semibold">Submit Deposit</button>
    </div>
  );
}

function WithdrawView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [amount, setAmount] = React.useState<number>(50);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ amount: number; fee: number; net: number } | null>(null);
  const feePct = Number(process.env.NEXT_PUBLIC_WITHDRAWAL_FEE_PERCENT || 5);
  const feeCalc = Number(((amount * feePct) / 100).toFixed(3));
  const netCalc = Number((amount - feeCalc).toFixed(3));
  const totalDeducted = Number((amount + feeCalc).toFixed(3));
  const submit = async () => {
    try {
      setMsg(null); setErr(null);
      const res = await fetch(`${apiBase}/wallet/withdrawal/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ amount, network: 'BEP20' })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Withdrawal failed');
      const net = Number(j.amount) - Number(j.fee || 0);
      setMsg(`Withdrawal requested. Fee $${Number(j.fee).toFixed(2)}, Net you will receive $${net.toFixed(2)}, status ${j.status}.`);
      setNotice({ amount: Number(j.amount), fee: Number(j.fee || 0), net });
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="max-w-md mx-auto text-left space-y-3">
      {msg && <p className="text-green-400">{msg}</p>}
      {err && <p className="text-red-400">{err}</p>}
      <label className="block text-sm">Amount</label>
      <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
      <div className="text-sm bg-slate-900/50 border border-slate-700 rounded p-3">
        <p className="text-gray-300">Requested Amount: ${amount.toFixed(3)}</p>
        <p className="text-gray-300">Withdrawal Fee ({feePct}%): ${feeCalc.toFixed(3)}</p>
        <p className="text-white font-semibold">Net You Will Receive: ${netCalc.toFixed(3)}</p>
        <p className="text-gray-400 mt-1">Total Deducted From Wallet: ${totalDeducted.toFixed(3)}</p>
      </div>
      <p className="text-xs text-gray-500">Minimum and 24h cooldown enforced. Fee defaults to {feePct}% unless configured.</p>
      <button onClick={submit} className="mt-2 px-4 py-2 rounded bg-turquoise text-black font-semibold">Request Withdrawal</button>

      {notice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900 border border-turquoise/30 text-left">
            <h4 className="font-semibold text-turquoise mb-2">Withdrawal Submitted</h4>
            <p className="text-sm text-white">Total amount to be received: ${notice.net.toFixed(2)}</p>
            {(() => {
              const pct = notice.amount > 0 ? (notice.fee / notice.amount) * 100 : feePct;
              return (
                <p className="text-sm text-gray-300 mt-1">A {pct.toFixed(0)}% service fee of ${notice.fee.toFixed(2)} has been deducted.</p>
              );
            })()}
            <div className="mt-3 flex gap-2">
              <button onClick={() => setNotice(null)} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ jwt, apiBase }: { jwt: string; apiBase: string }) {
  const [profile, setProfile] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/profile`, { headers: { Authorization: `Bearer ${jwt}` } });
        if (!res.ok) throw new Error(`Load failed: ${res.status}`);
        const p = await res.json();
        setProfile(p);
      } catch (e: any) {
        setErr(e.message || 'Failed to load profile');
      } finally { setLoading(false); }
    })();
  }, [jwt, apiBase]);

  const save = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const payload: any = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
        withdraw_wallet_bep20: profile.withdraw_wallet_bep20,
      };
      const res = await fetch(`${apiBase}/profile/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      setProfile(j);
      alert('Profile Updated Successfully');
    } catch (e: any) {
      alert(e.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await fetch(`${apiBase}/profile/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Password change failed');
      setPwdOpen(false);
      alert('Password changed');
    } catch (e: any) {
      alert(e.message || 'Password change failed');
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    try {
      setPhotoUploading(true);
      // For demo, assume an object URL or pre-uploaded link; in production, upload to S3 and get URL
      const fakeUrl = URL.createObjectURL(photoFile);
      const res = await fetch(`${apiBase}/profile/upload-photo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ imageUrl: fakeUrl })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Upload failed');
      setProfile({ ...profile, profileImageUrl: j.profileImageUrl });
      alert('Profile photo updated');
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setPhotoUploading(false);
      setPhotoFile(null);
    }
  };

  if (loading && !profile) return <p className="text-gray-400">Loading profile…</p>;
  if (err) return <p className="text-red-400">{err}</p>;

  return (
    <div className="max-w-3xl mx-auto text-left space-y-8">
      {/* Referral Link */}
      <div className="border rounded-md p-3 bg-slate-900/60">
        <div className="text-sm text-gray-400">Your Referral Link</div>
        {referralLink ? (
          <div className="mt-1 flex items-center gap-2">
            <input readOnly value={referralLink.url} className="flex-1 bg-transparent border border-slate-800 rounded px-2 py-1 text-sm" />
            <button
              onClick={() => { navigator.clipboard.writeText(referralLink.url); setCopied(true); setTimeout(() => setCopied(false), 800); }}
              className="px-3 py-1 rounded bg-turquoise text-black text-sm font-semibold"
            >Copy</button>
            {copied && <span className="text-green-400 text-sm">Copied!</span>}
          </div>
        ) : (
          <div className="mt-1 text-sm text-gray-500">Loading referral link...</div>
        )}
        {referralLink && <div className="text-xs text-gray-500 mt-1">Code: {referralLink.code}</div>}
      </div>

      {/* User Info */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 space-y-3">
        <h3 className="font-semibold text-turquoise">User Information</h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
            {profile?.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-turquoise font-bold">U</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/png,image/jpeg" onChange={e=>setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <button onClick={uploadPhoto} disabled={photoUploading || !photoFile} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs">Upload Photo</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Full Name</label>
            <input value={profile?.name || ''} onChange={e=>setProfile({...profile, name: e.target.value})} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Username (read-only)</label>
            <input value={profile?.username || ''} readOnly className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Email</label>
            <input value={profile?.email || ''} readOnly className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Phone</label>
            <input value={profile?.phone || ''} onChange={e=>setProfile({...profile, phone: e.target.value})} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Country</label>
            <input value={profile?.country || ''} onChange={e=>setProfile({...profile, country: e.target.value})} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
          </div>
        </div>
      </div>

      {/* Wallet Settings */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 space-y-3">
        <h3 className="font-semibold text-turquoise">Wallet Settings</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400">USDT BEP20 Withdrawal Wallet</label>
            <input value={profile?.withdraw_wallet_bep20 || ''} onChange={e=>setProfile({...profile, withdraw_wallet_bep20: e.target.value})} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <p className="text-xs text-gray-500 mt-1">Required for withdrawals.</p>
          </div>
          <div>
            <label className="text-xs text-gray-400">USDT TRC20 Deposit Address</label>
            <input value={profile?.deposit_wallet_trc20 || ''} readOnly className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600" />
          </div>
          <div>
            <label className="text-xs text-gray-400">USDT BEP20 Deposit Address</label>
            <input value={profile?.deposit_wallet_bep20 || ''} readOnly className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600" />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 space-y-3">
        <h3 className="font-semibold text-turquoise">Security</h3>
        <button onClick={()=>setPwdOpen(true)} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">Change Password</button>
        {pwdOpen && (
          <PasswordModal onClose={()=>setPwdOpen(false)} onSubmit={changePassword} />
        )}
      </div>

      {/* Referral */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 space-y-3">
        <h3 className="font-semibold text-turquoise">Referral</h3>
        {referralLink ? (
          <div className="flex items-center gap-2">
            <input value={referralLink.url} readOnly className="flex-1 px-3 py-2 rounded bg-slate-700 border border-slate-600" />
            <button onClick={()=>{ navigator.clipboard.writeText(referralLink.url); setCopied(true); setTimeout(()=>setCopied(false), 800); }} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">Copy</button>
            {copied && <span className="text-green-400 text-sm">Copied!</span>}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Loading referral link...</div>
        )}
        <p className="text-xs text-gray-500">Referral Code: {referralLink?.code || '—'}</p>
      </div>

      {/* Account Data */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 space-y-2">
        <h3 className="font-semibold text-turquoise">Account Data</h3>
        <p className="text-sm">Account ID: {profile?.id || '—'}</p>
        <p className="text-sm">Registration Date: {profile?.created_at ? fmt(profile.created_at) : '—'}</p>
        <p className="text-sm">Last Login: {profile?.lastLogin ? fmt(profile.lastLogin) : '—'}</p>
        <p className="text-sm">Status: {profile?.status || '—'}</p>
        <p className="text-sm">Current Package: {profile?.currentPackage || '—'}</p>
        <p className="text-sm">Activation Date: {profile?.activationDate ? fmt(profile.activationDate) : '—'}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-turquoise text-black font-semibold">Save Changes</button>
        <button onClick={()=>{ clearToken(); location.reload(); }} className="px-4 py-2 rounded bg-red-600 text-white font-semibold">Logout</button>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSubmit }: { onClose: ()=>void; onSubmit: (current: string, next: string, confirm: string)=>void }) {
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm p-4 rounded-xl bg-slate-900 border border-slate-700">
        <h4 className="font-semibold mb-3">Change Password</h4>
        <label className="text-xs text-gray-400">Current Password</label>
        <input type="password" value={current} onChange={e=>setCurrent(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-2" />
        <label className="text-xs text-gray-400">New Password</label>
        <input type="password" value={next} onChange={e=>setNext(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-2" />
        <p className="text-xs text-gray-500 mb-2">At least 8 chars, one uppercase, one number, one special character.</p>
        <label className="text-xs text-gray-400">Confirm New Password</label>
        <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        <div className="mt-3 flex gap-2">
          <button onClick={()=>onSubmit(current, next, confirm)} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">Submit</button>
          <button onClick={onClose} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}
