import "./setup";

import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import type { LeadDb } from "../src/db";
import { handleRequest } from "../src/handler";
import { signLeadId } from "../src/tokens";
import { migrationFiles, openTestDb } from "./d1";

const TOKEN = "test-api-token-value";
const SECRET = "test-unsubscribe-secret";
const NOW = new Date("2026-11-14T02:00:00.000Z");

const open: Array<{ close(): void }> = [];

afterEach(() => {
  for (const db of open) db.close();
  open.length = 0;
});

function db() {
  const database = openTestDb();
  open.push(database);
  return database;
}

function env(
  database: LeadDb,
  overrides: { LEADS_API_TOKEN?: string; LEADS_UNSUBSCRIBE_SECRET?: string } = {},
) {
  return {
    DB: database,
    LEADS_API_TOKEN: "LEADS_API_TOKEN" in overrides ? overrides.LEADS_API_TOKEN : TOKEN,
    LEADS_UNSUBSCRIBE_SECRET:
      "LEADS_UNSUBSCRIBE_SECRET" in overrides ? overrides.LEADS_UNSUBSCRIBE_SECRET : SECRET,
  };
}

function call(
  database: LeadDb,
  path: string,
  init: RequestInit = {},
  overrides?: { LEADS_API_TOKEN?: string; LEADS_UNSUBSCRIBE_SECRET?: string },
) {
  return handleRequest(
    new Request(`https://leads.example${path}`, init),
    env(database, overrides),
    {
      now: () => NOW,
    },
  );
}

function authed(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return { ...init, headers };
}

function lead(overrides: Record<string, unknown> = {}) {
  return {
    business_name: "ร้านกาแฟทดสอบ",
    industry: "คาเฟ่",
    website: "https://cafe.example.co.th",
    email: "owner@cafe.example.co.th",
    phone: "0812345678",
    line_id: "@cafeth",
    line_url: "https://lin.ee/cafeth",
    source_url: "https://example.com/source",
    fit_score: 82,
    notes: "เปิดสาขาใหม่",
    pain_point: "ไม่มีระบบจอง",
    ...overrides,
  };
}

async function upsert(database: LeadDb, leads: Array<Record<string, unknown>>) {
  const response = await call(
    database,
    "/api/leads/upsert",
    authed({
      method: "POST",
      body: JSON.stringify({ leads }),
    }),
  );
  return { response, body: (await response.json()) as { results: Array<Record<string, unknown>> } };
}

