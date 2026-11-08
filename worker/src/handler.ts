import { allowedOrigin, json, withCors } from "./cors";
import { allowIp } from "./rate-limit";
import type { CertificateRow, Env } from "./types";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type HandlerDeps = {
  fetch?: typeof fetch;
  now?: () => number;
};

type VerifyResult = { ok: true; skipped?: true } | { ok: false };

export async function verifyTurnstile(
  secret: string | undefined,
  token: string | undefined,
  remoteIp: string,
  fetchImpl: typeof fetch,
): Promise<VerifyResult> {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false };
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetchImpl(SITEVERIFY, { method: "POST", body });
  const payload: unknown = await response.json();
  const success =
    payload !== null &&
    typeof payload === "object" &&
    "success" in payload &&
    (payload as { success?: unknown }).success === true;
  return success ? { ok: true } : { ok: false };
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseCertificate(body: unknown): CertificateRow | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const id = readString(record, "id");
  const name = readString(record, "name");
  const lang = readString(record, "lang");
  const issuedAt = readString(record, "issued_at");
  const attemptId = readString(record, "attempt_id");
  const score = record["score"];
  if (!/^[A-Za-z0-9-]{4,40}$/.test(id)) return null;
  if (name.length < 1 || name.length > 80) return null;
  if (!/^[a-z]{2}$/.test(lang)) return null;
  if (attemptId.length < 1 || attemptId.length > 80) return null;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100)
    return null;
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return null;
  return { id, name, score, lang, issued_at: issued.toISOString(), attempt_id: attemptId };
}

async function readRow(env: Env, id: string): Promise<CertificateRow | null> {
  const row = await env.DB.prepare(
    "SELECT id, name, score, lang, issued_at, attempt_id FROM certificates WHERE id = ?",
  )
    .bind(id)
    .first<CertificateRow>();
  return row ?? null;
}

export async function handleRequest(
  request: Request,
  env: Env,
  deps: HandlerDeps = {},
): Promise<Response> {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!allowedOrigin(origin)) return new Response(null, { status: 403 });
    return withCors(new Response(null, { status: 204 }), origin);
  }

  const url = new URL(request.url);
  const fetchImpl = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;

  if (request.method === "POST" && url.pathname === "/api/turnstile/verify") {
    let token = "";
    try {
      const body: unknown = await request.json();
      if (body && typeof body === "object")
        token = readString(body as Record<string, unknown>, "token");
    } catch {
      token = "";
    }
    const result = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      token,
      clientIp(request),
      fetchImpl,
    );
    return json(result, result.ok ? 200 : 403, origin);
  }

  const certificateMatch = /^\/api\/certificates\/([^/]+)$/.exec(url.pathname);
  if (request.method === "GET" && certificateMatch) {
    const id = decodeURIComponent(certificateMatch[1] ?? "");
    const row = await readRow(env, id);
    if (!row) return json({ error: "not_found" }, 404, origin);
    return json({ certificate: row }, 200, origin);
  }

  if (request.method === "POST" && url.pathname === "/api/certificates") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, origin);
    }
    const row = parseCertificate(body);
    if (!row) return json({ error: "invalid_certificate" }, 400, origin);
    const token =
      body && typeof body === "object"
        ? readString(body as Record<string, unknown>, "turnstileToken")
        : "";
    const verdict = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      token,
      clientIp(request),
      fetchImpl,
    );
    if (!verdict.ok) return json({ error: "turnstile_failed" }, 403, origin);

    const existing = await readRow(env, row.id);
    if (existing) return json({ certificate: existing }, 200, origin);

    if (!allowIp(clientIp(request), now())) {
      return json({ error: "rate_limited" }, 429, origin);
    }

    try {
      await env.DB.prepare(
        "INSERT INTO certificates (id, name, score, lang, issued_at, attempt_id) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(row.id, row.name, row.score, row.lang, row.issued_at, row.attempt_id)
        .run();
    } catch {
      const raced = await readRow(env, row.id);
      if (raced) return json({ certificate: raced }, 200, origin);
      return json({ error: "store_failed" }, 500, origin);
    }
    return json({ certificate: row }, 201, origin);
  }

  return json({ error: "not_found" }, 404, origin);
}
