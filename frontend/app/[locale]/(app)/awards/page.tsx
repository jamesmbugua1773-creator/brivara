"use client";
import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Award = {
  id: string;
  awardName: string;
  packageName: string;
  packageAmount: number;
  timestamp: string;
  txId: string;
};

export default function AwardsPage() {
  const locale = useLocale();
  const t = useTranslations('awards');

  const [list, setList] = useState<Award[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any | null>(null);

  const AWARDS: Array<{rank:string; reward:string; direct:string; teamPoints:string}> = [
    { rank: 'Star', reward: '$50', direct: '2 directs ($100+)', teamPoints: '3,000' },
    { rank: 'Achiever', reward: '$150', direct: '2 directs ($500+)', teamPoints: '10,000' },
    { rank: 'Leader', reward: '$800', direct: '1 Direct Achiever', teamPoints: '50,000' },
    { rank: 'Emerald', reward: '$1,500', direct: '1 Direct Leader', teamPoints: '75,000' },
    { rank: 'Diamond', reward: '$2,000', direct: '1 Direct Emerald', teamPoints: '100,000' },
    { rank: 'Director', reward: '$9,000', direct: '1 Direct Diamond', teamPoints: '300,000' },
    { rank: 'Ambassador', reward: '$15,000', direct: '1 Direct Director', teamPoints: '600,000' },
    { rank: 'Vice President', reward: '$40,000', direct: '1 Direct Ambassador', teamPoints: '3,500,000' },
    { rank: 'President', reward: '$80,000', direct: '1 Direct Vice President', teamPoints: '5,000,000' },
    { rank: 'Royal', reward: '$200,000', direct: '1 Direct President', teamPoints: '150,000,000' },
  ];

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) {
      window.location.replace(`/${locale}/login`);
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    Promise.all([
      fetch(`${base}/awards/history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${base}/awards/progress`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
    ])
      .then(async ([histRes, progRes]) => {
        if (!histRes.ok) throw new Error(`HTTP ${histRes.status}`);
        const json = (await histRes.json()) as Award[];
        let prog: any = null;
        if (progRes && (progRes as Response).ok) {
          try { prog = await (progRes as Response).json(); } catch {}
        }
        setList(json);
        setProgress(prog);
        setError(null);
      })
      .catch((e) => setError(e.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale]);

  if (loading) return <div className="p-6">{t('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <section className="space-y-3">
        <h2 className="text-xl font-medium">{t('rankRewardsTitle')}</h2>
        <div className="text-xs text-gray-400">{t('rankRewardsSubtitle')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AWARDS.map((a) => {
            const achieved = list.some((h) => h.awardName === a.rank);
            return (
              <AwardCard
                key={a.rank}
                rank={a.rank}
                reward={a.reward}
                direct={a.direct}
                teamPoints={a.teamPoints}
                achieved={achieved}
                prog={progress}
                t={t}
              />
            );
          })}
        </div>
      </section>

      {/* Award history removed per request */}
    </div>
  );
}

function AwardCard({
  rank,
  reward,
  direct,
  teamPoints,
  achieved,
  prog,
  t,
}: {
  rank: string;
  reward: string;
  direct: string;
  teamPoints: string;
  achieved?: boolean;
  prog?: any;
  t: ReturnType<typeof useTranslations>;
}) {
  // derive progress metrics per rank
  const tp = Number(prog?.teamPoints ?? 0);
  let directProgress = '';
  let directOk = false;
  if (rank === 'Star') {
    const c = Number(prog?.directCount100 ?? 0);
    directProgress = `${Math.min(c, 2)}/2 directs ($100+)`;
    directOk = c >= 2;
  } else if (rank === 'Achiever') {
    const c = Number(prog?.directCount500 ?? 0);
    directProgress = `${Math.min(c, 2)}/2 directs ($500+)`;
    directOk = c >= 2;
  } else if (rank === 'Leader') {
    const has = !!prog?.directHas?.Achiever;
    directProgress = has ? '1/1 Direct Achiever' : '0/1 Direct Achiever';
    directOk = has;
  } else if (rank === 'Emerald') {
    const has = !!prog?.directHas?.Leader;
    directProgress = has ? '1/1 Direct Leader' : '0/1 Direct Leader';
    directOk = has;
  } else if (rank === 'Diamond') {
    const has = !!prog?.directHas?.Emerald;
    directProgress = has ? '1/1 Direct Emerald' : '0/1 Direct Emerald';
    directOk = has;
  } else if (rank === 'Director') {
    const has = !!prog?.directHas?.Diamond;
    directProgress = has ? '1/1 Direct Diamond' : '0/1 Direct Diamond';
    directOk = has;
  } else if (rank === 'Ambassador') {
    const has = !!prog?.directHas?.Director;
    directProgress = has ? '1/1 Direct Director' : '0/1 Direct Director';
    directOk = has;
  } else if (rank === 'Vice President') {
    const has = !!prog?.directHas?.Ambassador;
    directProgress = has ? '1/1 Direct Ambassador' : '0/1 Direct Ambassador';
    directOk = has;
  } else if (rank === 'President') {
    const has = !!prog?.directHas?.['Vice President'];
    directProgress = has ? '1/1 Direct Vice President' : '0/1 Direct Vice President';
    directOk = has;
  } else if (rank === 'Royal') {
    const has = !!prog?.directHas?.President; // closest proxy for pre-royal requirement
    directProgress = has ? '1/1 Direct President' : '0/1 Direct President';
    directOk = has;
  }

  let tpReq = 0;
  if (rank === 'Star') tpReq = 3000;
  else if (rank === 'Achiever') tpReq = 10000;
  else if (rank === 'Leader') tpReq = 50000;
  else if (rank === 'Emerald') tpReq = 75000;
  else if (rank === 'Diamond') tpReq = 100000;
  else if (rank === 'Director') tpReq = 300000;
  else if (rank === 'Ambassador') tpReq = 600000;
  else if (rank === 'Vice President') tpReq = 3500000;
  else if (rank === 'President') tpReq = 5000000;
  else if (rank === 'Royal') tpReq = 150000000;
  const tpOk = tp >= tpReq;
  const tpLabel = `${Math.min(tp, tpReq).toLocaleString()}/${tpReq.toLocaleString()} team points`;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${achieved ? 'border-turquoise' : 'border-slate-800'} bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg ${achieved ? '' : 'opacity-80'}`}>
      {/* subtle pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 20% 20%, #14b8a6 1px, transparent 1px)', backgroundSize:'14px 14px'}} />
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className={`text-sm tracking-wide font-medium ${achieved ? 'text-turquoise' : 'text-gray-300'}`}>{rank}</div>
        <div className="h-6 w-10 rounded-sm bg-gradient-to-r from-amber-400 to-yellow-500 opacity-80" />
      </div>
      {/* main */}
      <div className="px-4 pb-4 pt-2">
        <div className="text-3xl font-semibold text-white">{reward}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className={`inline-block h-2 w-2 rounded-full mt-1.5 ${directOk ? 'bg-turquoise' : 'bg-slate-500'}`} />
            <div>
              <div className="text-gray-400">{t('directRequirement')}</div>
              <div className="text-white/90">{directProgress || direct}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className={`inline-block h-2 w-2 rounded-full mt-1.5 ${tpOk ? 'bg-turquoise' : 'bg-slate-500'}`} />
            <div className="flex-1">
              <div className="text-gray-400">{t('teamPointsRequirement')}</div>
              <div className="text-white/90">{tpLabel}</div>
              <div className="mt-1 h-1.5 w-full rounded bg-slate-800">
                <div className="h-1.5 rounded bg-turquoise" style={{width: `${Math.min(100, (tpReq ? (tp/tpReq)*100 : 0)).toFixed(0)}%`}} />
              </div>
            </div>
          </div>
        </div>
        {achieved ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-turquoise/10 border border-turquoise px-3 py-1 text-xs text-turquoise">
            <span className="h-1.5 w-1.5 rounded-full bg-turquoise" /> {t('achieved')}
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-800/60 border border-slate-700 px-3 py-1 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> {t('locked')}
          </div>
        )}
      </div>
    </div>
  );
}
