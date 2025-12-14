"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Gift, Trophy, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Link from 'next/link';

export const fmt = (ts: any) => {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts ?? '');
    return format(d, 'yyyy-MM-dd HH:mm');
  } catch {
    return String(ts ?? '');
  }
};

export function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="h-10 bg-gray-700 rounded w-48"></div>
    </div>
  );
}

export function DashboardView({ data, loading, apiError, referralLink, onCopy, copied }: { data: any; loading: boolean; apiError?: string|null; referralLink?: { code: string; url: string } | null; onCopy?: () => void; copied?: boolean }) {
  const [roiModalOpen, setRoiModalOpen] = React.useState(false);
  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">BRIVARA CAPITAL</h1>
        <p className="text-turquoise text-lg font-semibold">Dashboard Overview</p>
      </motion.div>

      {apiError && (
        <div className="mb-4 p-3 rounded border border-red-600 bg-red-900/20 text-red-300">{apiError}</div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs text-gray-400">Current Package</p>
          <p className="text-sm font-semibold text-turquoise mt-1">{data?.currentPackage?.name ?? '—'}</p>
          <p className="text-xs text-gray-400">${Number(data?.currentPackage?.amount ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs text-gray-400">300% Progress</p>
          <p className="text-sm font-semibold text-white mt-1">{Number(data?.progress300?.percentage ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-400">${Number(data?.progress300?.earned ?? 0).toFixed(0)} / ${Number(data?.progress300?.target ?? 0).toFixed(0)}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs text-gray-400">Total Points</p>
          <p className="text-sm font-semibold text-white mt-1">{Number(data?.totalPoints ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">Referrals</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs text-gray-400">Rebates Earned</p>
          <p className="text-sm font-semibold text-turquoise mt-1">${Number(data?.rebateBonus ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400">All time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="col-span-1 md:col-span-2 lg:col-span-1">
          {loading ? <SkeletonCard /> : (
            <Link href="/wallet" className="block">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10 hover:shadow-turquoise/20 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Available Balance</h3>
                <Wallet className="w-8 h-8 text-turquoise" />
              </div>
              <p className="text-4xl font-bold text-white">${Number(data?.availableBalance ?? 0).toFixed(2)}</p>
              <p className="text-green-400 text-sm mt-2">Withdrawable Now</p>
            </div>
            </Link>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Total Earnings</h3>
                <TrendingUp className="w-8 h-8 text-turquoise" />
              </div>
              <p className="text-4xl font-bold text-white">${Number(data?.totalEarnings ?? 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-3">Awards are not counted in the 300% Total Return.</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <h3 className="text-gray-400 text-sm font-medium mb-4">Current Package</h3>
              <p className="text-3xl font-bold text-turquoise mb-2">{data?.currentPackage?.name ?? '—'}</p>
              <p className="text-xl text-white">${Number(data?.currentPackage?.amount ?? 0)}</p>
              <p className="text-sm text-gray-400 mt-2">Activated: {data?.currentPackage?.activatedAt ? fmt(data?.currentPackage?.activatedAt) : '—'}</p>
              <p className="text-turquoise font-semibold mt-3">{data?.currentPackage?.dailyRoi ?? '1.5%'} daily ROI</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl shadow-turquoise/10">
              <h3 className="text-gray-400 text-sm font-medium mb-4">Total Points</h3>
              <p className="text-4xl font-bold text-white">{Number(data?.totalPoints ?? 0).toLocaleString()}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-gray-400 text-xs">Direct</p>
                  <p className="text-white font-semibold">{Number(data?.directPoints ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-gray-400 text-xs">Indirect</p>
                  <p className="text-white font-semibold">{Number(data?.indirectPoints ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          {loading ? <SkeletonCard /> : (
            <Link href="/rebates" className="block">
            <div className="bg-gradient-to-br from-turquoise/20 to-cyan-600/20 rounded-2xl p-8 border-2 border-turquoise shadow-2xl shadow-turquoise/30 hover:shadow-turquoise/50 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold">Rebate Bonus</h3>
                <Gift className="w-10 h-10 text-turquoise animate-pulse" />
              </div>
              <p className="text-5xl font-bold text-turquoise">${Number(data?.rebateBonus ?? 0).toFixed(2)}</p>
              <p className="text-sm text-turquoise mt-3">Updated in real-time</p>
            </div>
            </Link>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
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
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }} className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
          {loading ? <SkeletonCard /> : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-turquoise/20 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6">300% Total Return Progress</h3>
              <div className="relative">
                <div className="flex justify-between text-sm text-gray-400 mb-3">
                  <span>${Number(data?.progress300?.earned ?? 0).toFixed(2)} Earned</span>
                  <span>${Number(data?.progress300?.target ?? 0).toFixed(0)} Target</span>
                </div>
                <div className="h-16 bg-slate-700 rounded-full overflow-hidden relative">
                  {typeof data?.progress300?.percentage === 'number' ? (
                    <motion.div initial={{ width: 0 }} animate={{ width: `${data?.progress300?.percentage}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-turquoise to-cyan-400 relative">
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-slate-600" style={{ width: '0%' }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-3xl font-bold text-white">{Number(data?.progress300?.percentage ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
                {Number(data?.progress300?.target ?? 0) === 0 && (
                  <p className="text-xs text-yellow-300 mt-2 text-center">Activate a package to start your 300% progress.</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }} className="col-span-1 md:col-span-2 lg:col-span-1">
          {loading ? <SkeletonCard /> : (
            <Link href="/awards" className="block">
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-800/30 rounded-2xl p-8 border border-amber-500/30 shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-amber-300 font-bold text-lg">Awards Summary</h3>
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-4xl font-bold text-amber-300">${Number(data?.awards?.total ?? 0)}</p>
              <p className="text-amber-400 mt-3">{data?.awards?.currentLevel ?? '—'}</p>
              <p className="mt-4 px-3 py-2 rounded bg-amber-500/30 border border-amber-400 text-amber-200 text-sm inline-block">View Awards</p>
            </div>
            </Link>
          )}
        </motion.div>
      </div>

      {/* ROI Details Modal */}
      {roiModalOpen && (data?.roiRecent?.length ?? 0) > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-turquoise/30 text-left">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-turquoise">ROI Details (Last 10)</h4>
              <button onClick={() => setRoiModalOpen(false)} className="p-1 rounded hover:bg-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
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
                  {data.roiRecent.map((r: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-800">
                      <td className="px-3 py-2">${Number(r.amount).toFixed(2)}</td>
                      <td className="px-3 py-2">{fmt(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <button onClick={() => setRoiModalOpen(false)} className="px-3 py-2 rounded bg-turquoise text-black font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Link Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-slate-900/70 border border-slate-800"
      >
        <h2 className="text-lg font-semibold text-turquoise mb-3">Your Referral Link</h2>
        {referralLink ? (
          <div className="flex items-center gap-2">
            <input 
              value={referralLink.url} 
              readOnly 
              className="flex-1 px-3 py-2 rounded bg-slate-700 border border-slate-600 text-sm" 
            />
            <button 
              onClick={onCopy}
              className="px-4 py-2 rounded bg-turquoise text-black font-semibold text-sm hover:bg-turquoise/90 transition-colors"
            >
              Copy
            </button>
            {copied && <span className="text-green-400 text-sm">Copied!</span>}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Loading referral link...</div>
        )}
        {referralLink && (
          <p className="text-xs text-gray-500 mt-2">Referral Code: {referralLink.code}</p>
        )}
      </motion.div>
    </div>
  );
}
