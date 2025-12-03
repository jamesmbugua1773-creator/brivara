"use client";
import React, { useEffect, useState } from "react";

export default function TicketsSection({ userId, jwt }: { userId: string, jwt: string }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState<string>("");
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE || `http://${window.location.hostname}:4000/api`) : "";

  useEffect(() => {
    if (!userId || !jwt) return;
    setLoading(true);
    fetch(`${base}/admin/tickets?userId=${userId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to fetch tickets");
        const data = await r.json();
        setTickets(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId, jwt, base]);
  if (loading) return <div>Loading tickets…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const filtered = tickets.filter(t =>
    !search ||
    t.id.includes(search) ||
    (t.status && t.status.includes(search)) ||
    (t.subject && t.subject.includes(search))
  );

  return (
    <div className="mb-6 p-4 border rounded bg-slate-900">
      <button className="w-full text-left text-lg font-semibold mb-2 flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        Support Tickets
        <span className="ml-2">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mb-2 flex gap-2 items-center">
            <input
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700"
              placeholder="Search by ID, status, subject"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-800">
                  <th className="p-2">ID</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Message</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Admin Reply</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-slate-700">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">{t.category}</td>
                    <td className="p-2">{t.subject}</td>
                    <td className="p-2">{t.message}</td>
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">{t.adminReply ?? ""}</td>
                    <td className="p-2">
                      {/* Add edit/delete/reply logic here if needed */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
