import { listPosts } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { htmlLang } from "@/lib/languages";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildJsonFeed(origin: string): string {
  const items = listPosts("en").flatMap(({ post }) => {
    const localized = (["en", "th"] as const).flatMap((language) => {
      const match = listPosts(language).find(
        (item) => item.post.slug === post.slug && !item.fellBack,
      );
      return match ? [match.post] : [];
    });
    return localized.map((entry) => ({
      id: `${origin}/blog/${entry.slug}#${entry.lang}`,
      url: `${origin}/blog/${entry.slug}`,
      title: entry.title,
      summary: entry.summary,
      content_html: renderMarkdown(entry.body),
      date_published: `${entry.date}T00:00:00Z`,
      tags: entry.tags,
      language: htmlLang(entry.lang),
      authors: [{ name: entry.author }],
    }));
  });
  return JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: "SuperChoice AI",
      home_page_url: `${origin}/`,
      feed_url: `${origin}/feed.json`,
      description: "Essays from the SuperChoice AI community academy.",
      items,
    },
    null,
    2,
  );
}

export function buildRss(origin: string): string {
  const items = listPosts("en")
    .map(({ post }) => {
      const link = `${origin}/blog/${post.slug}`;
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(link)}</link>
  <guid>${escapeXml(link)}</guid>
  <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
  <description>${escapeXml(post.summary)}</description>
</item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>SuperChoice AI</title>
  <link>${escapeXml(origin)}/</link>
  <description>Essays from the SuperChoice AI community academy.</description>
  <language>en</language>
  ${items}
</channel>
</rss>`;
}
