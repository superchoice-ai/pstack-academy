export const DEFAULT_API_BASE = "https://pstack-academy-api.auichai-s2.workers.dev";

export type RegistryCertificate = {
  id: string;
  name: string;
  score: number;
  lang: string;
  issued_at: string;
  attempt_id: string;
};

export type LookupResult =
  | { status: "verified"; certificate: RegistryCertificate }
  | { status: "not_found" }
  | { status: "unreachable" };

export function apiBase(): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env["VITE_API_BASE"];
  if (typeof value === "string" && value.trim()) return value.trim().replace(/\/$/, "");
  return DEFAULT_API_BASE;
}

function isCertificate(value: unknown): value is RegistryCertificate {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["score"] === "number" &&
    typeof record["lang"] === "string" &&
    typeof record["issued_at"] === "string" &&
    typeof record["attempt_id"] === "string"
  );
}

/** A bare HTTP 404 is not "not found" unless it is this API's JSON error. */
export function classifyLookup(status: number, body: unknown): LookupResult {
  if (status === 200 && body && typeof body === "object" && "certificate" in body) {
    const certificate = (body as { certificate?: unknown }).certificate;
    if (isCertificate(certificate)) return { status: "verified", certificate };
  }
  if (
    status === 404 &&
    body &&
    typeof body === "object" &&
    (body as { error?: unknown }).error === "not_found"
  ) {
    return { status: "not_found" };
  }
  return { status: "unreachable" };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function lookupCertificate(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetchImpl(`${apiBase()}/api/certificates/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    });
    return classifyLookup(response.status, await readJson(response));
  } catch {
    return { status: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function registerCertificate(
  input: RegistryCertificate & { turnstileToken?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<"registered" | "unreachable"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetchImpl(`${apiBase()}/api/certificates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    return response.ok ? "registered" : "unreachable";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyTurnstileToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<"ok" | "rejected" | "unreachable"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetchImpl(`${apiBase()}/api/turnstile/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    const body = await readJson(response);
    const ok = body !== null && typeof body === "object" && (body as { ok?: unknown }).ok === true;
    if (response.ok && ok) return "ok";
    if (
      !response.ok &&
      body &&
      typeof body === "object" &&
      (body as { ok?: unknown }).ok === false
    ) {
      return "rejected";
    }
    return "unreachable";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}
