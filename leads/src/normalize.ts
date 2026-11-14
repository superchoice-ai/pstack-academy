import { isChannel, isCompanyDomain, isPublicMailbox, isStatus, LIMITS, type Channel, type Status } from "./constants";
import { isLeadId } from "./tokens";

export type LeadInput = {
  business_name: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  line_id: string;
  line_url: string;
  source_url: string;
  fit_score: number;
  fit_score_set: boolean;
  notes: string;
  pain_point: string;
  domain: string;
  email_domain: string;
};

export type FieldResult = { ok: true; value: string } | { ok: false; error: string };

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (!email) return "";
  if (email.length > LIMITS.email || !EMAIL.test(email)) return null;
  return email;
}

export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return "";
  let host = raw;
  if (host.includes("://") || host.startsWith("//")) {
    try {
      host = new URL(host.includes("://") ? host : `https:${host}`).hostname;
    } catch {
      return null;
    }
  } else {
    host = host.split("/")[0]?.split(":")[0] ?? "";
  }
  if (host.startsWith("www.")) host = host.slice(4);
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (host.length > 253 || !host.includes(".") || !/^[a-z0-9.-]+$/.test(host)) return null;
  return host;
}

export function emailDomainOf(email: string): string {
  if (!email.includes("@")) return "";
  return normalizeDomain(email.slice(email.lastIndexOf("@") + 1)) ?? "";
}

export function dedupeDomain(emailDomain: string, websiteHost: string): string {
  if (isCompanyDomain(websiteHost)) return websiteHost;
  if (isCompanyDomain(emailDomain)) return emailDomain;
  return "";
}

export function suppressionDomains(domain: string, emailDomain: string): string[] {
  const found: string[] = [];
  if (isCompanyDomain(domain)) found.push(domain);
  if (isCompanyDomain(emailDomain) && emailDomain !== domain) found.push(emailDomain);
  return found;
}

export function canonicalWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  const canonical = url.toString();
  if (canonical.length > LIMITS.website) return null;
  return canonical;
}

export function canonicalSource(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const canonical = url.toString();
    if (canonical.length > LIMITS.sourceUrl) return null;
    return canonical;
  } catch {
    return null;
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
  max: number,
): { ok: true; value: string } | { ok: false } {
  if (!(key in record) || record[key] == null) return { ok: true, value: "" };
  const raw = record[key];
  if (typeof raw !== "string") return { ok: false };
  const value = raw.trim();
  if (value.length > max) return { ok: false };
  return { ok: true, value };
}

