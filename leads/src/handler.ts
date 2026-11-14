import { parseSendCsv } from "./csv";
import { isCompanyDomain, isPlatformHost, isPublicMailbox, isStatus, LIMITS } from "./constants";
import type { LeadsEnv } from "./db";
import { html, isRecord, json, readJson } from "./http";
import {
  normalizeDomain,
  normalizeEmail,
  parseLead,
  parseOptOut,
  parsePatch,
  parseTouch,
  showInput,
} from "./normalize";
import { dashboardPage, unsubscribePage } from "./pages";
import {
  checkSuppression,
  dailyStats,
  getLeadDetail,
  importSendLog,
  listLeads,
  logTouch,
  optOutLead,
  overview,
  patchLead,
  recordOptOut,
  upsertLeads,
  type LeadRow,
  type UpsertOutcome,
} from "./store";
import { bangkokDay, isDay } from "./time";
import { bearerToken, tokensEqual, unsubscribeUrl, verifyLeadToken } from "./tokens";

export type HandlerDeps = {
  now?: () => Date;
};

export type PublicLead = {
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
  status: LeadRow["status"];
  domain: string;
  created_at: string;
  updated_at: string;
  unsubscribe_url: string;
};

function logEvent(event: string, fields: Record<string, string | number | boolean | null>): void {
  console.log(JSON.stringify({ event, ...fields }));
}

export function toPublic(lead: LeadRow, unsubscribe_url: string): PublicLead {
  return {
    id: lead.id,
    business_name: lead.business_name,
    industry: lead.industry,
    website: lead.website,
    email: lead.email,
    phone: lead.phone,
    line_id: lead.line_id,
    source_url: lead.source_url,
    fit_score: lead.fit_score,
    notes: lead.notes,
    pain_point: lead.pain_point,
    status: lead.status,
    domain: lead.domain,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    unsubscribe_url,
  };
}

async function withUrl(origin: string, secret: string, lead: LeadRow): Promise<PublicLead> {
  return toPublic(lead, await unsubscribeUrl(origin, secret, lead.id));
}

async function requireApi(request: Request, env: LeadsEnv): Promise<Response | null> {
  if (!env.LEADS_API_TOKEN || !env.LEADS_UNSUBSCRIBE_SECRET) {
    console.error(
      JSON.stringify({
        event: "not_configured",
        api_token: Boolean(env.LEADS_API_TOKEN),
        unsubscribe_secret: Boolean(env.LEADS_UNSUBSCRIBE_SECRET),
      }),
    );
    return json({ error: "not_configured" }, 503);
  }
  const allowed = await tokensEqual(bearerToken(request), env.LEADS_API_TOKEN);
  if (!allowed) return json({ error: "unauthorized" }, 401);
  return null;
}

