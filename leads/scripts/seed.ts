import { readFileSync } from "node:fs";

import { apiBase, apiToken, postCsv } from "./csv-client";

const sample = new URL("../sample-sends.csv", import.meta.url);
const csv = readFileSync(sample, "utf8");
const imported = (await postCsv(csv)) as {
  results: Array<{ email?: string; id?: string; action: string; error?: string }>;
};
console.log(`imported ${imported.results.length} rows`);

const headers = {
  authorization: `Bearer ${apiToken()}`,
  "content-type": "application/json",
};

async function leadId(email: string): Promise<string> {
  const response = await fetch(`${apiBase()}/api/leads?q=${encodeURIComponent(email)}&limit=5`, {
    headers,
  });
  const body = (await response.json()) as { leads: Array<{ id: string; email: string }> };
  const found = body.leads.find((lead) => lead.email === email);
  if (!response.ok || !found) {
    console.error(`missing lead ${email}`);
    process.exit(1);
  }
  return found.id;
}

async function patch(id: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${apiBase()}/api/leads/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(await response.text());
    process.exit(1);
  }
}

async function reply(id: string, subject: string, summary: string, sentAt: string): Promise<void> {
  const response = await fetch(`${apiBase()}/api/touches`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      lead_id: id,
      channel: "email",
      direction: "inbound",
      subject,
      summary,
      sent_at: sentAt,
      client_ref: `seed-reply:${id}`,
    }),
  });
  if (!response.ok) {
    console.error(await response.text());
    process.exit(1);
  }
}

const cafe = await leadId("owner@rimnam.example.co.th");
await patch(cafe, { fit_score: 88, status: "talking", notes: "นัดวันศุกร์บ่าย ดูระบบจองคิว" });
await reply(cafe, "Re: เว็บจองคิวสำหรับร้านกาแฟริมน้ำ", "สนใจ ขอนัดคุยวันศุกร์", "2026-11-14T02:30:00.000Z");

const dental = await leadId("hello@siam-dental.example.co.th");
await patch(dental, { fit_score: 91, status: "proposal", notes: "ส่งใบเสนอราคาคิวนัดคนไข้แล้ว" });

const hotel = await leadId("stay@baansuan-cm.example.co.th");
await patch(hotel, { fit_score: 84, status: "won", notes: "ปิดงานหน้าจองห้อง" });

const fitness = await leadId("hello@ladprao-fit.example.co.th");
await patch(fitness, { fit_score: 76, status: "replied" });
await reply(fitness, "Re: ต่ออายุสมาชิกและจองคลาส", "ขอรายละเอียดแพ็กเกจ", "2026-11-13T08:00:00.000Z");

await patch(await leadId("service@rama3-garage.example.co.th"), { fit_score: 73 });
await patch(await leadId("hello@suk-bakery.example.co.th"), { fit_score: 80 });
await patch(await leadId("hello@pakkhlong-flowers.example.co.th"), { fit_score: 70 });
await patch(await leadId("admin@near-language.example.co.th"), { fit_score: 66 });
await patch(await leadId("shop@tonmai-online.example.co.th"), { fit_score: 62 });
await patch(await leadId("book@sa-ard.example.co.th"), { fit_score: 58 });
await patch(await leadId("care@thonglor-pets.example.co.th"), { fit_score: 55 });
await patch(await leadId("owner@bannaa-isan.example.co.th"), { fit_score: 40 });

console.log("seeded pipeline follow-ups");
