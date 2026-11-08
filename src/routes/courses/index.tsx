import { Link, createFileRoute } from "@tanstack/react-router";

import { listLessons } from "@/lib/content";
import { fill } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — SuperChoice AI" },
      { name: "description", content: "Free community courses. pstack Fundamentals is the first." },
      { property: "og:title", content: "Courses — SuperChoice AI" },
    ],
  }),
  component: CourseCatalog,
});

function CourseCatalog() {
  const { t, lang } = useI18n();
  const lessons = listLessons("pstack-fundamentals", lang);
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <PageTitle title={`${t("courses.title")} — ${t("brand.mark")}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {t("brand.academy")}
      </p>
      <h1 className="mt-3 font-serif text-5xl">{t("courses.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("courses.lede")}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {fill(t("courses.lessons"), { count: lessons.length })}
          </p>
          <h2 className="mt-3 font-serif text-3xl">{t("courses.courseTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("courses.courseBody")}</p>
          <Link
            to="/courses/$courseId"
            params={{ courseId: "pstack-fundamentals" }}
            className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("courses.open")}
          </Link>
        </article>
        <article className="rounded-3xl border border-dashed border-border bg-secondary/50 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            {t("home.soon.kicker")}
          </p>
          <h2 className="mt-3 font-serif text-3xl">{t("courses.soonTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("courses.soonBody")}</p>
        </article>
      </div>
    </main>
  );
}