function bounded(value: string | null, fallback: number, max: number): number | null {
  if (value == null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (parsed > max) return null;
  return parsed;
}

async function presentOutcomes(
  origin: string,
  secret: string,
  outcomes: UpsertOutcome[],
): Promise<Array<UpsertOutcome & { unsubscribe_url?: string }>> {
  return Promise.all(
    outcomes.map(async (outcome) => {
      if (!outcome.id) return outcome;
      return { ...outcome, unsubscribe_url: await unsubscribeUrl(origin, secret, outcome.id) };
    }),
  );
}

export async function handleRequest(
  request: Request,
  env: LeadsEnv,
  deps: HandlerDeps = {},
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const now = deps.now ?? (() => new Date());
  const nowIso = now().toISOString();

  if (path === "/favicon.ico") return new Response(null, { status: 204 });
  if (request.method === "GET" && path === "/") {
    return json({
      service: "superchoice-leads",
      dashboard: "/dashboard",
      unsubscribe: "/u/:token",
    });
  }
  if (request.method === "GET" && path === "/dashboard") return html(dashboardPage());
  if (path.startsWith("/u/")) return unsubscribe(request, env, path.slice(3), nowIso);
  if (!path.startsWith("/api/")) return json({ error: "not_found" }, 404);

  const denied = await requireApi(request, env);
  if (denied) return denied;
  const secret = env.LEADS_UNSUBSCRIBE_SECRET ?? "";
  return api(request, env, path, url, secret, now().toISOString(), now());
}

async function unsubscribe(
  request: Request,
  env: LeadsEnv,
  token: string,
  nowIso: string,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  const wantsJson = request.method === "POST";
  if (!env.LEADS_UNSUBSCRIBE_SECRET) {
    return wantsJson
      ? json({ error: "not_configured" }, 503)
      : html(unsubscribePage("unavailable"), 503);
  }
  if (token.length > 500) {
    return wantsJson
      ? json({ error: "invalid_token" }, 400)
      : html(unsubscribePage("invalid"), 400);
  }
  const leadId = await verifyLeadToken(env.LEADS_UNSUBSCRIBE_SECRET, token);
  if (!leadId) {
    return wantsJson
      ? json({ error: "invalid_token" }, 400)
      : html(unsubscribePage("invalid"), 400);
  }
  const lead = await optOutLead(env.DB, leadId, "unsubscribe_link", nowIso);
  if (!lead)
    return wantsJson ? json({ error: "not_found" }, 404) : html(unsubscribePage("missing"), 404);
  logEvent("unsubscribe", { lead_id: leadId, method: request.method });
  return wantsJson ? json({ ok: true }) : html(unsubscribePage("ok"));
}

async function api(
  request: Request,
  env: LeadsEnv,
  path: string,
  url: URL,
  secret: string,
  nowIso: string,
  now: Date,
): Promise<Response> {
  const origin = url.origin;
  if (path === "/api/leads/upsert") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    return upsert(request, env, origin, secret, nowIso);
  }
  if (path === "/api/leads/import") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    return importCsv(request, env, origin, secret, nowIso);
  }
  if (path === "/api/leads/check") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    return check(request, env);
  }
  if (path === "/api/leads") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    return list(env, url, origin, secret);
  }
  if (path === "/api/touches") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    return touch(request, env, origin, secret, nowIso);
  }
  if (path === "/api/opt-outs") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    return optOut(request, env, nowIso);
  }
  if (path === "/api/stats") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    return json(await overview(env.DB, now));
  }
  if (path === "/api/stats/daily") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    const requested = url.searchParams.get("date") ?? bangkokDay(now);
    if (!isDay(requested)) return json({ error: "invalid_date" }, 400);
    return json({ timezone: "Asia/Bangkok", ...(await dailyStats(env.DB, requested)) });
  }

  const unsubscribeMatch = /^\/api\/leads\/([0-9a-f-]{36})\/unsubscribe-url$/i.exec(path);
  if (unsubscribeMatch?.[1]) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    const id = unsubscribeMatch[1].toLowerCase();
    const detail = await getLeadDetail(env.DB, id);
    if (!detail) return json({ error: "not_found" }, 404);
    return json({ id, unsubscribe_url: await unsubscribeUrl(origin, secret, id) });
  }
  const leadMatch = /^\/api\/leads\/([0-9a-f-]{36})$/i.exec(path);
  if (leadMatch?.[1]) {
    const id = leadMatch[1].toLowerCase();
    if (request.method === "GET") {
      const detail = await getLeadDetail(env.DB, id);
      if (!detail) return json({ error: "not_found" }, 404);
      return json({
        lead: await withUrl(origin, secret, detail.lead),
        touches: detail.touches,
        suppressed: detail.suppressed,
      });
    }
    if (request.method === "PATCH") return update(request, env, id, origin, secret, nowIso);
    return json({ error: "method_not_allowed" }, 405);
  }
  return json({ error: "not_found" }, 404);
}

async function upsert(
  request: Request,
  env: LeadsEnv,
  origin: string,
  secret: string,
  nowIso: string,
): Promise<Response> {
  const body = await readJson(request);
  if (!body.ok) return json({ error: body.error }, 400);
  if (!isRecord(body.value) || !Array.isArray(body.value.leads))
    return json({ error: "invalid_body" }, 400);
  if (body.value.leads.length > LIMITS.bulk) return json({ error: "too_many_leads" }, 400);
  const items = body.value.leads.map((lead) => parseLead(lead));
  try {
    const outcomes = await upsertLeads(env.DB, items, nowIso);
    const results = await presentOutcomes(origin, secret, outcomes);
    const counts = { created: 0, updated: 0, duplicate: 0, skipped: 0, rejected: 0 };
    for (const result of results) counts[result.action] += 1;
    logEvent("upsert", counts);
    return json({ results });
  } catch (error) {
    if (error instanceof Error && error.name === "LeadConflict")
      return json({ error: "conflict" }, 409);
    throw error;
  }
}

async function importCsv(
  request: Request,
  env: LeadsEnv,
  origin: string,
  secret: string,
  nowIso: string,
): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  let csv = "";
  if (type.includes("text/csv") || type.includes("text/plain")) {
    const declared = request.headers.get("content-length");
    if (declared && Number(declared) > 2_000_000) return json({ error: "body_too_large" }, 400);
    csv = await request.text();
    if (csv.length > 2_000_000) return json({ error: "body_too_large" }, 400);
  } else {
    const body = await readJson(request);
    if (!body.ok) return json({ error: body.error }, 400);
    if (!isRecord(body.value) || typeof body.value.csv !== "string")
      return json({ error: "invalid_body" }, 400);
    csv = body.value.csv;
  }
  const parsed = parseSendCsv(csv);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const items = parsed.rows.map((row) => {
    if (!row.ok) return row;
    const lead = parseLead({
      business_name: row.value.business_name,
      industry: row.value.industry,
      website: row.value.website,
      email: row.value.email,
      source_url: row.value.source_url,
      pain_point: row.value.reason,
    });
    if (!lead.ok) return { ok: false as const, error: lead.error };
    return { ok: true as const, lead: lead.value, send: row.value };
  });
  try {
    const imported = await importSendLog(env.DB, items, nowIso);
    const results = await Promise.all(
      imported.map(async (result) => {
        if (!result.id) return result;
        return { ...result, unsubscribe_url: await unsubscribeUrl(origin, secret, result.id) };
      }),
    );
    logEvent("import", {
      rows: results.length,
      logged: results.filter((result) => result.touch === "logged").length,
    });
    return json({ results });
  } catch (error) {
    if (error instanceof Error && error.name === "LeadConflict")
      return json({ error: "conflict" }, 409);
    throw error;
  }
}

