import { readFileSync } from "node:fs";

import { postCsv } from "./csv-client";

const file = process.argv[2];
if (!file) {
  console.error(
    "Usage: LEADS_API_BASE=... LEADS_API_TOKEN=... bun scripts/import-csv.ts sends.csv",
  );
  process.exit(1);
}

const csv = readFileSync(file, "utf8");
const body = (await postCsv(csv)) as {
  results: Array<{ action: string; touch: string; error?: string }>;
};
const counts = { created: 0, updated: 0, duplicate: 0, skipped: 0, rejected: 0, logged: 0 };
for (const result of body.results) {
  if (result.action in counts) counts[result.action as keyof typeof counts] += 1;
  if (result.touch === "logged") counts.logged += 1;
}
console.log(JSON.stringify(counts));
