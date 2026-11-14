type TimingSafeSubtle = SubtleCrypto & {
  timingSafeEqual(left: ArrayBuffer, right: ArrayBuffer): boolean;
};

function timingSafeEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
  return (crypto.subtle as TimingSafeSubtle).timingSafeEqual(left, right);
}

/** Compare secrets without leaking the expected value through string equality. */
export async function tokensEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(providedHash, expectedHash);
}

export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] ?? "";
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64urlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

const LEAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLeadId(value: string): boolean {
  return LEAD_ID.test(value);
}

export async function signLeadId(secret: string, leadId: string): Promise<string> {
  const mac = await hmac(secret, leadId);
  return `${leadId}.${base64url(mac)}`;
}

export async function unsubscribeUrl(
  origin: string,
  secret: string,
  leadId: string,
): Promise<string> {
  const token = await signLeadId(secret, leadId);
  return `${origin}/u/${token}`;
}

export async function verifyLeadToken(secret: string, token: string): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  const leadId = dot > 0 ? token.slice(0, dot) : "";
  const macPart = dot > 0 ? token.slice(dot + 1) : token;
  const expected = await hmac(secret, isLeadId(leadId) ? leadId : token);
  const provided = base64urlDecode(macPart);
  const providedHash = await crypto.subtle.digest(
    "SHA-256",
    provided ?? new TextEncoder().encode(macPart),
  );
  const expectedHash = await crypto.subtle.digest("SHA-256", expected);
  const matches = timingSafeEqual(providedHash, expectedHash);
  if (!matches || !provided || provided.length !== expected.length || !isLeadId(leadId))
    return null;
  return leadId;
}
