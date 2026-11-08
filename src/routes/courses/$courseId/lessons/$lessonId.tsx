import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { MarkdownView } from "@/components/markdown-view";
import { listLessons, resolveLesson } from "@/lib/content";
import { fill } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/courses/$courseId/lessons/$lessonId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.lessonId} — SuperChoice AI` },
      { property: "og:title", content: `${params.lessonId} — SuperChoice AI` },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { courseId, lessonId } = Route.useParams();
  const { t, lang } = useI18n();
  const resolved = resolveLesson(courseId, lessonId, lang);
  if (!resolved) throw notFound();
  const lessons = listLessons(courseId, lang);
  const position = lessons.findIndex((item) => item.lesson.id === lessonId);
  const previous = position > 0 ? lessons[position - 1] : undefined;
  const next = position >= 0 ? lessons[position + 1] : undefined;
  const { lesson, fellBack } = resolved;
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${lesson.title} — ${t("brand.mark")}`} />
      <Link
        to="/courses/$courseId"
        params={{ courseId }}
        className="text-sm text-primary hover:underline"
      >
        {t("courses.courseTitle")}
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {fill(t("courses.lessonMinutes"), { count: lesson.minutes })}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{lesson.title}</h1>
      <p className="mt-4 text-muted-foreground">{lesson.summary}</p>
      <p className="mt-4 text-sm">
        <a href={lesson.source} target="_blank" rel="noreferrer" className="text-primary underline">
          {t("courses.original")}: {lesson.sourceLabel}
        </a>
      </p>
      {fellBack ? (
        <p className="mt-6 rounded-2xl border border-border bg-accent px-4 py-3 text-sm">
          {t("courses.fallback")}
        </p>
      ) : null}
      <div className="mt-8">
        <MarkdownView markdown={lesson.body} />
      </div>
      <div className="mt-10 flex flex-wrap justify-between gap-3">
        {previous ? (
          <Link
            to="/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: previous.lesson.id }}
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            {t("courses.prev")}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: next.lesson.id }}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("courses.next")}
          </Link>
        ) : (
          <Link
            to="/exam"
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("courses.startExam")}
          </Link>
        )}
      </div>
    </main>
  );
}
