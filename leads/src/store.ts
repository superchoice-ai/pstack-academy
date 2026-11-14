import { sendRef, type SendLogRow } from "./csv";
import { isChannel, isCompanyDomain, isStatus, STATUSES, statusWasContacted, type Channel, type Status } from "./constants";
import type { BoundStatement, LeadDb } from "./db";
import {
  emailDomainOf,
  suppressionDomains,
  type LeadInput,
  type LeadPatch,
  type OptOutInput,
  type TouchInput,
} from "./normalize";
import { BANGKOK, bangkokDay, rate } from "./time";

export type LeadRow = {
  id: string;
  business_name: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  line_id: string;
  line_url: string;
  source_url: string;
  fit_score: number;
  notes: string;
  pain_point: string;
  status: Status;
  domain: string;
  email_domain: string;
  created_at: string;
  updated_at: string;
};

export type TouchRow = {
  id: string;
  lead_id: string;
  channel: Channel;
  direction: "outbound" | "inbound";
  subject: string;
  summary: string;
  sent_at: string;
  client_ref: string;
  created_at: string;
};

export type UpsertOutcome = {
  index: number;
  action: "created" | "updated" | "duplicate" | "skipped" | "rejected";
  id?: string;
  status?: Status;
  match?: "email" | "domain";
  reason?: "opted_out";
  error?: string;
};

export type EmailCheck = {
  email: string;
  lead_id: string | null;
  status: Status | null;
  opted_out: boolean;
  bounced: boolean;
  contacted: boolean;
  error?: string;
};

export type DomainCheck = {
  domain: string;
  opted_out: boolean;
  contacted: boolean;
  lead_count: number;
  statuses: Status[];
  error?: string;
};

export type Funnel = Record<Status, number>;

export type Overview = {
  timezone: typeof BANGKOK;
  funnel: Funnel;
  totals: {
    leads: number;
    outbound: number;
    inbound: number;
    reply_rate: number | null;
    lead_reply_rate: number | null;
  };
  today: DayStat;
  sends_per_day: DayPoint[];
};

export type DayStat = {
  date: string;
  sends: number;
  replies: number;
  reply_rate: number | null;
  new_leads: number;
  funnel: Funnel;
};

export type DayPoint = {
  date: string;
  sends: number;
  replies: number;
  reply_rate: number | null;
  new_leads: number;
};

type FilterColumn = "email" | "domain" | "email_domain" | "lead_id" | "id" | "client_ref";

const LEAD_SELECT =
  "SELECT id, business_name, industry, website, email, phone, line_id, line_url, source_url, fit_score, notes, pain_point, status, domain, email_domain, created_at, updated_at FROM leads";

const TOUCH_SELECT =
  "SELECT id, lead_id, channel, direction, subject, summary, sent_at, client_ref, created_at FROM touches";

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyFunnel(): Funnel {
  return {
    new: 0,
    contacted: 0,
    replied: 0,
    talking: 0,
    proposal: 0,
    won: 0,
    lost: 0,
    opted_out: 0,
    bounced: 0,
  };
}

function assertColumn(column: FilterColumn): FilterColumn {
  if (
    column !== "email" &&
    column !== "domain" &&
    column !== "email_domain" &&
    column !== "lead_id" &&
    column !== "id" &&
    column !== "client_ref"
  ) {
    throw new Error("bad_column");
  }
  return column;
}

async function queryIn<T>(
  db: LeadDb,
  base: string,
  column: FilterColumn,
  values: string[],
  joiner: "WHERE" | "AND" = "WHERE",
): Promise<T[]> {
  const unique = [...new Set(values.filter((value) => value !== ""))];
  const rows: T[] = [];
  const safeColumn = assertColumn(column);
  for (let index = 0; index < unique.length; index += 80) {
    const chunk = unique.slice(index, index + 80);
    const marks = chunk.map(() => "?").join(", ");
    const result = await db
      .prepare(`${base} ${joiner} ${safeColumn} IN (${marks})`)
      .bind(...chunk)
      .all<T>();
    rows.push(...(result.results ?? []));
  }
  return rows;
}

