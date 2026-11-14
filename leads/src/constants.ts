export const STATUSES = [
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

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
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

const CONTACTED: ReadonlySet<Status> = new Set([
  "contacted",
  "replied",
  "talking",
  "proposal",
  "won",
  "lost",
  "bounced",
]);

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function statusWasContacted(status: Status): boolean {
  return CONTACTED.has(status);
}

export const LIMITS = {
  businessName: 200,
  industry: 120,
  website: 500,
  email: 254,
  phone: 40,
  lineId: 80,
  sourceUrl: 500,
  notes: 4000,
  painPoint: 2000,
  subject: 300,
  summary: 2000,
  clientRef: 120,
  search: 200,
  bulk: 100,
  check: 100,
  bodyBytes: 1_000_000,
  page: 100,
  lineUrl: 500,
} as const;

export const CHANNELS = ["email", "line", "imessage", "whatsapp"] as const;

export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && (CHANNELS as readonly string[]).includes(value);
}

/** Mailbox providers. Opting out one address must not suppress the whole provider. */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.th",
  "outlook.com",
  "outlook.co.th",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.th",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "aol.com",
  "gmx.com",
  "mail.com",
  "windowslive.com",
  "qq.com",
  "163.com",
  "naver.com",
  "hanmail.net",
]);

/** Hosts that are not a business's own domain. */
export const PLATFORM_HOSTS: ReadonlySet<string> = new Set([
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "instagram.com",
  "line.me",
  "lin.ee",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "google.com",
  "goo.gl",
  "bit.ly",
  "shopee.co.th",
  "lazada.co.th",
  "twitter.com",
  "x.com",
]);

export function isPublicMailbox(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}

export function isPlatformHost(domain: string): boolean {
  return PLATFORM_HOSTS.has(domain);
}

export function isCompanyDomain(domain: string): boolean {
  return domain !== "" && !isPublicMailbox(domain) && !isPlatformHost(domain);
}