describe("migrations", () => {
  it("applies twice and leaves an existing certificates table alone", () => {
    const sqlite = new Database(":memory:");
    open.push(sqlite);
    sqlite.exec("CREATE TABLE certificates (id TEXT PRIMARY KEY, name TEXT NOT NULL)");
    sqlite.exec("INSERT INTO certificates (id, name) VALUES ('SC-1', 'Amina')");
    const files = migrationFiles();
    expect(files[0]?.name).toBe("0001_leads.sql");
    for (const file of files) {
      expect(file.sql.toLowerCase()).not.toContain("certificates");
      expect(file.sql.toLowerCase()).not.toContain("drop table leads");
    }
    expect(files[0]?.sql.toLowerCase()).not.toContain("drop ");
    sqlite.exec(files[0]!.sql);
    sqlite.exec(files[0]!.sql);
    for (const file of files.slice(1)) sqlite.exec(file.sql);
    const row = sqlite.query("SELECT name FROM certificates WHERE id = ?").get("SC-1") as {
      name: string;
    };
    expect(row.name).toBe("Amina");
    sqlite
      .query(
        "INSERT INTO leads (id, business_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("1", "A", "a@acme.co.th", "2026-11-14T00:00:00.000Z", "2026-11-14T00:00:00.000Z");
    expect(() =>
      sqlite
        .query(
          "INSERT INTO leads (id, business_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run("2", "B", "a@acme.co.th", "2026-11-14T00:00:00.000Z", "2026-11-14T00:00:00.000Z"),
    ).toThrow(/UNIQUE/i);
    sqlite
      .query(
        "INSERT INTO leads (id, business_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("3", "C", "", "2026-11-14T00:00:00.000Z", "2026-11-14T00:00:00.000Z");
    sqlite
      .query(
        "INSERT INTO leads (id, business_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("4", "D", "", "2026-11-14T00:00:00.000Z", "2026-11-14T00:00:00.000Z");
    const empties = sqlite.query("SELECT COUNT(*) AS n FROM leads WHERE email = ''").get() as {
      n: number;
    };
    expect(empties.n).toBe(2);
    const columns = sqlite.query("PRAGMA table_info(leads)").all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toContain("line_url");
    sqlite
      .query(
        "INSERT INTO touches (id, lead_id, channel, direction, subject, summary, sent_at, client_ref, created_at) VALUES (?, ?, ?, ?, '', '', ?, '', ?)",
      )
      .run(
        "t1",
        "1",
        "imessage",
        "outbound",
        "2026-11-14T00:00:00.000Z",
        "2026-11-14T00:00:00.000Z",
      );
    const touch = sqlite.query("SELECT channel FROM touches WHERE id = ?").get("t1") as {
      channel: string;
    };
    expect(touch.channel).toBe("imessage");
  });
});

describe("auth", () => {
  it("rejects a missing, wrong, or prefix token and a worker with no secret", async () => {
    const database = db();
    const missing = await call(database, "/api/stats");
    expect(missing.status).toBe(401);
    const wrong = await call(database, "/api/stats", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(wrong.status).toBe(401);
    const prefix = await call(database, "/api/stats", {
      headers: { authorization: `Bearer ${TOKEN.slice(0, 4)}` },
    });
    expect(prefix.status).toBe(401);
    const openApi = await call(
      database,
      "/api/leads/upsert",
      {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ leads: [lead()] }),
      },
      { LEADS_API_TOKEN: undefined },
    );
    expect(openApi.status).toBe(503);
    const listed = await call(database, "/api/leads", authed());
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as { total: number }).total).toBe(0);
  });

  it("points the service description at the Lovable dashboard and does not serve HTML", async () => {
    const database = db();
    const home = await call(database, "/");
    expect(home.status).toBe(200);
    expect(await home.json()).toEqual({
      service: "superchoice-leads",
      dashboard: "https://superchoice-academy-portal.lovable.app/leads",
      unsubscribe: "/u/:token",
    });
    const page = await call(database, "/dashboard");
    expect(page.status).toBe(404);
  });

  it("allows the Lovable app and localhost to call the API", async () => {
    const database = db();
    const lovable = "https://superchoice-academy-portal.lovable.app";
    const preflight = await call(database, "/api/stats", {
      method: "OPTIONS",
      headers: { origin: lovable, "access-control-request-method": "GET" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(lovable);
    expect(preflight.headers.get("access-control-allow-headers")).toContain("authorization");

    const local = await call(
      database,
      "/api/stats",
      authed({ headers: { origin: "http://127.0.0.1:5173" } }),
    );
    expect(local.status).toBe(200);
    expect(local.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");

    const denied = await call(database, "/api/stats", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" },
    });
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("dedupe", () => {
  it("updates the same email and does not create a second row", async () => {
    const database = db();
    const first = await upsert(database, [
      lead(),
      lead({ business_name: "ร้านกาแฟทดสอบ สาขา 2", fit_score: 90 }),
    ]);
    expect(first.response.status).toBe(200);
    expect(first.body.results.map((item) => item.action)).toEqual(["created", "updated"]);
    expect(first.body.results[0]?.id).toBe(first.body.results[1]?.id);
    const listed = await call(database, "/api/leads", authed());
    const body = (await listed.json()) as {
      total: number;
      leads: Array<{ business_name: string; fit_score: number }>;
    };
    expect(body.total).toBe(1);
    expect(body.leads[0]?.business_name).toBe("ร้านกาแฟทดสอบ สาขา 2");
    expect(body.leads[0]?.fit_score).toBe(90);
  });

  it("treats a second company address as the same domain and keeps separate gmail leads", async () => {
    const database = db();
    const created = await upsert(database, [
      lead(),
      lead({ email: "manager@cafe.example.co.th", business_name: "ผู้จัดการร้าน" }),
      lead({
        email: "a@gmail.com",
        website: "",
        business_name: "ฟรีเมล ก",
      }),
      lead({
        email: "b@gmail.com",
        website: "",
        business_name: "ฟรีเมล ข",
      }),
    ]);
    expect(created.body.results.map((item) => item.action)).toEqual([
      "created",
      "duplicate",
      "created",
      "created",
    ]);
    expect(created.body.results[1]?.match).toBe("domain");
    const listed = await call(database, "/api/leads?limit=10", authed());
    expect(((await listed.json()) as { total: number }).total).toBe(3);
  });

  it("dedupes two freemail addresses that share a company website", async () => {
    const database = db();
    const created = await upsert(database, [
      lead({
        email: "a@gmail.com",
        website: "https://shared.example.co.th",
        business_name: "บริษัท เอ",
      }),
      lead({
        email: "b@gmail.com",
        website: "https://www.shared.example.co.th/about",
        business_name: "บริษัท เอ",
      }),
    ]);
    expect(created.body.results.map((item) => item.action)).toEqual(["created", "duplicate"]);
    const listed = await call(database, "/api/leads", authed());
    expect(((await listed.json()) as { total: number }).total).toBe(1);
  });

  it("rejects a search quote and an unknown status without failing", async () => {
    const database = db();
    await upsert(database, [lead()]);
    const found = await call(
      database,
      "/api/leads?q=" + encodeURIComponent("กาแฟ' OR 1=1 --"),
      authed(),
    );
    expect(found.status).toBe(200);
    const bad = await call(database, "/api/leads?status=customer", authed());
    expect(bad.status).toBe(400);
    const filtered = await call(
      database,
      "/api/leads?status=new&q=" + encodeURIComponent("กาแฟ"),
      authed(),
    );
    expect(((await filtered.json()) as { total: number }).total).toBe(1);
    const other = await call(database, "/api/leads?status=won", authed());
    expect(((await other.json()) as { total: number }).total).toBe(0);
  });
});

describe("opt-out", () => {
  it("opts out from a signed link and blocks later sends and upserts", async () => {
    const database = db();
    const created = await upsert(database, [lead()]);
    const id = String(created.body.results[0]?.id);
    const helper = await call(database, `/api/leads/${id}/unsubscribe-url`, authed());
    expect(helper.status).toBe(200);
    const url = ((await helper.json()) as { unsubscribe_url: string }).unsubscribe_url;
    const token = new URL(url).pathname.slice(3);
    const page = await call(database, `/u/${token}`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("ยกเลิกการรับอีเมลแล้ว");
    expect(html).toContain("You are unsubscribed");
    expect(html).not.toContain(token);
    const again = await call(database, `/u/${token}`, { method: "POST" });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true });

    const resent = await upsert(database, [lead({ business_name: "พยายามอีกครั้ง" })]);
    expect(resent.body.results[0]?.action).toBe("skipped");
    expect(resent.body.results[0]?.reason).toBe("opted_out");
    const send = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "email",
          direction: "outbound",
          subject: "สวัสดี",
          summary: "แนะนำเว็บ",
        }),
      }),
    );
    expect(send.status).toBe(409);
    expect(await send.json()).toEqual({ error: "opted_out" });

    const sibling = await upsert(database, [
      lead({ email: "other@cafe.example.co.th", business_name: "อีกคน" }),
    ]);
    expect(sibling.body.results[0]?.action).toBe("skipped");
    const check = await call(
      database,
      "/api/leads/check",
      authed({
        method: "POST",
        body: JSON.stringify({
          emails: ["other@cafe.example.co.th", "stranger@gmail.com"],
          domains: ["cafe.example.co.th", "gmail.com"],
        }),
      }),
    );
    const checked = (await check.json()) as {
      emails: Array<{ email: string; opted_out: boolean }>;
      domains: Array<{ domain: string; opted_out: boolean; error?: string }>;
    };
    expect(checked.emails[0]?.opted_out).toBe(true);
    expect(checked.emails[1]?.opted_out).toBe(false);
    expect(checked.domains[0]?.opted_out).toBe(true);
    expect(checked.domains[1]?.error).toBe("public_mailbox_domain");
  });

  it("does not suppress a different gmail address", async () => {
    const database = db();
    const created = await upsert(database, [
      lead({ email: "a@gmail.com", website: "", business_name: "เอ" }),
    ]);
    const id = String(created.body.results[0]?.id);
    const token = await signLeadId(SECRET, id);
    const page = await call(database, `/u/${token}`);
    expect(page.status).toBe(200);
    const other = await upsert(database, [
      lead({ email: "b@gmail.com", website: "", business_name: "บี" }),
    ]);
    expect(other.body.results[0]?.action).toBe("created");
    const check = await call(
      database,
      "/api/leads/check",
      authed({
        method: "POST",
        body: JSON.stringify({ emails: ["a@gmail.com", "b@gmail.com"], domains: [] }),
      }),
    );
    const emails = ((await check.json()) as { emails: Array<{ opted_out: boolean }> }).emails;
    expect(emails.map((item) => item.opted_out)).toEqual([true, false]);
  });

  it("rejects a tampered link and a signed id that has no lead", async () => {
    const database = db();
    const token = await signLeadId(SECRET, "11111111-1111-4111-8111-111111111111");
    const missing = await call(database, `/u/${token}`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("ไม่พบรายชื่อนี้");
    const dot = token.lastIndexOf(".");
    const mac = token.slice(dot + 1);
    const flipped = `${mac.startsWith("A") ? "B" : "A"}${mac.slice(1)}`;
    const tampered = await call(database, `/u/${token.slice(0, dot)}.${flipped}`);
    expect(tampered.status).toBe(400);
    const html = await tampered.text();
    expect(html).toContain("ลิงก์ไม่ถูกต้อง");
    expect(html).toContain("This unsubscribe link is invalid");
    expect(html).not.toContain(token);
    const junk = "zzz-not-a-signed-link";
    const invalid = await call(database, `/u/${junk}`);
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).not.toContain(junk);
  });
});

describe("pipeline", () => {
  it("logs a send, advances status, counts the Bangkok day, and ignores a retried ref", async () => {
    const database = db();
    const created = await upsert(database, [lead()]);
    const id = String(created.body.results[0]?.id);
    const outbound = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "email",
          direction: "outbound",
          subject: "เว็บแอพสำหรับร้าน",
          summary: "จองคิวและไลน์",
          sent_at: "2026-11-13T17:30:00.000Z",
          client_ref: "msg-1",
        }),
      }),
    );
    expect(outbound.status).toBe(200);
    const sent = (await outbound.json()) as { lead: { status: string }; duplicate: boolean };
    expect(sent.lead.status).toBe("contacted");
    expect(sent.duplicate).toBe(false);
    const retry = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "email",
          direction: "outbound",
          subject: "เว็บแอพสำหรับร้าน",
          summary: "จองคิวและไลน์",
          sent_at: "2026-11-13T17:30:00.000Z",
          client_ref: "msg-1",
        }),
      }),
    );
    expect(((await retry.json()) as { duplicate: boolean }).duplicate).toBe(true);

    const inbound = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          email: "owner@cafe.example.co.th",
          channel: "email",
          direction: "inbound",
          subject: "Re: เว็บแอพสำหรับร้าน",
          summary: "สนใจคุย",
          sent_at: "2026-11-14T01:00:00.000Z",
        }),
      }),
    );
    expect(((await inbound.json()) as { lead: { status: string } }).lead.status).toBe("replied");

    const yesterday = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "line",
          direction: "outbound",
          subject: "",
          summary: "ทักไลน์เมื่อวาน",
          sent_at: "2026-11-13T16:30:00.000Z",
        }),
      }),
    );
    expect(yesterday.status).toBe(200);

    const stats = await call(database, "/api/stats", authed());
    const overview = (await stats.json()) as {
      timezone: string;
      funnel: Record<string, number>;
      totals: { outbound: number; inbound: number; reply_rate: number };
      today: { date: string; sends: number; replies: number; reply_rate: number };
      sends_per_day: Array<{ date: string; sends: number }>;
    };
    expect(overview.timezone).toBe("Asia/Bangkok");
    expect(overview.funnel.replied).toBe(1);
    expect(overview.totals.outbound).toBe(2);
    expect(overview.totals.inbound).toBe(1);
    expect(overview.totals.reply_rate).toBe(0.5);
    expect(overview.today).toMatchObject({
      date: "2026-11-14",
      sends: 1,
      replies: 1,
      reply_rate: 1,
    });
    expect(overview.sends_per_day.map((day) => [day.date, day.sends])).toEqual([
      ["2026-11-13", 1],
      ["2026-11-14", 1],
    ]);

    const daily = await call(database, "/api/stats/daily?date=2026-11-13", authed());
    expect(((await daily.json()) as { sends: number; replies: number }).sends).toBe(1);

    const detail = await call(database, `/api/leads/${id}`, authed());
    const record = (await detail.json()) as { touches: unknown[]; lead: { notes: string } };
    expect(record.touches).toHaveLength(3);

    const patched = await call(
      database,
      `/api/leads/${id}`,
      authed({
        method: "PATCH",
        body: JSON.stringify({ notes: "นัดวันศุกร์", status: "talking" }),
      }),
    );
    expect(patched.status).toBe(200);
    expect(
      ((await patched.json()) as { lead: { notes: string; status: string } }).lead,
    ).toMatchObject({
      notes: "นัดวันศุกร์",
      status: "talking",
    });
  });

  it("returns and patches line_url and accepts imessage and whatsapp touches", async () => {
    const database = db();
    const created = await upsert(database, [
      lead({ email: "chat@shop.example.co.th", website: "" }),
    ]);
    const id = String(created.body.results[0]?.id);
    const listed = await call(database, `/api/leads/${id}`, authed());
    const before = (await listed.json()) as {
      lead: { phone: string; line_id: string; line_url: string };
    };
    expect(before.lead).toMatchObject({
      phone: "0812345678",
      line_id: "@cafeth",
      line_url: "https://lin.ee/cafeth",
    });

    const patched = await call(
      database,
      `/api/leads/${id}`,
      authed({
        method: "PATCH",
        body: JSON.stringify({
          phone: "+66812345678",
          line_id: "@shopth",
          line_url: "https://lin.ee/shopth",
        }),
      }),
    );
    expect(patched.status).toBe(200);
    expect(
      ((await patched.json()) as { lead: { phone: string; line_id: string; line_url: string } })
        .lead,
    ).toMatchObject({
      phone: "+66812345678",
      line_id: "@shopth",
      line_url: "https://lin.ee/shopth",
    });

    const imessage = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "imessage",
          direction: "outbound",
          summary: "ทัก iMessage",
          client_ref: "imessage-1",
        }),
      }),
    );
    const imessageBody = (await imessage.json()) as {
      touch: { channel: string };
      lead: { status: string };
    };
    expect(imessage.status).toBe(200);
    expect(imessageBody.touch.channel).toBe("imessage");
    expect(imessageBody.lead.status).toBe("contacted");

    const whatsapp = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "whatsapp",
          direction: "inbound",
          summary: "ตอบ WhatsApp",
        }),
      }),
    );
    expect(whatsapp.status).toBe(200);
    expect(((await whatsapp.json()) as { touch: { channel: string }; lead: { status: string } }).touch.channel).toBe(
      "whatsapp",
    );

    const bad = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "sms",
          direction: "outbound",
          summary: "ไม่รองรับ",
        }),
      }),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "invalid_channel" });
  });

  it("keeps a company suppressed after the status is set to opted_out and moved again", async () => {
    const database = db();
    const created = await upsert(database, [
      lead({ email: "a@patch.example.co.th", website: "", business_name: "แพตช์" }),
    ]);
    const id = String(created.body.results[0]?.id);
    const opted = await call(
      database,
      `/api/leads/${id}`,
      authed({
        method: "PATCH",
        body: JSON.stringify({ status: "opted_out", notes: "ขอหยุด" }),
      }),
    );
    expect(opted.status).toBe(200);
    expect(
      ((await opted.json()) as { suppressed: boolean; lead: { notes: string } }).lead.notes,
    ).toBe("ขอหยุด");
    const next = await upsert(database, [
      lead({
        email: "b@patch.example.co.th",
        website: "",
        business_name: "อีกบริษัท",
      }),
    ]);
    expect(next.body.results[0]?.action).toBe("skipped");
    const moved = await call(
      database,
      `/api/leads/${id}`,
      authed({
        method: "PATCH",
        body: JSON.stringify({ status: "talking" }),
      }),
    );
    const movedBody = (await moved.json()) as { suppressed: boolean; lead: { status: string } };
    expect(movedBody.lead.status).toBe("talking");
    expect(movedBody.suppressed).toBe(true);
    const send = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "email",
          direction: "outbound",
          subject: "อีกครั้ง",
          summary: "",
        }),
      }),
    );
    expect(send.status).toBe(409);
  });

  it("refuses an outbound send after a bounce and records an API opt-out", async () => {
    const database = db();
    const created = await upsert(database, [
      lead({ email: "bounce@shop.example.co.th", website: "" }),
    ]);
    const id = String(created.body.results[0]?.id);
    const bounced = await call(
      database,
      `/api/leads/${id}`,
      authed({
        method: "PATCH",
        body: JSON.stringify({ status: "bounced" }),
      }),
    );
    expect(bounced.status).toBe(200);
    const send = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: id,
          channel: "email",
          direction: "outbound",
          subject: "อีกครั้ง",
          summary: "",
        }),
      }),
    );
    expect(send.status).toBe(409);
    expect(await send.json()).toEqual({ error: "bounced" });

    const mailbox = await call(
      database,
      "/api/opt-outs",
      authed({
        method: "POST",
        body: JSON.stringify({ domain: "gmail.com" }),
      }),
    );
    expect(mailbox.status).toBe(400);

    const domain = await call(
      database,
      "/api/opt-outs",
      authed({
        method: "POST",
        body: JSON.stringify({ email: "owner@fresh.example.co.th" }),
      }),
    );
    expect(domain.status).toBe(200);
    const blocked = await upsert(database, [
      lead({
        email: "sales@fresh.example.co.th",
        website: "",
        business_name: "เฟรช",
      }),
    ]);
    expect(blocked.body.results[0]?.reason).toBe("opted_out");
  });
});

