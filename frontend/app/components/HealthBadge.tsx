"use client";
import { useEffect, useState } from "react";

export default function HealthBadge() {
  const [status, setStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch("http://localhost:4000/api/health", { cache: "no-store" });
      if (res.ok) setStatus("online"); else setStatus("offline");
    } catch {
      setStatus("offline");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { check(); }, []);

  const color = status === "online" ? "bg-green-600" : status === "offline" ? "bg-red-600" : "bg-gray-500";
  const label = status === "online" ? "Online" : status === "offline" ? "Offline" : "Unknown";

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center px-3 py-1 rounded text-white text-sm ${color}`}>Backend: {label}</span>
      <button
        onClick={check}
        className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        disabled={checking}
      >{checking ? "Checking…" : "Recheck"}</button>
    </div>
  );
}
