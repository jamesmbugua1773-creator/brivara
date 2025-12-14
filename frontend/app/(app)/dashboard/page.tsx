"use client";

import React, { useEffect, useState } from 'react';
import { DashboardView } from '../../components/views';

interface DashboardData {
  availableBalance: number;
  totalEarnings: number;
  currentPackage: { name: string; amount: number; activatedAt: string; dailyRoi: string } | null;
  totalPoints: number;
  directPoints?: number;
  indirectPoints?: number;
  rebateBonus: number;
  progress300: { percentage: number; earned: number; target: number };
  awards: { total: number; currentLevel: string };
  todayRoi?: number;
  roi7d?: Array<{ date: string; amount: number }>;
  roiRecent?: Array<{ amount: number; timestamp: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`)
    : '';

  useEffect(() => {
    const jwt = typeof window !== 'undefined' ? localStorage.getItem('brivara_jwt') : null;
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!jwt) { setLoading(false); return; }
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
        if (progressRes.ok) progress = await progressRes.json();
        if (rebateSummaryRes.ok) rebateSummary = await rebateSummaryRes.json();

        // ROI aggregation
        let todayRoi = 0;
        let roi7d: Array<{ date: string; amount: number }> = [];
        let roiRecentVar: Array<{ amount: number; timestamp: string }> = [];
        if (roiHistoryRes.ok) {
          const roiHistory = await roiHistoryRes.json();
          const today = new Date();
          const pad = (n:number)=> n.toString().padStart(2,'0');
          const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
          const grouped = new Map<string, number>();
          roiRecentVar = (Array.isArray(roiHistory) ? roiHistory.slice(0, 10) : []).map((r:any)=>({ amount: Number(r.amount||0), timestamp: String(r.timestamp) }));
          for (const r of (roiHistory || [])) {
            const d = new Date(r.timestamp);
            if (isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            grouped.set(key, Number((grouped.get(key) || 0) + Number(r.amount || 0)));
          }
          todayRoi = Number(grouped.get(todayKey) || 0);
          const series: Array<{ date: string; amount: number }> = [];
          for (let i = 6; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const key = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
            series.push({ date: key.slice(5), amount: Number(grouped.get(key) || 0) });
          }
          roi7d = series;
          // roiRecentVar will be attached to mapped below
        }
        if (referralRes.ok) {
          const referralData = await referralRes.json();
          console.log('Dashboard referral link loaded:', referralData);
          setReferralLink(referralData);
        } else {
          console.error('Failed to fetch dashboard referral link:', referralRes.status, referralRes.statusText);
          const errorText = await referralRes.text();
          console.error('Referral link error response:', errorText);
        }
        const POINT_USD = Number(process.env.NEXT_PUBLIC_POINT_USD_VALUE ?? '0.08');
        const impliedRebate = Number(rebateSummary?.impliedAmount ?? (Number(summary.totalPoints ?? 0) * POINT_USD));
        const mapped: DashboardData = {
          availableBalance: Number(summary.availableBalance ?? 0),
          totalEarnings: Number(summary.totalEarnings ?? 0),
          currentPackage: summary.currentPackage
            ? { name: summary.currentPackage.packageName, amount: Number(summary.currentPackage.amount), activatedAt: summary.currentPackage.activatedAt, dailyRoi: '1.5%' }
            : null,
          totalPoints: Number(summary.totalPoints ?? 0),
          directPoints: Number(summary.directPoints ?? 0),
          indirectPoints: Number(summary.indirectPoints ?? 0),
          rebateBonus: Number.isFinite(impliedRebate) ? impliedRebate : 0,
          progress300: {
            percentage: Number(progress?.percentage ?? 0),
            earned: Number(progress?.total ?? 0),
            target: Number(progress?.cap ?? 0),
          },
          awards: { total: 0, currentLevel: '—' },
          todayRoi,
          roi7d,
          roiRecent: roiRecentVar,
        };
        setData(mapped);
      } catch (e: any) {
        setApiError(e?.message || 'API error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiBase]);

  return <DashboardView data={data} loading={loading} apiError={apiError} referralLink={referralLink} onCopy={() => { navigator.clipboard.writeText(referralLink?.url || ''); setCopied(true); setTimeout(() => setCopied(false), 800); }} copied={copied} />;
}
