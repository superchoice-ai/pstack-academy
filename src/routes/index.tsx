import { Link, createFileRoute } from "@tanstack/react-router";

import { listPosts } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SuperChoice AI" },
      {
        name: "description",
        content: "A community academy: essays, pstack Fundamentals, and a public certificate.",
      },
      { property: "og:title", content: "SuperChoice AI" },
      {
        property: "og:description",
        content: "Essays, a free pstack course, and a community certificate.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, lang } = useI18n();
  const posts = listPosts(lang).slice(0, 2);
  return (
    <main>
      <PageTitle title={`${t("brand.mark")} — ${t("brand.academy")}`} />
      <section className="paper-grid border-b border-border">
        <div className="mx-auto grid max-w-6xl items-end gap-10 px-6 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {t("home.kicker")}
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] md:text-6xl">
              {t("home.title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("home.lede")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground"
              >
                {t("home.ctaCourse")}
              </Link>
              <Link
                to="/blog"
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm"
              >
                {t("home.ctaBlog")}
              </Link>
            </div>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">{t("home.disclaimer")}</p>
          </div>
          <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm md:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("home.course.kicker")}
            </p>
            <h2 className="mt-3 font-serif text-3xl">{t("home.course.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("home.course.body")}</p>
            <p className="mt-4 text-sm">{t("home.course.meta")}</p>
            <Link
              to="/courses"
              className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background"
            >
              {t("home.course.cta")}
            </Link>
          </aside>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("home.journal.kicker")}
            </p>
            <h2 className="mt-2 font-serif text-4xl">{t("home.journal.title")}</h2>
          </div>
          <Link to="/blog" className="text-sm text-primary hover:underline">
            {t("home.journal.all")}
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {posts.map(({ post }) => (
            <Link
              key={post.slug}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="rounded-3xl border border-border bg-card p-6 hover:border-primary"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {formatDate(post.date, lang)}
                {post.opinion ? ` · ${t("blog.opinion")}` : ""}
              </p>
              <h3 className="mt-3 font-serif text-2xl">{post.title}</h3>
              <p className="mt-3 text-muted-foreground">{post.summary}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("home.soon.kicker")}
          </p>
          <h2 className="mt-2 font-serif text-4xl">{t("home.soon.title")}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("home.soon.body")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {(
              [
                ["01", "home.soon.line.title", "home.soon.line.body"],
                ["02", "home.soon.n8n.title", "home.soon.n8n.body"],
                ["03", "home.soon.mcp.title", "home.soon.mcp.body"],
                ["04", "home.soon.api.title", "home.soon.api.body"],
              ] as const
            ).map(([number, title, body]) => (
              <article
                key={number}
                className="rounded-3xl border border-dashed border-border bg-card p-5"
              >
                <p className="font-serif text-2xl text-primary">{number}</p>
                <h3 className="mt-3 font-semibold">{t(title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(body)}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("home.soon.kicker")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
