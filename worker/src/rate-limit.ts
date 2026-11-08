const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 10;

type Bucket = { start: number; count: number };

const buckets = new Map<string, Bucket>();

/** Light per-isolate cap: 10 certificate creates per IP per 10 minutes. */
export function allowIp(ip: string, now = Date.now()): boolean {
  const current = buckets.get(ip);
  if (!current || now - current.start >= WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return true;
  }
  if (current.count >= LIMIT) return false;
  current.count += 1;
  return true;
}

export function resetRateLimit(): void {
  buckets.clear();
}