describe("csv import", () => {
  it("loads the sample send log and does not double-count a second import", async () => {
    const database = db();
    const csv = readFileSync(new URL("../sample-sends.csv", import.meta.url), "utf8");
    const first = await call(
      database,
      "/api/leads/import",
      authed({ method: "POST", body: csv, headers: { "content-type": "text/csv" } }),
    );
    expect(first.status).toBe(200);
    const imported = (await first.json()) as {
      results: Array<{ action: string; touch: string; status?: string; send_status?: string }>;
    };
    expect(imported.results).toHaveLength(12);
    expect(imported.results.filter((row) => row.touch === "logged")).toHaveLength(7);
    const stats = (await (await call(database, "/api/stats", authed())).json()) as {
      funnel: Record<string, number>;
      totals: { outbound: number };
    };
    expect(stats.funnel).toMatchObject({ new: 5, contacted: 6, bounced: 1 });
    expect(stats.totals.outbound).toBe(7);
    const day = await call(database, "/api/stats/daily?date=2026-11-13", authed());
    expect(((await day.json()) as { sends: number }).sends).toBe(2);

    const again = await call(
      database,
      "/api/leads/import",
      authed({ method: "POST", body: csv, headers: { "content-type": "text/csv" } }),
    );
    const second = (await again.json()) as { results: Array<{ touch: string }> };
    expect(second.results.filter((row) => row.touch === "logged")).toHaveLength(0);
    const after = (await (await call(database, "/api/stats", authed())).json()) as {
      totals: { outbound: number };
    };
    expect(after.totals.outbound).toBe(7);

    const bounced = await call(database, "/api/leads?q=bannaa-isan", authed());
    const bouncedId = (
      (await bounced.json()) as { leads: Array<{ id: string; status: string; notes: string }> }
    ).leads[0];
    expect(bouncedId?.status).toBe("bounced");
    const send = await call(
      database,
      "/api/touches",
      authed({
        method: "POST",
        body: JSON.stringify({
          lead_id: bouncedId?.id,
          channel: "email",
          direction: "outbound",
          subject: "อีกครั้ง",
          summary: "",
        }),
      }),
    );
    expect(send.status).toBe(409);

    const failed = await call(database, "/api/leads?q=sa-ard", authed());
    const failedLead = (
      (await failed.json()) as { leads: Array<{ status: string; notes: string }> }
    ).leads[0];
    expect(failedLead?.status).toBe("new");
    expect(failedLead?.notes).toContain("ส่งไม่สำเร็จ");
  });

  it("keeps a quoted comma inside the business name", async () => {
    const database = db();
    const csv = [
      "date,business,industry,email,website,source_url,reason,status,subject",
      '2026-11-10,"ร้านกาแฟ, สาขา 2",คาเฟ่,branch@quoted.example.co.th,https://quoted.example.co.th,https://quoted.example.co.th,คิวเต็ม,queued,เรื่อง',
      "2026-11-10,เสีย,คาเฟ่,not-an-email,, , ,nope,",
    ].join("\n");
    const response = await call(
      database,
      "/api/leads/import",
      authed({ method: "POST", body: csv, headers: { "content-type": "text/csv" } }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      results: Array<{ action: string; error?: string }>;
    };
    expect(body.results[0]?.action).toBe("created");
    expect(body.results[1]?.action).toBe("rejected");
    const listed = await call(database, "/api/leads?q=" + encodeURIComponent("สาขา 2"), authed());
    const name = ((await listed.json()) as { leads: Array<{ business_name: string }> }).leads[0]
      ?.business_name;
    expect(name).toBe("ร้านกาแฟ, สาขา 2");
  });
});
