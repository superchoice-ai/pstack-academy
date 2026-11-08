export type CertPayload = {
  id: string;
  name: string;
  score: number;
  correct: number;
  total: number;
  date: string;
  course: string;
  issuer: string;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCertificateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length] ?? "A";
  return `SC-${body}`;
}

function isPayload(value: unknown): value is CertPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["score"] === "number" &&
    typeof record["correct"] === "number" &&
    typeof record["total"] === "number" &&
    typeof record["date"] === "string" &&
    typeof record["course"] === "string" &&
    record["issuer"] === "SuperChoice AI"
  );
}

export function encodePayload(payload: CertPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function decodePayload(value: string): CertPayload | null {
  try {
    const padded =
      value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function verifyPath(origin: string, id: string, encoded: string): string {
  return `${origin}/verify/${encodeURIComponent(id)}?d=${encodeURIComponent(encoded)}`;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Wrap a JPEG in a one-page PDF. Lengths exclude the EOL that follows each stream. */
export function jpegToPdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number): Uint8Array {
  const encoder = new TextEncoder();
  const pageWidth = 842;
  const pageHeight = Math.max(1, Math.round((pageWidth * imageHeight) / imageWidth));
  const content = encoder.encode(`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q\n`);
  const objects = [
    encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`,
    ),
    concat([
      encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encoder.encode("endstream"),
    ]),
    concat([
      encoder.encode(
        `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      encoder.encode("\nendstream"),
    ]),
  ];

  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (part: Uint8Array) => {
    chunks.push(part);
    length += part.length;
  };
  const offsets = [0];
  push(encoder.encode("%PDF-1.4\n"));
  push(new Uint8Array([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));
  objects.forEach((body, index) => {
    offsets.push(length);
    push(encoder.encode(`${index + 1} 0 obj\n`));
    push(body);
    push(encoder.encode("\nendobj\n"));
  });
  const xrefAt = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let index = 1; index <= 5; index += 1) {
    xref += `${String(offsets[index] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  push(encoder.encode(xref));
  return concat(chunks);
}

export type CertificateCopy = {
  heading: string;
  issuedBy: string;
  statement: string;
  disclaimer: string;
  scoreLabel: string;
  dateLabel: string;
  idLabel: string;
  verifyLabel: string;
  course: string;
  score: string;
  date: string;
  id: string;
  name: string;
  verifyUrl: string;
  direction: "ltr" | "rtl";
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      const space = line.lastIndexOf(" ");
      if (space > 0) {
        lines.push(line.slice(0, space));
        line = line.slice(space + 1) + char;
      } else {
        lines.push(line);
        line = char;
      }
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line);
  return lines;
}

export async function renderCertificate(
  copy: CertificateCopy,
): Promise<{ png: string; pdf: Blob }> {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  await document.fonts.ready;
  await document.fonts.load("650 72px Fraunces").catch(() => undefined);

  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#8a4b24";
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

  ctx.direction = copy.direction;
  ctx.textAlign = copy.direction === "rtl" ? "right" : "left";
  const start = copy.direction === "rtl" ? 1480 : 120;
  ctx.fillStyle = "#8a4b24";
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.fillText(copy.issuedBy.toUpperCase(), start, 130);
  ctx.fillStyle = "#2a2118";
  ctx.font = "650 64px Fraunces, Palatino, serif";
  ctx.fillText(copy.heading, start, 210);
  ctx.font = "500 28px Outfit, sans-serif";
  ctx.fillStyle = "#6b5344";
  ctx.fillText(copy.course, start, 268);
  ctx.fillStyle = "#2a2118";
  ctx.font = "650 54px Fraunces, Palatino, serif";
  const nameLines = wrapText(ctx, copy.name, 1100);
  nameLines.slice(0, 2).forEach((line, index) => ctx.fillText(line, start, 380 + index * 64));
  ctx.font = "400 26px Outfit, sans-serif";
  ctx.fillStyle = "#3c3128";
  const statement = wrapText(ctx, copy.statement, 1100);
  statement.slice(0, 3).forEach((line, index) => ctx.fillText(line, start, 520 + index * 36));

  const facts = [
    [copy.scoreLabel, copy.score],
    [copy.dateLabel, copy.date],
    [copy.idLabel, copy.id],
  ] as const;
  facts.forEach((fact, index) => {
    const x = copy.direction === "rtl" ? 1480 - index * 360 : 120 + index * 360;
    ctx.fillStyle = "#8a4b24";
    ctx.font = "600 16px Outfit, sans-serif";
    ctx.fillText(fact[0].toUpperCase(), x, 670);
    ctx.fillStyle = "#2a2118";
    ctx.font = "600 28px Outfit, sans-serif";
    ctx.fillText(fact[1], x, 708);
  });

  ctx.font = "400 18px Outfit, sans-serif";
  ctx.fillStyle = "#5c4b3e";
  const disclaimer = wrapText(ctx, copy.disclaimer, 980);
  disclaimer.slice(0, 4).forEach((line, index) => ctx.fillText(line, start, 800 + index * 28));

  const { encode } = await import("uqr");
  const qr = encode(copy.verifyUrl, { ecc: "M", border: 2 });
  const cell = 5;
  const size = qr.size * cell;
  const qx = copy.direction === "rtl" ? 110 : canvas.width - 120 - size;
  const qy = canvas.height - 140 - size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qx - 10, qy - 10, size + 20, size + 20);
  ctx.fillStyle = "#2a2118";
  for (let row = 0; row < qr.size; row += 1) {
    for (let col = 0; col < qr.size; col += 1) {
      if (qr.data[row]?.[col]) ctx.fillRect(qx + col * cell, qy + row * cell, cell, cell);
    }
  }
  ctx.font = "600 16px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.direction = "ltr";
  ctx.fillText(copy.verifyLabel, qx + size / 2, qy + size + 28);

  const png = canvas.toDataURL("image/png");
  const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = Uint8Array.from(atob(jpegUrl.split(",")[1] ?? ""), (char) =>
    char.charCodeAt(0),
  );
  const pdfBytes = jpegToPdf(jpegBytes, canvas.width, canvas.height);
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  );
  return { png, pdf: new Blob([pdfBuffer as ArrayBuffer], { type: "application/pdf" }) };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