export function parseLead(
  value: unknown,
): { ok: true; value: LeadInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "invalid_lead" };
  const record = value as Record<string, unknown>;
  const business = readString(record, "business_name", LIMITS.businessName);
  if (!business.ok) return { ok: false, error: "invalid_business_name" };
  if (!business.value) return { ok: false, error: "business_name_required" };
  const industry = readString(record, "industry", LIMITS.industry);
  if (!industry.ok) return { ok: false, error: "invalid_industry" };
  const websiteRaw = readString(record, "website", LIMITS.website);
  if (!websiteRaw.ok) return { ok: false, error: "invalid_website" };
  const website = canonicalWebsite(websiteRaw.value);
  if (website === null) return { ok: false, error: "invalid_website" };
  const emailRaw = readString(record, "email", LIMITS.email);
  if (!emailRaw.ok) return { ok: false, error: "invalid_email" };
  const email = normalizeEmail(emailRaw.value);
  if (email === null) return { ok: false, error: "invalid_email" };
  const phone = readString(record, "phone", LIMITS.phone);
  if (!phone.ok) return { ok: false, error: "invalid_phone" };
  const lineId = readString(record, "line_id", LIMITS.lineId);
  if (!lineId.ok) return { ok: false, error: "invalid_line_id" };
  const lineUrlRaw = readString(record, "line_url", LIMITS.lineUrl);
  if (!lineUrlRaw.ok) return { ok: false, error: "invalid_line_url" };
  const lineUrl = canonicalSource(lineUrlRaw.value);
  if (lineUrl === null) return { ok: false, error: "invalid_line_url" };
  const sourceRaw = readString(record, "source_url", LIMITS.sourceUrl);
  if (!sourceRaw.ok) return { ok: false, error: "invalid_source_url" };
  const source = canonicalSource(sourceRaw.value);
  if (source === null) return { ok: false, error: "invalid_source_url" };
  const notes = readString(record, "notes", LIMITS.notes);
  if (!notes.ok) return { ok: false, error: "invalid_notes" };
  const pain = readString(record, "pain_point", LIMITS.painPoint);
  if (!pain.ok) return { ok: false, error: "invalid_pain_point" };

  let fitScore = 0;
  let fitScoreSet = false;
  if ("fit_score" in record && record.fit_score != null) {
    const score = record.fit_score;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100) {
      return { ok: false, error: "invalid_fit_score" };
    }
    fitScore = score;
    fitScoreSet = true;
  }

  const websiteHost = website ? (normalizeDomain(website) ?? "") : "";
  const emailDomain = emailDomainOf(email);
  const domain = dedupeDomain(emailDomain, websiteHost);
  if (!email && !domain) return { ok: false, error: "needs_email_or_domain" };

  return {
    ok: true,
    value: {
      business_name: business.value,
      industry: industry.value,
      website,
      email,
      phone: phone.value,
      line_id: lineId.value,
      line_url: lineUrl,
      source_url: source,
      fit_score: fitScore,
      fit_score_set: fitScoreSet,
      notes: notes.value,
      pain_point: pain.value,
      domain,
      email_domain: emailDomain,
    },
  };
}

export type TouchInput = {
  lead_id: string;
  email: string;
  channel: Channel;
  direction: "outbound" | "inbound";
  subject: string;
  summary: string;
  sent_at: string;
  client_ref: string;
};

export function parseTouch(
  value: unknown,
  nowIso: string,
): { ok: true; value: TouchInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "invalid_body" };
  const record = value as Record<string, unknown>;
  const leadId = readString(record, "lead_id", 36);
  if (!leadId.ok) return { ok: false, error: "invalid_id" };
  if (leadId.value && !isLeadId(leadId.value)) return { ok: false, error: "invalid_id" };
  const emailRaw = readString(record, "email", LIMITS.email);
  if (!emailRaw.ok) return { ok: false, error: "invalid_email" };
  const email = normalizeEmail(emailRaw.value);
  if (email === null) return { ok: false, error: "invalid_email" };
  if (!leadId.value && !email) return { ok: false, error: "needs_lead" };
  const channel = record.channel;
  if (!isChannel(channel)) return { ok: false, error: "invalid_channel" };
  const direction = record.direction;
  if (direction !== "outbound" && direction !== "inbound")
    return { ok: false, error: "invalid_direction" };
  const subject = readString(record, "subject", LIMITS.subject);
  if (!subject.ok) return { ok: false, error: "invalid_subject" };
  const summary = readString(record, "summary", LIMITS.summary);
  if (!summary.ok) return { ok: false, error: "invalid_summary" };
  const clientRef = readString(record, "client_ref", LIMITS.clientRef);
  if (!clientRef.ok) return { ok: false, error: "invalid_client_ref" };
  if (clientRef.value && !/^[A-Za-z0-9._:-]+$/.test(clientRef.value)) {
    return { ok: false, error: "invalid_client_ref" };
  }
  let sentAt = nowIso;
  if ("sent_at" in record && record.sent_at != null) {
    if (typeof record.sent_at !== "string") return { ok: false, error: "invalid_sent_at" };
    const parsed = new Date(record.sent_at);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "invalid_sent_at" };
    const year = parsed.getUTCFullYear();
    if (year < 2020 || year > 2100) return { ok: false, error: "invalid_sent_at" };
    sentAt = parsed.toISOString();
  }
  return {
    ok: true,
    value: {
      lead_id: leadId.value.toLowerCase(),
      email,
      channel,
      direction,
      subject: subject.value,
      summary: summary.value,
      sent_at: sentAt,
      client_ref: clientRef.value,
    },
  };
}

