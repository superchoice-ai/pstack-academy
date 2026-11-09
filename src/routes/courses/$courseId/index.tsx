import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { listLessons } from "@/lib/content";
import { fill } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

const COURSE_DESCRIPTION = "Two lessons and an exam for a community certificate.";

export const Route = createFileRoute("/courses/$courseId/")({
  head: () => ({
    meta: [
      { title: "pstack Fundamentals — SuperChoice AI" },
      { name: "description", content: COURSE_DESCRIPTION },
      { property: "og:title", content: "pstack Fundamentals — SuperChoice AI" },
      { property: "og:description", content: COURSE_DESCRIPTION },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { t, lang } = useI18n();
  if (courseId !== "pstack-fundamentals") throw notFound();
  const lessons = listLessons(courseId, lang);
  if (lessons.length === 0) throw notFound();
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${t("courses.courseTitle")} — ${t("brand.mark")}`} />
      <Link to="/courses" className="text-sm text-primary hover:underline">
        {t("courses.back")}
      </Link>
      <h1 className="mt-6 font-serif text-5xl">{t("courses.courseTitle")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("courses.courseBody")}</p>
      <p className="mt-4 text-sm">{t("courses.examNote")}</p>
      <ol className="mt-8 grid gap-3">
        {lessons.map(({ lesson }, position) => (
          <li key={lesson.id}>
            <Link
              to="/courses/$courseId/lessons/$lessonId"
              params={{ courseId, lessonId: lesson.id }}
              className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-card p-5 hover:border-primary"
            >
              <span>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {position + 1} · {fill(t("courses.lessonMinutes"), { count: lesson.minutes })}
                </span>
                <span className="mt-1 block font-serif text-2xl">{lesson.title}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{lesson.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        to="/exam"
        className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground"
      >
        {t("courses.startExam")}
      </Link>
    </main>
  );
}
