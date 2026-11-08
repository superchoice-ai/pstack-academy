import { afterEach, describe, expect, it } from "bun:test";

import { allowedOrigin } from "../src/cors";
import { handleRequest } from "../src/handler";
import { resetRateLimit } from "../src/rate-limit";
import type { CertificateRow, D1Like, D1Statement, Env } from "../src/types";

function memoryDb(): D1Like & { rows: Map<string, CertificateRow> } {
  const rows = new Map<string, CertificateRow>();
  return {
    rows,
    prepare(sql: string) {
      const statement: D1Statement = {
        bind(...values: unknown[]) {
          const bound: D1Statement = {
            bind() {
              return bound;
            },
            async first<T>() {
              if (!sql.includes("WHERE id")) return null;
              return (rows.get(String(values[0])) as T | undefined) ?? null;
            },
            async run() {
              if (!sql.startsWith("INSERT")) return { success: true };
              const id = String(values[0]);
              if (rows.has(id)) throw new Error("UNIQUE constraint failed");
              rows.set(id, {
                id,
                name: String(values[1]),
                score: Number(values[2]),
                lang: String(values[3]),
                issued_at: String(values[4]),
                attempt_id: String(values[5]),
              });
              return { success: true };
            },
          };
          return bound;
        },
        async first() {
          return null;
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };
}

function env(secret?: string): { env: Env; db: ReturnType<typeof memoryDb> } {
  const db = memoryDb();
  return {
    db,
    env: secret ? { DB: db, TURNSTILE_SECRET_KEY: secret } : { DB: db },
  };
}

function call(
  target: Env,
  path: string,
  init: RequestInit = {},
  fetchImpl?: typeof fetch,
  now?: () => number,
) {
  const headers = new Headers(init.headers);
  if (!headers.has("origin")) headers.set("origin", "http://localhost:5173");
  return handleRequest(
    new Request(`https://pstack-academy-api.auichai-s2.workers.dev${path}`, { ...init, headers }),
    target,
    {
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
      ...(now ? { now } : {}),
    },
  );
}

const sample = {
  id: "SC-TEST1234",
  name: "Amina Cho",
  score: 90,
  lang: "en",
  issued_at: "2026-11-08T12:00:00.000Z",
  attempt_id: "attempt-1",
};

afterEach(() => {
  resetRateLimit();
});

describe("cors", () => {
  it("allows the live site and localhost only", () => {
    expect(allowedOrigin("https://superchoice-academy-portal.lovable.app")).toBe(
      "https://superchoice-academy-portal.lovable.app",
    );
    expect(allowedOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(allowedOrigin("http://127.0.0.1:4173")).toBe("http://127.0.0.1:4173");
    expect(allowedOrigin("https://evil.example")).toBeNull();
    expect(allowedOrigin("http://localhost.evil.com")).toBeNull();
  });

  it("rejects a preflight from an unknown origin", async () => {
    const { env: target } = env();
    const response = await handleRequest(
      new Request("https://example.com/api/certificates", {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      }),
      target,
    );
    expect(response.status).toBe(403);
  });
});

describe("turnstile", () => {
  it("skips siteverify when the secret is unset", async () => {
    const { env: target } = env();
    const response = await call(target, "/api/turnstile/verify", {
      method: "POST",
      body: JSON.stringify({ token: "" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: true });
  });

  it("rejects a token the siteverify API does not accept", async () => {
    const { env: target } = env("secret");
    const response = await call(
      target,
      "/api/turnstile/verify",
      { method: "POST", body: JSON.stringify({ token: "bad" }) },
      async () => Response.json({ success: false }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false });
  });
});

describe("certificates", () => {
  it("stores a certificate and reads it back", async () => {
    const { env: target, db } = env();
    const created = await call(target, "/api/certificates", {
      method: "POST",
      body: JSON.stringify(sample),
    });
    expect(created.status).toBe(201);
    expect(db.rows.get(sample.id)?.name).toBe("Amina Cho");
    const fetched = await call(target, `/api/certificates/${sample.id}`);
    expect(fetched.status).toBe(200);
    const body = (await fetched.json()) as { certificate: CertificateRow };
    expect(body.certificate.score).toBe(90);
    expect(fetched.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("requires a passing siteverify result when the secret is set", async () => {
    const { env: target, db } = env("secret");
    const denied = await call(
      target,
      "/api/certificates",
      { method: "POST", body: JSON.stringify({ ...sample, turnstileToken: "nope" }) },
      async () => Response.json({ success: false }),
    );
    expect(denied.status).toBe(403);
    expect(db.rows.size).toBe(0);

    const allowed = await call(
      target,
      "/api/certificates",
      { method: "POST", body: JSON.stringify({ ...sample, turnstileToken: "yes" }) },
      async () => Response.json({ success: true }),
    );
    expect(allowed.status).toBe(201);
  });

  it("returns not_found for a missing id", async () => {
    const { env: target } = env();
    const response = await call(target, "/api/certificates/SC-MISSING");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("rate-limits repeated creates from one IP", async () => {
    const { env: target } = env();
    for (let index = 0; index < 10; index += 1) {
      const response = await call(target, "/api/certificates", {
        method: "POST",
        headers: { "cf-connecting-ip": "203.0.113.8" },
        body: JSON.stringify({ ...sample, id: `SC-RATE${index}` }),
      });
      expect(response.status).toBe(201);
    }
    const blocked = await call(target, "/api/certificates", {
      method: "POST",
      headers: { "cf-connecting-ip": "203.0.113.8" },
      body: JSON.stringify({ ...sample, id: "SC-RATEEXTRA" }),
    });
    expect(blocked.status).toBe(429);
  });
});