function readLead(row: Record<string, unknown>): LeadRow {
  if (!isStatus(row.status)) throw new Error("bad_status");
  return {
    id: String(row.id),
    business_name: String(row.business_name ?? ""),
    industry: String(row.industry ?? ""),
    website: String(row.website ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    line_id: String(row.line_id ?? ""),
    line_url: String(row.line_url ?? ""),
    source_url: String(row.source_url ?? ""),
    fit_score: num(row.fit_score),
    notes: String(row.notes ?? ""),
    pain_point: String(row.pain_point ?? ""),
    status: row.status,
    domain: String(row.domain ?? ""),
    email_domain: String(row.email_domain ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function readTouch(row: Record<string, unknown>): TouchRow {
  const channel = isChannel(row.channel) ? row.channel : null;
  const direction =
    row.direction === "inbound" ? "inbound" : row.direction === "outbound" ? "outbound" : null;
  if (!channel || !direction) throw new Error("bad_touch");
  return {
    id: String(row.id),
    lead_id: String(row.lead_id),
    channel,
    direction,
    subject: String(row.subject ?? ""),
    summary: String(row.summary ?? ""),
    sent_at: String(row.sent_at),
    client_ref: String(row.client_ref ?? ""),
    created_at: String(row.created_at),
  };
}

async function leadsBy(db: LeadDb, column: FilterColumn, values: string[]): Promise<LeadRow[]> {
  const rows = await queryIn<Record<string, unknown>>(db, LEAD_SELECT, column, values);
  return rows.map(readLead);
}

export async function getLeadRow(db: LeadDb, id: string): Promise<LeadRow | null> {
  const row = await db
    .prepare(`${LEAD_SELECT} WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? readLead(row) : null;
}

async function writeAll(db: LeadDb, statements: BoundStatement[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements);
}

function isUnique(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unique");
}

function insertLead(db: LeadDb, lead: LeadRow): BoundStatement {
  return db
    .prepare(
      `INSERT INTO leads (
        id, business_name, industry, website, email, phone, line_id, line_url, source_url,
        fit_score, notes, pain_point, status, domain, email_domain, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      lead.id,
      lead.business_name,
      lead.industry,
      lead.website,
      lead.email,
      lead.phone,
      lead.line_id,
      lead.line_url,
      lead.source_url,
      lead.fit_score,
      lead.notes,
      lead.pain_point,
      lead.status,
      lead.domain,
      lead.email_domain,
      lead.created_at,
      lead.updated_at,
    );
}

function updateLead(db: LeadDb, lead: LeadRow): BoundStatement {
  return db
    .prepare(
      `UPDATE leads SET
        business_name = ?, industry = ?, website = ?, email = ?, phone = ?, line_id = ?,
        line_url = ?, source_url = ?, fit_score = ?, notes = ?, pain_point = ?, status = ?,
        domain = ?, email_domain = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(
      lead.business_name,
      lead.industry,
      lead.website,
      lead.email,
      lead.phone,
      lead.line_id,
      lead.line_url,
      lead.source_url,
      lead.fit_score,
      lead.notes,
      lead.pain_point,
      lead.status,
      lead.domain,
      lead.email_domain,
      lead.updated_at,
      lead.id,
    );
}

function optOutInserts(
  db: LeadDb,
  leadId: string | null,
  email: string,
  domains: string[],
  source: string,
  now: string,
): BoundStatement[] {
  const statements: BoundStatement[] = [];
  if (email) {
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO opt_outs (id, email, domain, lead_id, source, created_at) VALUES (?, ?, '', ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), email, leadId, source, now),
    );
  }
  for (const domain of domains) {
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO opt_outs (id, email, domain, lead_id, source, created_at) VALUES (?, '', ?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), domain, leadId, source, now),
    );
  }
  return statements;
}

function siblingOptOut(
  db: LeadDb,
  domain: string,
  emailDomain: string,
  id: string,
  now: string,
): BoundStatement[] {
  return suppressionDomains(domain, emailDomain).map((value) =>
    db
      .prepare(
        `UPDATE leads SET status = 'opted_out', updated_at = ?
         WHERE id <> ? AND status <> 'opted_out' AND (domain = ? OR email_domain = ?)`,
      )
      .bind(now, id, value, value),
  );
}

async function tableSuppressed(db: LeadDb, lead: LeadRow): Promise<boolean> {
  if (lead.email) {
    const emailHit = await db
      .prepare("SELECT id FROM opt_outs WHERE email = ?")
      .bind(lead.email)
      .first();
    if (emailHit) return true;
  }
  const domains = suppressionDomains(lead.domain, lead.email_domain);
  if (domains.length === 0) return false;
  const rows = await queryIn<{ id: string }>(db, "SELECT id FROM opt_outs", "domain", domains);
  return rows.length > 0;
}

function contentChanged(before: LeadRow, after: LeadRow): boolean {
  return (
    before.business_name !== after.business_name ||
    before.industry !== after.industry ||
    before.website !== after.website ||
    before.email !== after.email ||
    before.phone !== after.phone ||
    before.line_id !== after.line_id ||
    before.line_url !== after.line_url ||
    before.source_url !== after.source_url ||
    before.fit_score !== after.fit_score ||
    before.notes !== after.notes ||
    before.pain_point !== after.pain_point ||
    before.domain !== after.domain ||
    before.email_domain !== after.email_domain
  );
}

function mergeLead(
  lead: LeadRow,
  input: LeadInput,
  now: string,
  domain: string,
  email: string,
): LeadRow {
  return {
    ...lead,
    business_name: input.business_name || lead.business_name,
    industry: input.industry || lead.industry,
    website: input.website || lead.website,
    email,
    phone: input.phone || lead.phone,
    line_id: input.line_id || lead.line_id,
    line_url: input.line_url || lead.line_url,
    source_url: input.source_url || lead.source_url,
    fit_score: input.fit_score_set ? input.fit_score : lead.fit_score,
    notes: input.notes || lead.notes,
    pain_point: input.pain_point || lead.pain_point,
    domain,
    email_domain: emailDomainOf(email),
    updated_at: now,
  };
}

function remember(
  lead: LeadRow,
  emailMap: Map<string, LeadRow>,
  domainMap: Map<string, LeadRow>,
  previousDomain: string,
): void {
  if (lead.email) emailMap.set(lead.email, lead);
  if (
    previousDomain &&
    previousDomain !== lead.domain &&
    domainMap.get(previousDomain)?.id === lead.id
  ) {
    domainMap.delete(previousDomain);
  }
  if (lead.domain) domainMap.set(lead.domain, lead);
}

function inputOptedOut(input: LeadInput, emails: Set<string>, domains: Set<string>): boolean {
  if (input.email && emails.has(input.email)) return true;
  if (input.domain && domains.has(input.domain)) return true;
  return isCompanyDomain(input.email_domain) && domains.has(input.email_domain);
}

export async function upsertLeads(
  db: LeadDb,
  items: Array<{ ok: true; value: LeadInput } | { ok: false; error: string }>,
  nowIso: string,
): Promise<UpsertOutcome[]> {
  const valid = items.flatMap((item) => (item.ok ? [item.value] : []));
  const emails = valid.flatMap((item) => (item.email ? [item.email] : []));
  const domains = valid.flatMap((item) =>
    [item.domain, item.email_domain].filter((value) => isCompanyDomain(value)),
  );
  const existing = [
    ...(await leadsBy(db, "email", emails)),
    ...(await leadsBy(db, "domain", domains)),
  ];
  existing.sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
  );
  const emailMap = new Map<string, LeadRow>();
  const domainMap = new Map<string, LeadRow>();
  for (const lead of existing) {
    if (lead.email && !emailMap.has(lead.email)) emailMap.set(lead.email, lead);
    if (lead.domain && !domainMap.has(lead.domain)) domainMap.set(lead.domain, lead);
  }

  const optedEmails = new Set(
    (await queryIn<{ email: string }>(db, "SELECT email FROM opt_outs", "email", emails)).map(
      (row) => row.email,
    ),
  );
  const optedDomains = new Set(
    (await queryIn<{ domain: string }>(db, "SELECT domain FROM opt_outs", "domain", domains)).map(
      (row) => row.domain,
    ),
  );

  const outcomes: UpsertOutcome[] = [];
  const writes: BoundStatement[] = [];

  items.forEach((item, index) => {
    if (!item.ok) {
      outcomes.push({ index, action: "rejected", error: item.error });
      return;
    }
    const input = item.value;
    if (inputOptedOut(input, optedEmails, optedDomains)) {
      const known =
        (input.email ? emailMap.get(input.email) : undefined) ??
        (input.domain ? domainMap.get(input.domain) : undefined);
      if (known && known.status !== "opted_out") {
        const next = { ...known, status: "opted_out" as const, updated_at: nowIso };
        writes.push(updateLead(db, next));
        remember(next, emailMap, domainMap, known.domain);
        outcomes.push({
          index,
          action: "skipped",
          reason: "opted_out",
          id: next.id,
          status: "opted_out",
        });
      } else {
        outcomes.push({
          index,
          action: "skipped",
          reason: "opted_out",
          ...(known ? { id: known.id, status: known.status } : {}),
        });
      }
      return;
    }
    const byEmail = input.email ? emailMap.get(input.email) : undefined;
    if (byEmail) {
      const domainOwner = input.domain ? domainMap.get(input.domain) : undefined;
      const domain =
        input.domain && (!domainOwner || domainOwner.id === byEmail.id)
          ? input.domain
          : byEmail.domain;
      const next = mergeLead(byEmail, input, nowIso, domain, byEmail.email);
      if (contentChanged(byEmail, next)) writes.push(updateLead(db, next));
      remember(next, emailMap, domainMap, byEmail.domain);
      outcomes.push({
        index,
        action: "updated",
        id: byEmail.id,
        status: byEmail.status,
        match: "email",
      });
      return;
    }
    const byDomain = input.domain ? domainMap.get(input.domain) : undefined;
    if (byDomain) {
      if (!byDomain.email && input.email) {
        const next = mergeLead(byDomain, input, nowIso, input.domain, input.email);
        writes.push(updateLead(db, next));
        remember(next, emailMap, domainMap, byDomain.domain);
        outcomes.push({
          index,
          action: "updated",
          id: byDomain.id,
          status: byDomain.status,
          match: "domain",
        });
        return;
      }
      outcomes.push({
        index,
        action: "duplicate",
        match: "domain",
        id: byDomain.id,
        status: byDomain.status,
      });
      return;
    }
    const created: LeadRow = {
      id: crypto.randomUUID(),
      business_name: input.business_name,
      industry: input.industry,
      website: input.website,
      email: input.email,
      phone: input.phone,
      line_id: input.line_id,
      line_url: input.line_url,
      source_url: input.source_url,
      fit_score: input.fit_score,
      notes: input.notes,
      pain_point: input.pain_point,
      status: "new",
      domain: input.domain,
      email_domain: input.email_domain,
      created_at: nowIso,
      updated_at: nowIso,
    };
    writes.push(insertLead(db, created));
    remember(created, emailMap, domainMap, "");
    outcomes.push({ index, action: "created", id: created.id, status: "new" });
  });

  try {
    await writeAll(db, writes);
  } catch (error) {
    if (isUnique(error)) {
      const conflict = new Error("conflict");
      conflict.name = "LeadConflict";
      throw conflict;
    }
    throw error;
  }
  return outcomes;
}

type Mini = Pick<LeadRow, "id" | "email" | "domain" | "email_domain" | "status">;

function wasContacted(lead: Mini, outbound: Set<string>): boolean {
  return outbound.has(lead.id) || statusWasContacted(lead.status);
}

export async function checkSuppression(
  db: LeadDb,
  emails: Array<{ input: string; email: string | null }>,
  domains: Array<{ input: string; domain: string | null; error?: string }>,
): Promise<{ emails: EmailCheck[]; domains: DomainCheck[] }> {
  const emailValues = emails.flatMap((item) => (item.email ? [item.email] : []));
  const emailDomains = emailValues
    .map((email) => emailDomainOf(email))
    .filter((domain) => isCompanyDomain(domain));
  const domainValues = domains.flatMap((item) =>
    item.domain && isCompanyDomain(item.domain) ? [item.domain] : [],
  );
  const domainKeys = [...emailDomains, ...domainValues];
  const found = [
    ...(await leadsBy(db, "email", emailValues)),
    ...(await leadsBy(db, "domain", domainKeys)),
    ...(await leadsBy(db, "email_domain", domainKeys)),
  ];
  const byId = new Map<string, LeadRow>();
  for (const lead of found) byId.set(lead.id, lead);
  const byEmail = new Map<string, LeadRow>();
  const byDomain = new Map<string, LeadRow[]>();
  for (const lead of byId.values()) {
    if (lead.email) byEmail.set(lead.email, lead);
    for (const key of [lead.domain, lead.email_domain]) {
      if (!isCompanyDomain(key)) continue;
      const list = byDomain.get(key) ?? [];
      list.push(lead);
      byDomain.set(key, list);
    }
  }
  const optedEmails = new Set(
    (await queryIn<{ email: string }>(db, "SELECT email FROM opt_outs", "email", emailValues)).map(
      (row) => row.email,
    ),
  );
  const optedDomains = new Set(
    (
      await queryIn<{ domain: string }>(db, "SELECT domain FROM opt_outs", "domain", domainKeys)
    ).map((row) => row.domain),
  );
  const outbound = new Set(
    (
      await queryIn<{ lead_id: string }>(
        db,
        "SELECT DISTINCT lead_id FROM touches WHERE direction = 'outbound'",
        "lead_id",
        [...byId.keys()],
        "AND",
      )
    ).map((row) => row.lead_id),
  );

  return {
    emails: emails.map((item) => {
      if (!item.email) {
        return {
          email: item.input,
          lead_id: null,
          status: null,
          opted_out: false,
          bounced: false,
          contacted: false,
          error: "invalid_email",
        };
      }
      const lead = byEmail.get(item.email);
      const emailDomain = emailDomainOf(item.email);
      const optedOut =
        optedEmails.has(item.email) ||
        (isCompanyDomain(emailDomain) && optedDomains.has(emailDomain)) ||
        (lead ? isCompanyDomain(lead.domain) && optedDomains.has(lead.domain) : false) ||
        lead?.status === "opted_out";
      return {
        email: item.email,
        lead_id: lead?.id ?? null,
        status: lead?.status ?? null,
        opted_out: Boolean(optedOut),
        bounced: lead?.status === "bounced",
        contacted: lead ? wasContacted(lead, outbound) : false,
      };
    }),
    domains: domains.map((item) => {
      if (item.error || !item.domain) {
        return {
          domain: item.input,
          opted_out: false,
          contacted: false,
          lead_count: 0,
          statuses: [],
          error: item.error ?? "invalid_domain",
        };
      }
      const leads = byDomain.get(item.domain) ?? [];
      const statuses = [...new Set(leads.map((lead) => lead.status))];
      return {
        domain: item.domain,
        opted_out:
          optedDomains.has(item.domain) || leads.some((lead) => lead.status === "opted_out"),
        contacted: leads.some((lead) => wasContacted(lead, outbound)),
        lead_count: leads.length,
        statuses,
      };
    }),
  };
}

async function touchByRef(db: LeadDb, leadId: string, clientRef: string): Promise<TouchRow | null> {
  const row = await db
    .prepare(`${TOUCH_SELECT} WHERE lead_id = ? AND client_ref = ?`)
    .bind(leadId, clientRef)
    .first<Record<string, unknown>>();
  return row ? readTouch(row) : null;
}

export async function logTouch(
  db: LeadDb,
  input: TouchInput,
  nowIso: string,
): Promise<
  | { ok: true; duplicate: boolean; touch: TouchRow; lead: LeadRow }
  | { ok: false; error: "not_found" | "opted_out" | "bounced" }
> {
  const lead = input.lead_id
    ? await getLeadRow(db, input.lead_id)
    : ((await leadsBy(db, "email", [input.email]))[0] ?? null);
  if (!lead) return { ok: false, error: "not_found" };
  if (input.direction === "outbound") {
    if (lead.status === "opted_out" || (await tableSuppressed(db, lead))) {
      return { ok: false, error: "opted_out" };
    }
    if (lead.status === "bounced") return { ok: false, error: "bounced" };
  }
  if (input.client_ref) {
    const existing = await touchByRef(db, lead.id, input.client_ref);
    if (existing) return { ok: true, duplicate: true, touch: existing, lead };
  }
  const touch: TouchRow = {
    id: crypto.randomUUID(),
    lead_id: lead.id,
    channel: input.channel,
    direction: input.direction,
    subject: input.subject,
    summary: input.summary,
    sent_at: input.sent_at,
    client_ref: input.client_ref,
    created_at: nowIso,
  };
  let status = lead.status;
  if (status !== "opted_out" && status !== "bounced") {
    if (input.direction === "outbound" && status === "new") status = "contacted";
    if (input.direction === "inbound" && (status === "new" || status === "contacted"))
      status = "replied";
  }
  const next = status === lead.status ? lead : { ...lead, status, updated_at: nowIso };
  const statements: BoundStatement[] = [
    db
      .prepare(
        `INSERT INTO touches (id, lead_id, channel, direction, subject, summary, sent_at, client_ref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        touch.id,
        touch.lead_id,
        touch.channel,
        touch.direction,
        touch.subject,
        touch.summary,
        touch.sent_at,
        touch.client_ref,
        touch.created_at,
      ),
  ];
  if (next !== lead) statements.push(updateLead(db, next));
  try {
    await writeAll(db, statements);
  } catch (error) {
    if (input.client_ref && isUnique(error)) {
      const existing = await touchByRef(db, lead.id, input.client_ref);
      if (existing) return { ok: true, duplicate: true, touch: existing, lead };
    }
    throw error;
  }
  return { ok: true, duplicate: false, touch, lead: next };
}

export async function patchLead(
  db: LeadDb,
  id: string,
  patch: LeadPatch,
  nowIso: string,
): Promise<{ ok: true; lead: LeadRow; suppressed: boolean } | { ok: false; error: "not_found" }> {
  const lead = await getLeadRow(db, id);
  if (!lead) return { ok: false, error: "not_found" };
  const next: LeadRow = {
    ...lead,
    business_name: patch.business_name ?? lead.business_name,
    industry: patch.industry ?? lead.industry,
    phone: patch.phone ?? lead.phone,
    line_id: patch.line_id ?? lead.line_id,
    line_url: patch.line_url ?? lead.line_url,
    notes: patch.notes ?? lead.notes,
    pain_point: patch.pain_point ?? lead.pain_point,
    fit_score: patch.fit_score ?? lead.fit_score,
    status: patch.status ?? lead.status,
    updated_at: nowIso,
  };
  const statements: BoundStatement[] = [updateLead(db, next)];
  if (next.status === "opted_out") {
    const domains = suppressionDomains(next.domain, next.email_domain);
    statements.push(...siblingOptOut(db, next.domain, next.email_domain, next.id, nowIso));
    statements.push(...optOutInserts(db, next.id, next.email, domains, "status", nowIso));
    if (next.email) {
      statements.push(
        db
          .prepare(
            "UPDATE leads SET status = 'opted_out', updated_at = ? WHERE email = ? AND id <> ? AND status <> 'opted_out'",
          )
          .bind(nowIso, next.email, next.id),
      );
    }
  }
  await writeAll(db, statements);
  const suppressed = next.status === "opted_out" ? true : await tableSuppressed(db, next);
  return { ok: true, lead: next, suppressed };
}

export async function recordOptOut(
  db: LeadDb,
  input: OptOutInput,
  source: string,
  nowIso: string,
): Promise<{ ok: true } | { ok: false; error: "not_found" }> {
  const lead = input.lead_id ? await getLeadRow(db, input.lead_id) : null;
  if (input.lead_id && !lead) return { ok: false, error: "not_found" };
  const email = input.email || lead?.email || "";
  const domains = new Set<string>(suppressionDomains(input.domain, emailDomainOf(email)));
  if (lead)
    for (const domain of suppressionDomains(lead.domain, lead.email_domain)) domains.add(domain);
  const domainList = [...domains];
  const statements: BoundStatement[] = [];
  if (lead) {
    statements.push(updateLead(db, { ...lead, status: "opted_out", updated_at: nowIso }));
    statements.push(...siblingOptOut(db, lead.domain, lead.email_domain, lead.id, nowIso));
  }
  if (email) {
    statements.push(
      db
        .prepare(
          "UPDATE leads SET status = 'opted_out', updated_at = ? WHERE email = ? AND status <> 'opted_out'",
        )
        .bind(nowIso, email),
    );
  }
  for (const domain of domainList) {
    statements.push(
      db
        .prepare(
          `UPDATE leads SET status = 'opted_out', updated_at = ?
           WHERE status <> 'opted_out' AND (domain = ? OR email_domain = ?)`,
        )
        .bind(nowIso, domain, domain),
    );
  }
  statements.push(...optOutInserts(db, lead?.id ?? null, email, domainList, source, nowIso));
  await writeAll(db, statements);
  return { ok: true };
}

export async function optOutLead(
  db: LeadDb,
  id: string,
  source: string,
  nowIso: string,
): Promise<LeadRow | null> {
  const lead = await getLeadRow(db, id);
  if (!lead) return null;
  const result = await recordOptOut(db, { email: "", domain: "", lead_id: id }, source, nowIso);
  if (!result.ok) return null;
  return { ...lead, status: "opted_out", updated_at: nowIso };
}

export async function listLeads(
  db: LeadDb,
  filter: { status: string; q: string; limit: number; offset: number },
): Promise<{ total: number; leads: LeadRow[] }> {
  const where = `
    WHERE (? = '' OR status = ?)
      AND (
        ? = ''
        OR instr(lower(business_name), ?) > 0
        OR instr(lower(email), ?) > 0
        OR instr(lower(domain), ?) > 0
        OR instr(lower(industry), ?) > 0
        OR instr(lower(line_id), ?) > 0
        OR instr(lower(phone), ?) > 0
      )
  `;
  const params = [
    filter.status,
    filter.status,
    filter.q,
    filter.q,
    filter.q,
    filter.q,
    filter.q,
    filter.q,
    filter.q,
  ];
  const count = await db
    .prepare(`SELECT COUNT(*) AS n FROM leads ${where}`)
    .bind(...params)
    .first<{ n: number }>();
  const rows = await db
    .prepare(`${LEAD_SELECT} ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(...params, filter.limit, filter.offset)
    .all<Record<string, unknown>>();
  return { total: num(count?.n), leads: (rows.results ?? []).map(readLead) };
}

export async function getLeadDetail(
  db: LeadDb,
  id: string,
): Promise<{ lead: LeadRow; touches: TouchRow[]; suppressed: boolean } | null> {
  const lead = await getLeadRow(db, id);
  if (!lead) return null;
  const touches = await db
    .prepare(`${TOUCH_SELECT} WHERE lead_id = ? ORDER BY sent_at DESC, id DESC`)
    .bind(id)
    .all<Record<string, unknown>>();
  return {
    lead,
    touches: (touches.results ?? []).map(readTouch),
    suppressed: lead.status === "opted_out" || (await tableSuppressed(db, lead)),
  };
}

function sqlDay(column: "sent_at" | "created_at"): string {
  return `date(replace(substr(${column}, 1, 19), 'T', ' '), '+7 hours')`;
}

async function readFunnel(db: LeadDb): Promise<Funnel> {
  const funnel = emptyFunnel();
  const rows = await db.prepare("SELECT status, COUNT(*) AS n FROM leads GROUP BY status").all<{
    status: string;
    n: number;
  }>();
  for (const row of rows.results ?? []) {
    if (isStatus(row.status)) funnel[row.status] = num(row.n);
  }
  for (const status of STATUSES) if (!(status in funnel)) funnel[status] = 0;
  return funnel;
}

export async function overview(db: LeadDb, now: Date): Promise<Overview> {
  const today = bangkokDay(now);
  const day = sqlDay("sent_at");
  const created = sqlDay("created_at");
  const [totals, leadReply, days, createdDays, funnel] = await Promise.all([
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END), 0) AS outbound,
          COALESCE(SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END), 0) AS inbound
        FROM touches`,
      )
      .first<{ outbound: number; inbound: number }>(),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN outbound > 0 THEN 1 ELSE 0 END), 0) AS contacted_leads,
          COALESCE(SUM(CASE WHEN outbound > 0 AND inbound > 0 THEN 1 ELSE 0 END), 0) AS replied_leads
        FROM (
          SELECT lead_id,
            SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) AS outbound,
            SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) AS inbound
          FROM touches GROUP BY lead_id
        ) AS per_lead`,
      )
      .first<{ contacted_leads: number; replied_leads: number }>(),
    db
      .prepare(
        `SELECT ${day} AS day,
          COALESCE(SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END), 0) AS sends,
          COALESCE(SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END), 0) AS replies
        FROM touches GROUP BY day ORDER BY day DESC LIMIT 30`,
      )
      .all<{ day: string; sends: number; replies: number }>(),
    db
      .prepare(
        `SELECT ${created} AS day, COUNT(*) AS n FROM leads GROUP BY day ORDER BY day DESC LIMIT 30`,
      )
      .all<{ day: string; n: number }>(),
    readFunnel(db),
  ]);
  const createdByDay = new Map(
    (createdDays.results ?? []).map((row) => [String(row.day), num(row.n)]),
  );
  const sendsPerDay = [...(days.results ?? [])]
    .map((row) => {
      const sends = num(row.sends);
      const replies = num(row.replies);
      return {
        date: String(row.day),
        sends,
        replies,
        reply_rate: rate(replies, sends),
        new_leads: createdByDay.get(String(row.day)) ?? 0,
      };
    })
    .reverse();
  const outbound = num(totals?.outbound);
  const inbound = num(totals?.inbound);
  const todayPoint = sendsPerDay.find((point) => point.date === today);
  return {
    timezone: BANGKOK,
    funnel,
    totals: {
      leads: STATUSES.reduce((sum, status) => sum + funnel[status], 0),
      outbound,
      inbound,
      reply_rate: rate(inbound, outbound),
      lead_reply_rate: rate(num(leadReply?.replied_leads), num(leadReply?.contacted_leads)),
    },
    today: {
      date: today,
      sends: todayPoint?.sends ?? 0,
      replies: todayPoint?.replies ?? 0,
      reply_rate: todayPoint?.reply_rate ?? null,
      new_leads: createdByDay.get(today) ?? 0,
      funnel,
    },
    sends_per_day: sendsPerDay,
  };
}

export async function dailyStats(db: LeadDb, day: string): Promise<DayStat> {
  const sent = sqlDay("sent_at");
  const created = sqlDay("created_at");
  const [touches, leads, funnel] = await Promise.all([
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END), 0) AS sends,
          COALESCE(SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END), 0) AS replies
        FROM touches WHERE ${sent} = ?`,
      )
      .bind(day)
      .first<{ sends: number; replies: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS n FROM leads WHERE ${created} = ?`)
      .bind(day)
      .first<{ n: number }>(),
    readFunnel(db),
  ]);
  const sends = num(touches?.sends);
  const replies = num(touches?.replies);
  return {
    date: day,
    sends,
    replies,
    reply_rate: rate(replies, sends),
    new_leads: num(leads?.n),
    funnel,
  };
}

export type SendImportResult = {
  index: number;
  action: UpsertOutcome["action"];
  id?: string;
  status?: Status;
  send_status?: SendLogRow["send_status"];
  touch: "logged" | "duplicate" | "none";
  error?: string;
  reason?: "opted_out";
};

export async function importSendLog(
  db: LeadDb,
  rows: Array<{ ok: true; lead: LeadInput; send: SendLogRow } | { ok: false; error: string }>,
  nowIso: string,
): Promise<SendImportResult[]> {
  const leadItems = rows.map((row) => (row.ok ? { ok: true as const, value: row.lead } : row));
  const outcomes: UpsertOutcome[] = [];
  for (let offset = 0; offset < leadItems.length; offset += 100) {
    const slice = leadItems.slice(offset, offset + 100);
    const part = await upsertLeads(db, slice, nowIso);
    for (const outcome of part) outcomes.push({ ...outcome, index: outcome.index + offset });
  }

  const ids = outcomes.flatMap((outcome) => (outcome.id ? [outcome.id] : []));
  const loaded = await leadsBy(db, "id", ids);
  const byId = new Map(loaded.map((lead) => [lead.id, lead]));
  const refs = rows.flatMap((row, index) => {
    if (!row.ok || (row.send.send_status !== "sent" && row.send.send_status !== "bounced"))
      return [];
    const id = outcomes[index]?.id;
    if (!id) return [];
    return [sendRef(row.send.email, row.send.sent_at, row.send.send_status)];
  });
  const existingRefs = new Set(
    (
      await queryIn<{ client_ref: string }>(
        db,
        "SELECT client_ref FROM touches",
        "client_ref",
        refs,
      )
    ).map((row) => row.client_ref),
  );
  const statements: BoundStatement[] = [];
  const results: SendImportResult[] = [];

  rows.forEach((row, index) => {
    const outcome = outcomes[index];
    if (!row.ok || !outcome) {
      results.push({
        index,
        action: "rejected",
        touch: "none",
        error: row.ok ? "invalid_lead" : row.error,
      });
      return;
    }
    if (!outcome.id || outcome.action === "rejected" || outcome.action === "skipped") {
      results.push({
        index,
        action: outcome.action,
        touch: "none",
        ...(outcome.id ? { id: outcome.id } : {}),
        ...(outcome.status ? { status: outcome.status } : {}),
        ...(outcome.error ? { error: outcome.error } : {}),
        ...(outcome.reason ? { reason: outcome.reason } : {}),
        send_status: row.send.send_status,
      });
      return;
    }
    const lead = byId.get(outcome.id);
    if (!lead) {
      results.push({
        index,
        action: outcome.action,
        id: outcome.id,
        touch: "none",
        error: "not_found",
      });
      return;
    }
    const sendStatus = row.send.send_status;
    let touch: SendImportResult["touch"] = "none";
    let next = lead;
    if (sendStatus === "sent" || sendStatus === "bounced") {
      const ref = sendRef(row.send.email, row.send.sent_at, sendStatus);
      if (existingRefs.has(ref)) touch = "duplicate";
      else {
        touch = "logged";
        existingRefs.add(ref);
        statements.push(
          db
            .prepare(
              `INSERT INTO touches (id, lead_id, channel, direction, subject, summary, sent_at, client_ref, created_at)
               VALUES (?, ?, 'email', 'outbound', ?, ?, ?, ?, ?)`,
            )
            .bind(
              crypto.randomUUID(),
              lead.id,
              row.send.subject,
              row.send.reason,
              row.send.sent_at,
              ref,
              nowIso,
            ),
        );
        if (sendStatus === "bounced" && next.status !== "opted_out") {
          next = { ...next, status: "bounced", updated_at: nowIso };
        } else if (sendStatus === "sent" && next.status === "new") {
          next = { ...next, status: "contacted", updated_at: nowIso };
        }
      }
    } else if (sendStatus === "failed" && !next.notes.includes("ส่งไม่สำเร็จ")) {
      const failure = next.notes ? `${next.notes}\nส่งไม่สำเร็จ` : "ส่งไม่สำเร็จ";
      next = { ...next, notes: failure, updated_at: nowIso };
    }
    if (next.status !== lead.status || next.notes !== lead.notes) {
      statements.push(updateLead(db, next));
      byId.set(lead.id, next);
    }
    results.push({
      index,
      action: outcome.action,
      id: lead.id,
      status: next.status,
      send_status: sendStatus,
      touch,
    });
  });

  await writeAll(db, statements);
  return results;
}
