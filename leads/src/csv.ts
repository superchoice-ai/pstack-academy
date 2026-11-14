import { LIMITS } from "./constants";
import { canonicalSource, canonicalWebsite, normalizeEmail } from "./normalize";

export const SEND_STATUSES = ["queued", "sent", "failed", "bounced"] as const;

export type SendStatus = (typeof SEND_STATUSES)[number];

export type SendLogRow = {
  business_name: string;
  industry: string;
  email: string;
  website: string;
  source_url: string;
  reason: string;
  send_status: SendStatus;
  subject: string;
  sent_at: string;
};

export type ParsedSend = { ok: true; value: SendLogRow } | { ok: false; error: string };

const REQUIRED = [
  "date",
  "business",
  "industry",
  "email",
  "website",
  "source_url",
  "reason",
  "status",
  "subject",
] as const;

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function isSendStatus(value: string): value is SendStatus {
  return (SEND_STATUSES as readonly string[]).includes(value);
}

/** Noon in Thailand, so a date-only cell stays on that Bangkok day. */
export function parseSendDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T05:00:00.000Z`;
  if (
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed) &&
    !/[zZ+]/.test(trimmed) &&
    !trimmed.includes("+")
  ) {
    const normalized = trimmed.replace(" ", "T");
    const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
    const parsed = new Date(`${withSeconds}+07:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  if (year < 2020 || year > 2100) return null;
  return parsed.toISOString();
}

export function parseCsvTable(text: string): string[][] {
  const source = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((record) => record.some((value) => value.trim() !== ""));
}

function looseUrl(value: string, mode: "website" | "source"): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const direct = mode === "website" ? canonicalWebsite(trimmed) : canonicalSource(trimmed);
  if (direct !== null) return direct;
  const withScheme = canonicalWebsite(trimmed);
  return withScheme ?? "";
}

export function parseSendCsv(
  text: string,
): { ok: true; rows: ParsedSend[] } | { ok: false; error: string } {
  const table = parseCsvTable(text);
  const header = table[0]?.map((cell) => cell.trim()) ?? [];
  if (header.length === 0) return { ok: false, error: "invalid_csv" };
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length > 0) return { ok: false, error: "invalid_csv" };
  const body = table.slice(1);
  if (body.length > 1000) return { ok: false, error: "too_many_rows" };
  const index = new Map(header.map((name, position) => [name, position]));
  const rows = body.map((record) => parseSendRow(record, index));
  return { ok: true, rows };
}

function cell(record: string[], index: Map<string, number>, name: string): string {
  const position = index.get(name);
  if (position === undefined) return "";
  return record[position] ?? "";
}

function parseSendRow(record: string[], index: Map<string, number>): ParsedSend {
  const business = clip(cell(record, index, "business"), LIMITS.businessName);
  if (!business) return { ok: false, error: "business_name_required" };
  const email = normalizeEmail(cell(record, index, "email"));
  if (!email) return { ok: false, error: "invalid_email" };
  const status = cell(record, index, "status").trim().toLowerCase();
  if (!isSendStatus(status)) return { ok: false, error: "invalid_status" };
  const sentAt = parseSendDate(cell(record, index, "date"));
  if (!sentAt) return { ok: false, error: "invalid_date" };
  return {
    ok: true,
    value: {
      business_name: business,
      industry: clip(cell(record, index, "industry"), LIMITS.industry),
      email,
      website: looseUrl(cell(record, index, "website"), "website"),
      source_url: looseUrl(cell(record, index, "source_url"), "source"),
      reason: clip(cell(record, index, "reason"), LIMITS.painPoint),
      send_status: status,
      subject: clip(cell(record, index, "subject"), LIMITS.subject),
      sent_at: sentAt,
    },
  };
}

export function sendRef(email: string, sentAt: string, status: SendStatus): string {
  return `csv:${email}:${sentAt.slice(0, 10)}:${status}`;
}
