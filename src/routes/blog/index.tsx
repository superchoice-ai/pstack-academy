import { Link, createFileRoute } from "@tanstack/react-router";

import { listPosts, listTags } from "@/lib/content";
import { fill, formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Journal — SuperChoice AI" },
      {
        name: "description",
        content: "Essays from SuperChoice AI on agents, pstack, and the human web.",
      },
      { property: "og:title", content: "Journal — SuperChoice AI" },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { t, lang } = useI18n();
  const posts = listPosts(lang);
  const tags = listTags();
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <PageTitle title={`${t("blog.title")} — ${t("brand.mark")}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {t("brand.academy")}
      </p>
      <h1 className="mt-3 font-serif text-5xl">{t("blog.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("blog.lede")}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            to="/blog/tags/$tag"
            params={{ tag }}
            className="rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
          >
            {tag}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-4">
        {posts.map(({ post }) => (
          <article key={post.slug} className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {formatDate(post.date, lang)}
              {post.opinion ? ` · ${t("blog.opinion")}` : ""}
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{post.summary}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {fill(t("blog.by"), { author: post.author })}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