async function check(request: Request, env: LeadsEnv): Promise<Response> {
  const body = await readJson(request);
  if (!body.ok) return json({ error: body.error }, 400);
  if (!isRecord(body.value)) return json({ error: "invalid_body" }, 400);
  const emails = body.value.emails ?? [];
  const domains = body.value.domains ?? [];
  if (!Array.isArray(emails) || !Array.isArray(domains))
    return json({ error: "invalid_body" }, 400);
  if (emails.length > LIMITS.check || domains.length > LIMITS.check)
    return json({ error: "too_many_checks" }, 400);
  const result = await checkSuppression(
    env.DB,
    emails.map((value) => {
      const input = showInput(value);
      const email = typeof value === "string" ? normalizeEmail(value) : null;
      return { input, email: email ? email : null };
    }),
    domains.map((value) => {
      const input = showInput(value);
      if (typeof value !== "string") return { input, domain: null, error: "invalid_domain" };
      const domain = normalizeDomain(value);
      if (!domain) return { input, domain: null, error: "invalid_domain" };
      if (isPublicMailbox(domain)) return { input, domain, error: "public_mailbox_domain" };
      if (!isCompanyDomain(domain) || isPlatformHost(domain)) {
        return { input, domain, error: "platform_domain" };
      }
      return { input, domain };
    }),
  );
  return json(result);
}

async function list(env: LeadsEnv, url: URL, origin: string, secret: string): Promise<Response> {
  const status = url.searchParams.get("status") ?? "";
  if (status && !isStatus(status)) return json({ error: "invalid_status" }, 400);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length > LIMITS.search) return json({ error: "invalid_query" }, 400);
  const limit = bounded(url.searchParams.get("limit"), 50, LIMITS.page);
  const offset = bounded(url.searchParams.get("offset"), 0, 100_000);
  if (limit == null || offset == null) return json({ error: "invalid_query" }, 400);
  const page = await listLeads(env.DB, { status, q, limit, offset });
  const leads = await Promise.all(page.leads.map((lead) => withUrl(origin, secret, lead)));
  return json({ leads, total: page.total, limit, offset });
}

async function touch(
  request: Request,
  env: LeadsEnv,
  origin: string,
  secret: string,
  nowIso: string,
): Promise<Response> {
  const body = await readJson(request);
  if (!body.ok) return json({ error: body.error }, 400);
  const parsed = parseTouch(body.value, nowIso);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const result = await logTouch(env.DB, parsed.value, nowIso);
  if (!result.ok) return json({ error: result.error }, result.error === "not_found" ? 404 : 409);
  logEvent("touch", {
    lead_id: result.lead.id,
    channel: result.touch.channel,
    direction: result.touch.direction,
    duplicate: result.duplicate,
  });
  return json({
    duplicate: result.duplicate,
    touch: result.touch,
    lead: await withUrl(origin, secret, result.lead),
  });
}

async function update(
  request: Request,
  env: LeadsEnv,
  id: string,
  origin: string,
  secret: string,
  nowIso: string,
): Promise<Response> {
  const body = await readJson(request);
  if (!body.ok) return json({ error: body.error }, 400);
  const parsed = parsePatch(body.value);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const result = await patchLead(env.DB, id, parsed.value, nowIso);
  if (!result.ok) return json({ error: result.error }, 404);
  logEvent("lead_update", {
    lead_id: id,
    status: result.lead.status,
    suppressed: result.suppressed,
  });
  return json({ lead: await withUrl(origin, secret, result.lead), suppressed: result.suppressed });
}

async function optOut(request: Request, env: LeadsEnv, nowIso: string): Promise<Response> {
  const body = await readJson(request);
  if (!body.ok) return json({ error: body.error }, 400);
  const parsed = parseOptOut(body.value);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const result = await recordOptOut(env.DB, parsed.value, "api", nowIso);
  if (!result.ok) return json({ error: result.error }, 404);
  logEvent("opt_out", {
    lead_id: parsed.value.lead_id || null,
    has_email: Boolean(parsed.value.email),
    has_domain: Boolean(parsed.value.domain),
  });
  return json({ ok: true });
}
