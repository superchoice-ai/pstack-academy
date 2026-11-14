import { LIMITS } from "./constants";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    },
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: "body_too_large" | "invalid_json" }> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > LIMITS.bodyBytes)
    return { ok: false, error: "body_too_large" };
  const text = await request.text();
  if (text.length > LIMITS.bodyBytes) return { ok: false, error: "body_too_large" };
  if (!text.trim()) return { ok: false, error: "invalid_json" };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}
