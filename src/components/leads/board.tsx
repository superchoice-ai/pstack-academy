import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  formatRate,
  LeadsError,
  leadsErrorText,
  leadsFetch,
  type Lead,
  type LeadList,
  type LeadStats,
  type LeadStatus,
} from "@/lib/leads-api";

const PAGE = 50;

export function LeadsBoard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: (message: string) => void;
}) {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", String(PAGE));
      params.set("offset", String(offset));
      setLoading(true);
      Promise.all([
        leadsFetch<LeadStats>(token, "/api/stats"),
        leadsFetch<LeadList>(token, `/api/leads?${params.toString()}`),
      ])
        .then(([nextStats, page]) => {
          setStats(nextStats);
          setLeads(page.leads);
          setTotal(page.total);
          setError("");
        })
        .catch((reason: unknown) => {
          if (reason instanceof LeadsError && reason.status === 401) {
            onLogout(leadsErrorText(reason));
            return;
          }
          setError(leadsErrorText(reason));
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [token, status, query, offset, onLogout]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            SuperChoice
          </p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">ไปป์ไลน์ลูกค้า</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            บันทึกธุรกิจที่ผู้ช่วยค้นคว้าและอีเมลที่ส่งจาก superchoice@hotmail.com
          </p>
        </div>
        <button
          type="button"
          onClick={() => onLogout("")}
          className="min-h-11 rounded-full border border-border px-4 text-sm"
        >
          ออกจากระบบ
        </button>
      </div>

      {stats ? (
        <>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <Stat
              label="ส่งออกวันนี้"
              value={String(stats.today.sends)}
              note={`${stats.today.date} เวลาไทย`}
            />
            <Stat
              label="ตอบกลับวันนี้"
              value={String(stats.today.replies)}
              note={`อัตราวันนี้ ${formatRate(stats.today.reply_rate)}`}
            />
            <Stat
              label="อัตราตอบกลับ"
              value={formatRate(stats.totals.reply_rate)}
              note={`ตลอดรายการ ${stats.totals.outbound} ส่ง / ${stats.totals.inbound} ตอบ`}
            />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {LEAD_STATUSES.map((item) => {
              const pressed = status === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => {
                    setOffset(0);
                    setStatus(pressed ? "" : item);
                  }}
                  className={`min-h-16 min-w-24 shrink-0 rounded-2xl border px-3 py-2 text-left ${
                    pressed ? "border-foreground" : "border-border bg-card"
                  } ${item === "won" ? "bg-secondary" : ""} ${
                    item === "lost" || item === "opted_out" || item === "bounced" ? "bg-accent" : ""
                  }`}
                >
                  <span className="block font-serif text-2xl tabular-nums">
                    {stats.funnel[item] ?? 0}
                  </span>
                  <span className="text-sm">{LEAD_STATUS_LABELS[item]}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="leads-q">
          ค้นหา
        </label>
        <input
          id="leads-q"
          type="search"
          value={query}
          placeholder="ชื่อธุรกิจ อีเมล โดเมน LINE หรือเบอร์"
          onChange={(event) => {
            setOffset(0);
            setQuery(event.target.value);
          }}
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-border bg-card px-3"
        />
      </div>
      <p className="mt-3 min-h-5 text-sm text-destructive" role="alert">
        {error}
      </p>
      <p className="text-sm text-muted-foreground">
        {loading ? "กำลังโหลด" : `แสดง ${leads.length} จาก ${total}`}
        {status ? ` · ${LEAD_STATUS_LABELS[status]}` : ""}
      </p>

      <ul className="mt-4 space-y-3 lg:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <LeadCard lead={lead} />
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full border-separate border-spacing-y-2 text-left">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3">ธุรกิจ</th>
              <th className="px-3">อีเมล</th>
              <th className="px-3">คะแนน</th>
              <th className="px-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="bg-card">
                <td className="rounded-l-2xl border-y border-s border-border px-3 py-3">
                  <Link to="/leads/$id" params={{ id: lead.id }} className="font-medium">
                    {lead.business_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {[lead.industry, lead.domain].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="border-y border-border px-3 text-sm">
                  {lead.email || "ไม่มีอีเมล"}
                </td>
                <td className="border-y border-border px-3 tabular-nums">{lead.fit_score}</td>
                <td className="rounded-r-2xl border-y border-e border-border px-3">
                  <StatusPill status={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && leads.length === 0 ? <p className="mt-6">ไม่พบลีด</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={offset <= 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE))}
          className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        <button
          type="button"
          disabled={offset + PAGE >= total}
          onClick={() => setOffset(offset + PAGE)}
          className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-40"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-4xl tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </article>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex rounded-full border border-border px-2 py-1 text-xs">
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      to="/leads/$id"
      params={{ id: lead.id }}
      className="block rounded-3xl border border-border border-s-4 border-s-primary bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-2xl leading-tight">{lead.business_name}</h2>
        <span className="font-serif text-2xl tabular-nums">{lead.fit_score}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {[lead.industry, lead.domain].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-2 break-all text-sm">{lead.email || "ไม่มีอีเมล"}</p>
      <div className="mt-3">
        <StatusPill status={lead.status} />
      </div>
    </Link>
  );
}
