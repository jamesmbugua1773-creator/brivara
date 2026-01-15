"use client";
import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from 'next-intl';

type Profile = {
  id: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  created_at: string | null;
  lastLogin: string | null;
  status: string | null;
  currentPackage: string | null;
  activationDate: string | null;
  profileImageUrl: string | null;
  withdraw_wallet_bep20?: string | null;
};

export default function ProfilePage() {
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const t = useTranslations('profile');
  const buttons = useTranslations('buttons');

  const [data, setData] = useState<Profile | null>(null);
  const [form, setForm] = useState<{ name: string; phone: string; country: string; withdraw_wallet_bep20: string }>({ name: "", phone: "", country: "", withdraw_wallet_bep20: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("brivara_jwt") : null;
    if (!token) {
      window.location.replace(`/${locale}/login`);
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
    setLoading(true);
    fetch(`${base}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Profile;
        setData(json);
        setForm({
          name: json?.name ?? "",
          phone: json?.phone ?? "",
          country: json?.country ?? "",
          withdraw_wallet_bep20: json?.withdraw_wallet_bep20 ?? "",
        });
        setError(null);
      })
      .catch((e) => setError(e?.message || t('loadFailed')))
      .finally(() => setLoading(false));
  }, [locale, t]);

  if (loading) return <div className="p-6">{common('loading')}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{nav('profile')}</h1>
      {success && <div className="text-green-500 text-sm">{success}</div>}
      {saving && <div className="text-sm text-gray-400">{t('saving')}</div>}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t('username')} value={data?.username ?? "—"} />
        <Field label={t('email')} value={data?.email ?? "—"} />
        <Field label={t('status')} value={data?.status ?? "—"} />
        <Field label={t('currentPackage')} value={data?.currentPackage ?? "—"} />
        <Field label={t('activationDate')} value={formatDate(data?.activationDate)} />
        <Field label={t('created')} value={formatDate(data?.created_at)} />
        <Field label={t('lastLogin')} value={formatDate(data?.lastLogin)} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">{t('editTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label={t('name')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <InputField label={t('phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder={t('phonePlaceholder')} />
          <InputField label={t('country')} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <InputField label={t('bep20WithdrawAddress')} value={form.withdraw_wallet_bep20} onChange={(v) => setForm({ ...form, withdraw_wallet_bep20: v })} placeholder={t('bep20Placeholder')} />
        </div>
        <button
          className="px-4 py-2 rounded bg-turquoise text-slate-900 font-medium hover:opacity-90"
          onClick={async () => {
            setSaving(true);
            setSuccess(null);
            setError(null);
            try {
              const token = localStorage.getItem("brivara_jwt");
              if (!token) throw new Error(t('unauthorized'));
              const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
              const res = await fetch(`${base}/profile/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: form.name, phone: form.phone, country: form.country, withdraw_wallet_bep20: form.withdraw_wallet_bep20 }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const updated = (await res.json()) as Partial<Profile>;
              setData((prev) => ({
                ...(prev as Profile),
                name: updated.name ?? form.name,
                phone: updated.phone ?? form.phone,
                country: updated.country ?? form.country,
                withdraw_wallet_bep20: updated.withdraw_wallet_bep20 ?? form.withdraw_wallet_bep20,
              }));
              setSuccess(t('updatedSuccess'));
            } catch (e: any) {
              setError(e?.message || t('updateFailed'));
            } finally {
              setSaving(false);
            }
          }}
        >{buttons('save')}</button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="border rounded-md p-3">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-turquoise"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function formatDate(input: string | null | undefined) {
  if (!input) return "—";
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}
