import { Link, createFileRoute } from "@tanstack/react-router";

import { listPosts } from "@/lib/content";
import { fill, formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/blog/tags/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.tag} — SuperChoice AI` },
      { property: "og:title", content: `${params.tag} — SuperChoice AI` },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const { t, lang } = useI18n();
  const posts = listPosts(lang).filter(({ post }) => post.tags.includes(tag));
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${tag} — ${t("brand.mark")}`} />
      <Link to="/blog" className="text-sm text-primary hover:underline">
        {t("blog.back")}
      </Link>
      <h1 className="mt-6 font-serif text-4xl">{fill(t("blog.tagTitle"), { tag })}</h1>
      {posts.length === 0 ? <p className="mt-6 text-muted-foreground">{t("blog.empty")}</p> : null}
      <div className="mt-8 grid gap-4">
        {posts.map(({ post }) => (
          <Link
            key={post.slug}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="rounded-3xl border border-border bg-card p-5"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {formatDate(post.date, lang)}
            </p>
            <h2 className="mt-2 font-serif text-2xl">{post.title}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
