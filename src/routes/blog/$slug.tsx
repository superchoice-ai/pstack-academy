import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { MarkdownView } from "@/components/markdown-view";
import { resolvePost } from "@/lib/content";
import { fill, formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — SuperChoice AI` },
      { property: "og:title", content: `${params.slug} — SuperChoice AI` },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const resolved = resolvePost(slug, lang);
  if (!resolved) throw notFound();
  const { post, fellBack } = resolved;
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${post.title} — ${t("brand.mark")}`} />
      <Link to="/blog" className="text-sm text-primary hover:underline">
        {t("blog.back")}
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {formatDate(post.date, lang)}
        {post.opinion ? ` · ${t("blog.opinion")}` : ""}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{post.title}</h1>
      <p className="mt-4 text-muted-foreground">{fill(t("blog.by"), { author: post.author })}</p>
      {fellBack ? (
        <p className="mt-6 rounded-2xl border border-border bg-accent px-4 py-3 text-sm">
          {t("blog.fallback")}
        </p>
      ) : null}
      <div className="mt-8">
        <MarkdownView markdown={post.body} />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Link
            key={tag}
            to="/blog/tags/$tag"
            params={{ tag }}
            className="rounded-full border border-border px-3 py-1 text-sm"
          >
            {tag}
          </Link>
        ))}
      </div>
    </main>
  );
}
