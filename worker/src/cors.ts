const PRODUCTION_ORIGIN = "https://superchoice-academy-portal.lovable.app";

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin === PRODUCTION_ORIGIN) return origin;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return origin;
  } catch {
    return null;
  }
  return null;
}

export function withCors(response: Response, origin: string | null): Response {
  const allowed = allowedOrigin(origin);
  const headers = new Headers(response.headers);
  if (allowed) {
    headers.set("access-control-allow-origin", allowed);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type");
  }
  return new Response(response.body, { status: response.status, headers });
}

export function json(body: unknown, status: number, origin: string | null): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    }),
    origin,
  );
}
