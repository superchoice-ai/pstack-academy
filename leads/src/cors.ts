const LOOPBACK = new Set(["localhost", "127.0.0.1"]);

/** Browser calls come from the Lovable app or a local Vite dev server. */
export function allowedLeadsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const https = url.protocol === "https:";
  const http = url.protocol === "http:";
  if (https && (url.hostname === "lovable.app" || url.hostname.endsWith(".lovable.app"))) {
    return origin;
  }
  if ((https || http) && LOOPBACK.has(url.hostname)) return origin;
  return null;
}

export function withCors(response: Response, origin: string | null): Response {
  const allowed = allowedLeadsOrigin(origin);
  const headers = new Headers(response.headers);
  if (allowed) {
    headers.set("access-control-allow-origin", allowed);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-methods", "GET, POST, PATCH, OPTIONS");
    headers.set("access-control-allow-headers", "authorization, content-type");
    headers.set("access-control-max-age", "86400");
  }
  return new Response(response.body, { status: response.status, headers });
}
