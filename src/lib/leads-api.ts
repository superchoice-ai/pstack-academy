export const DEFAULT_LEADS_API_BASE = "https://superchoice-leads.auichai-s2.workers.dev";

const TOKEN_KEY = "sc-leads-token";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "replied",
  "talking",
  "proposal",
  "won",
  "lost",
  "opted_out",
  "bounced",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  replied: "ตอบกลับ",
  talking: "กำลังคุย",
  proposal: "ข้อเสนอ",
  won: "ปิดการขาย",
  lost: "ไม่สำเร็จ",
  opted_out: "ยกเลิกรับ",
  bounced: "ตีกลับ",
};

export type Lead = {
  id: string;
  business_name: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  line_id: string;
  source_url: string;
  fit_score: number;
  notes: string;
  pain_point: string;
  status: LeadStatus;
  domain: string;
  created_at: string;
  updated_at: string;
  unsubscribe_url: string;
};

export type Touch = {
  id: string;
  lead_id: string;
  channel: "email" | "line";
  direction: "outbound" | "inbound";
  subject: string;
  summary: string;
  sent_at: string;
  client_ref: string;
};

export type LeadStats = {
  timezone: string;
  funnel: Record<LeadStatus, number>;
  totals: {
    leads: number;
    outbound: number;
    inbound: number;
    reply_rate: number | null;
    lead_reply_rate: number | null;
  };
  today: {
    date: string;
    sends: number;
    replies: number;
    reply_rate: number | null;
  };
};

export type LeadList = { leads: Lead[]; total: number; limit: number; offset: number };

export type LeadDetail = { lead: Lead; touches: Touch[]; suppressed: boolean };

export class LeadsError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "LeadsError";
    this.status = status;
    this.code = code;
  }
}

export function leadsApiBase(): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env["VITE_LEADS_API_BASE"];
  if (typeof value === "string" && value.trim()) return value.trim().replace(/\/$/, "");
  return DEFAULT_LEADS_API_BASE;
}

export function readLeadsToken(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function writeLeadsToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearLeadsToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function formatRate(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatBangkok(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function safeHttpUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function leadsErrorText(error: unknown): string {
  if (error instanceof LeadsError) {
    if (error.status === 401) return "โทเค็นไม่ถูกต้อง";
    if (error.status === 503) return "ยังไม่ได้ตั้งค่า secret บน Worker";
    if (error.code === "not_found") return "ไม่พบลีดนี้";
  }
  return "เชื่อมต่อระบบลีดไม่สำเร็จ";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function leadsFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetchImpl(`${leadsApiBase()}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      isRecord(body) && typeof body["error"] === "string" ? body["error"] : "request_failed";
    throw new LeadsError(response.status, code);
  }
  return body as T;
}
