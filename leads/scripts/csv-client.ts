export function apiBase(): string {
  return (process.env.LEADS_API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}

export function apiToken(): string {
  const token = process.env.LEADS_API_TOKEN ?? "";
  if (!token) {
    console.error("Set LEADS_API_TOKEN to the worker secret.");
    process.exit(1);
  }
  return token;
}

export async function postCsv(csv: string): Promise<unknown> {
  const response = await fetch(`${apiBase()}/api/leads/import`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken()}`,
      "content-type": "text/csv; charset=utf-8",
    },
    body: csv,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    console.error(JSON.stringify(body));
    process.exit(1);
  }
  return body;
}
