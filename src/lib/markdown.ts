function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeUrl(url: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "mailto:"
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

function renderInline(raw: string): string {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  const parts: string[] = [];
  let last = 0;
  for (const match of raw.matchAll(pattern)) {
    const index = match.index ?? 0;
    parts.push(escapeHtml(raw.slice(last, index)));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(`<code>${escapeHtml(token.slice(1, -1))}</code>`);
    } else if (token.startsWith("**")) {
      parts.push(`<strong>${escapeHtml(token.slice(2, -2))}</strong>`);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const label = link?.[1] ?? "";
      const href = safeUrl(link?.[2] ?? "");
      if (!href) parts.push(escapeHtml(label));
      else {
        const external = href.startsWith("http") ? ' rel="noreferrer" target="_blank"' : "";
        parts.push(`<a href="${escapeHtml(href)}"${external}>${escapeHtml(label)}</a>`);
      }
    }
    last = index + token.length;
  }
  parts.push(escapeHtml(raw.slice(last)));
  return parts.join("");
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("#") ||
    line.startsWith("```") ||
    line.startsWith("> ") ||
    line.startsWith("- ") ||
    /^\d+\. /.test(line) ||
    line.trim() === "---"
  );
}

/** Escape raw HTML, then render a small Markdown subset used by posts and lessons. */
export function renderMarkdown(source: string): string {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      out.push(`<pre class="code-block"><code>${escapeHtml(buffer.join("\n"))}</code></pre>`);
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${renderInline(line.slice(4))}</h3>`);
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h2>${renderInline(line.slice(2))}</h2>`);
      index += 1;
      continue;
    }
    if (line.trim() === "---") {
      out.push("<hr />");
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const buffer: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("> ")) {
        buffer.push((lines[index] ?? "").slice(2));
        index += 1;
      }
      out.push(`<blockquote><p>${renderInline(buffer.join(" "))}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("- ")) {
        items.push(`<li>${renderInline((lines[index] ?? "").slice(2))}</li>`);
        index += 1;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index] ?? "")) {
        items.push(`<li>${renderInline((lines[index] ?? "").replace(/^\d+\. /, ""))}</li>`);
        index += 1;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    const buffer = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? "").trim() !== "" &&
      !isBlockStart(lines[index] ?? "")
    ) {
      buffer.push(lines[index] ?? "");
      index += 1;
    }
    out.push(`<p>${renderInline(buffer.join(" "))}</p>`);
  }
  return out.join("\n");
}
