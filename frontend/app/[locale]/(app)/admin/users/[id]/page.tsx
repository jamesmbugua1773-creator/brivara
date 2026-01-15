"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const RebatesSection = dynamic(() => import("./RebatesSection"), { ssr: false });
const WithdrawalsSection = dynamic(() => import("./WithdrawalsSection"), { ssr: false });
const DepositsSection = dynamic(() => import("./DepositsSection"), { ssr: false });
const TicketsSection = dynamic(() => import("./TicketsSection"), { ssr: false });
const WalletSection = dynamic(() => import("./WalletSection"), { ssr: false });
const PointsSection = dynamic(() => import("./PointsSection"), { ssr: false });
const AwardsSection = dynamic(() => import("./AwardsSection"), { ssr: false });
const PackagesSection = dynamic(() => import("./PackagesSection"), { ssr: false });
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export default function AdminUserDetailPage() {
  const router = useRouter();
  const locale = useLocale();
  const common = useTranslations('common');
  const t = useTranslations('admin');
  const { id } = useParams();
  const [jwt, setJwt] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) { router.replace(`/${locale}/login`); return; }
    setJwt(token);
  }, [router, locale]);

  useEffect(() => {
    if (!jwt || !id) return;
    setLoading(true);
    fetch(`${base}/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const u = await r.json();
        setUser(u);
        setEdit(u);
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailedUser')))
      .finally(() => setLoading(false));
  }, [jwt, id, base]);

  const handleChange = (field: string, value: any) => {
    setEdit((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!jwt || !id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${base}/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error(t('updateFailed'));
      const updated = await res.json();
      setUser(updated);
      setEdit(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!jwt || !id) return;
    if (!confirm(t('confirmDeleteUser'))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${base}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      router.replace(`/${locale}/admin`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6">{common('loading')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!user) return <div className="p-6 text-gray-400">{t('userNotFound')}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2">{t('userDetailsTitle')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(edit).map(([key, value]) => (
          <div key={key} className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">{key}</label>
            <input
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700"
              value={typeof value === 'string' || typeof value === 'number' ? value : (value ? JSON.stringify(value) : "")}
              onChange={e => handleChange(key, e.target.value)}
              disabled={key === "id"}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-turquoise text-black font-semibold"
        >{saving ? t('saving') : t('saveChanges')}</button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 rounded bg-red-700 text-white border border-red-600"
        >{deleting ? t('deleting') : t('deleteUser')}</button>
      </div>
      {/* Related resources */}
      <WalletSection userId={user.id} jwt={jwt!} />
      <PointsSection userId={user.id} jwt={jwt!} />
      <RebatesSection userId={user.id} jwt={jwt!} />
      <WithdrawalsSection userId={user.id} jwt={jwt!} />
      <DepositsSection userId={user.id} jwt={jwt!} />
      <PackagesSection userId={user.id} jwt={jwt!} />
      <AwardsSection userId={user.id} jwt={jwt!} />
      <TicketsSection userId={user.id} jwt={jwt!} />
    </div>
  );
}
