import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  formatBangkok,
  LeadsError,
  leadsErrorText,
  leadsFetch,
  safeHttpUrl,
  type Lead,
  type LeadDetail,
  type LeadStatus,
  type Touch,
} from "@/lib/leads-api";

export function LeadDetailView({
  token,
  id,
  onLogout,
}: {
  token: string;
  id: string;
  onLogout: (message: string) => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [pain, setPain] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    leadsFetch<LeadDetail>(token, `/api/leads/${id}`)
      .then((next) => {
        if (!active) return;
        setDetail(next);
        setNotes(next.lead.notes);
        setPain(next.lead.pain_point);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof LeadsError && reason.status === 401) {
          onLogout(leadsErrorText(reason));
          return;
        }
        setError(leadsErrorText(reason));
      });
    return () => {
      active = false;
    };
  }, [token, id, onLogout]);

  async function save(body: Record<string, unknown>, saved: string) {
    setMessage("");
    try {
      const updated = await leadsFetch<{ lead: Lead; suppressed: boolean }>(
        token,
        `/api/leads/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
      setDetail((current) =>
        current ? { ...current, lead: updated.lead, suppressed: updated.suppressed } : current,
      );
      setNotes(updated.lead.notes);
      setPain(updated.lead.pain_point);
      setMessage(saved);
    } catch (reason) {
      setMessage(leadsErrorText(reason));
    }
  }

  if (error) {
    return (
      <div>
        <Back />
        <p className="mt-6 text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!detail) return <p>กำลังโหลด</p>;
  const { lead, touches, suppressed } = detail;

  return (
    <div>
      <Back />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">{lead.business_name}</h1>
          <p className="mt-2 text-muted-foreground">
            {[lead.industry, lead.domain].filter(Boolean).join(" · ") || "ไม่มีโดเมน"}
          </p>
        </div>
        <p className="font-serif text-4xl tabular-nums">{lead.fit_score}</p>
      </div>
      {suppressed ? (
        <p className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm">
          อีเมลหรือโดเมนนี้อยู่ในรายการยกเลิกรับ ระบบจะไม่ให้บันทึกการส่งออก
        </p>
      ) : null}
      <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
        <Info label="อีเมล" value={lead.email || "—"} />
        <Info label="โทร" value={lead.phone || "—"} />
        <Info label="LINE" value={lead.line_id || "—"} />
        <Info label="เว็บ" value={<External href={lead.website} />} />
        <Info label="ที่มา" value={<External href={lead.source_url} />} />
      </dl>
      <label className="mt-6 block text-sm" htmlFor="lead-status">
        สถานะ
      </label>
      <select
        id="lead-status"
        value={lead.status}
        onChange={(event) => {
          const next = event.target.value as LeadStatus;
          if (
            next === "opted_out" &&
            !window.confirm(
              "บันทึกว่ายกเลิกรับข่าว? ระบบจะไม่ส่งอีเมลหาอีเมลนี้และโดเมนบริษัทนี้อีก",
            )
          ) {
            return;
          }
          void save({ status: next }, "บันทึกสถานะแล้ว");
        }}
        className="mt-2 min-h-11 w-full rounded-2xl border border-border bg-card px-3 md:max-w-xs"
      >
        {LEAD_STATUSES.map((item) => (
          <option key={item} value={item}>
            {LEAD_STATUS_LABELS[item]}
          </option>
        ))}
      </select>
      <label className="mt-4 block text-sm" htmlFor="lead-pain">
        จุดเจ็บของเจ้าของ
      </label>
      <textarea
        id="lead-pain"
        value={pain}
        onChange={(event) => setPain(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-card px-3 py-2"
      />
      <label className="mt-4 block text-sm" htmlFor="lead-notes">
        โน้ต
      </label>
      <textarea
        id="lead-notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-card px-3 py-2"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save({ notes, pain_point: pain }, "บันทึกโน้ตแล้ว")}
          className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground"
        >
          บันทึกโน้ต
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(lead.unsubscribe_url).then(
              () => setMessage("คัดลอกลิงก์ยกเลิกรับอีเมลแล้ว"),
              () => setMessage(lead.unsubscribe_url),
            );
          }}
          className="min-h-11 rounded-full border border-border px-4 text-sm"
        >
          คัดลอกลิงก์ยกเลิกรับอีเมล
        </button>
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      </div>
      <h2 className="mt-10 font-serif text-2xl">ประวัติการติดต่อ</h2>
      {touches.length === 0 ? (
        <p className="mt-3 text-muted-foreground">ยังไม่มีการติดต่อ</p>
      ) : null}
      <ol className="mt-3 space-y-3">
        {touches.map((touch) => (
          <li key={touch.id} className="rounded-2xl border border-border bg-card p-4">
            <TouchRow touch={touch} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Back() {
  return (
    <Link to="/leads" className="text-sm text-primary">
      ← กลับไปไปป์ไลน์
    </Link>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  );
}

function External({ href }: { href: string }) {
  const safe = safeHttpUrl(href);
  if (!safe) return "—";
  return (
    <a href={safe} target="_blank" rel="noreferrer">
      {safe}
    </a>
  );
}

function TouchRow({ touch }: { touch: Touch }) {
  const channel = touch.channel === "line" ? "LINE" : "อีเมล";
  const direction = touch.direction === "inbound" ? "ตอบเข้า" : "ส่งออก";
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {formatBangkok(touch.sent_at)} · {channel} · {direction}
      </p>
      {touch.subject ? <p className="mt-1 font-medium">{touch.subject}</p> : null}
      {touch.summary ? <p className="mt-1 whitespace-pre-wrap">{touch.summary}</p> : null}
    </>
  );
}