export type LeadPatch = {
  business_name?: string;
  industry?: string;
  phone?: string;
  line_id?: string;
  line_url?: string;
  notes?: string;
  pain_point?: string;
  fit_score?: number;
  status?: Status;
};

export function parsePatch(
  value: unknown,
): { ok: true; value: LeadPatch } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "invalid_body" };
  const record = value as Record<string, unknown>;
  const patch: LeadPatch = {};
  if ("business_name" in record) {
    const business = readString(record, "business_name", LIMITS.businessName);
    if (!business.ok || !business.value) return { ok: false, error: "invalid_business_name" };
    patch.business_name = business.value;
  }
  if ("industry" in record) {
    const industry = readString(record, "industry", LIMITS.industry);
    if (!industry.ok) return { ok: false, error: "invalid_industry" };
    patch.industry = industry.value;
  }
  if ("phone" in record) {
    const phone = readString(record, "phone", LIMITS.phone);
    if (!phone.ok) return { ok: false, error: "invalid_phone" };
    patch.phone = phone.value;
  }
  if ("line_id" in record) {
    const lineId = readString(record, "line_id", LIMITS.lineId);
    if (!lineId.ok) return { ok: false, error: "invalid_line_id" };
    patch.line_id = lineId.value;
  }
  if ("line_url" in record) {
    const lineUrlRaw = readString(record, "line_url", LIMITS.lineUrl);
    if (!lineUrlRaw.ok) return { ok: false, error: "invalid_line_url" };
    const lineUrl = canonicalSource(lineUrlRaw.value);
    if (lineUrl === null) return { ok: false, error: "invalid_line_url" };
    patch.line_url = lineUrl;
  }
  if ("notes" in record) {
    const notes = readString(record, "notes", LIMITS.notes);
    if (!notes.ok) return { ok: false, error: "invalid_notes" };
    patch.notes = notes.value;
  }
  if ("pain_point" in record) {
    const pain = readString(record, "pain_point", LIMITS.painPoint);
    if (!pain.ok) return { ok: false, error: "invalid_pain_point" };
    patch.pain_point = pain.value;
  }
  if ("fit_score" in record) {
    const score = record.fit_score;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100) {
      return { ok: false, error: "invalid_fit_score" };
    }
    patch.fit_score = score;
  }
  if ("status" in record) {
    if (!isStatus(record.status)) return { ok: false, error: "invalid_status" };
    patch.status = record.status;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "empty_patch" };
  return { ok: true, value: patch };
}

export type OptOutInput = { email: string; domain: string; lead_id: string };

export function parseOptOut(
  value: unknown,
): { ok: true; value: OptOutInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "invalid_body" };
  const record = value as Record<string, unknown>;
  const leadId = readString(record, "lead_id", 36);
  if (!leadId.ok) return { ok: false, error: "invalid_id" };
  if (leadId.value && !isLeadId(leadId.value)) return { ok: false, error: "invalid_id" };
  const emailRaw = readString(record, "email", LIMITS.email);
  if (!emailRaw.ok) return { ok: false, error: "invalid_email" };
  const email = normalizeEmail(emailRaw.value);
  if (email === null) return { ok: false, error: "invalid_email" };
  const domainRaw = readString(record, "domain", 253);
  if (!domainRaw.ok) return { ok: false, error: "invalid_domain" };
  const domain = normalizeDomain(domainRaw.value);
  if (domain === null) return { ok: false, error: "invalid_domain" };
  if (domain && isPublicMailbox(domain)) return { ok: false, error: "public_mailbox_domain" };
  if (domain && !isCompanyDomain(domain)) return { ok: false, error: "platform_domain" };
  if (!email && !domain && !leadId.value) return { ok: false, error: "needs_email_or_domain" };
  return { ok: true, value: { email, domain, lead_id: leadId.value.toLowerCase() } };
}

export function showInput(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, LIMITS.email) : "";
}
