import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { readAttempt, type Attempt } from "@/lib/attempt";
import { fill } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";
import { questionById } from "@/lib/questions";

export const Route = createFileRoute("/exam/result")({
  head: () => ({
    meta: [{ title: "Exam result — SuperChoice AI" }, { name: "robots", content: "noindex" }],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { t, lang } = useI18n();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);

  useEffect(() => {
    const current = readAttempt();
    setAttempt(current && current.status === "submitted" ? current : null);
  }, []);

  if (attempt === undefined) return <p className="px-6 py-16">{t("session.loading")}</p>;
  if (!attempt?.result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p>{t("cert.needPass")}</p>
        <Link to="/exam" className="mt-4 inline-flex text-primary underline">
          {t("cert.backExam")}
        </Link>
      </main>
    );
  }

  const { result } = attempt;
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle
        title={`${result.passed ? t("result.passTitle") : t("result.failTitle")} — ${t("brand.mark")}`}
      />
      <h1 className="font-serif text-5xl">
        {result.passed ? t("result.passTitle") : t("result.failTitle")}
      </h1>
      <p className="mt-4 text-2xl" data-testid="exam-score">
        {fill(t("result.score"), {
          correct: result.correct,
          total: result.total,
          percent: result.percent,
        })}
      </p>
      <p className="mt-3 text-muted-foreground">
        {result.passed ? t("result.passBody") : t("result.failBody")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {fill(t("result.focusLosses"), { count: attempt.blurCount })}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {result.passed ? (
          <Link
            to="/certificate"
            data-testid="create-certificate"
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("result.certificate")}
          </Link>
        ) : null}
        <Link to="/exam" className="rounded-full border border-border px-4 py-2 text-sm">
          {t("result.retry")}
        </Link>
      </div>
      <h2 className="mt-12 font-serif text-3xl">{t("result.review")}</h2>
      <ol className="mt-6 grid gap-4">
        {attempt.questionIds.map((id) => {
          const resolved = questionById(lang, id);
          if (!resolved) return null;
          const order = attempt.optionOrders[id] ?? [0, 1, 2, 3];
          const selected = attempt.answers[id];
          const selectedOriginal = selected === undefined ? undefined : order[selected];
          const correct = selectedOriginal === resolved.question.answer;
          const yourText =
            selectedOriginal === undefined
              ? t("session.unansweredCount")
              : resolved.question.choices[selectedOriginal];
          return (
            <li key={id} className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {correct ? t("result.correct") : t("result.incorrect")}
              </p>
              <p className="mt-2 font-medium">{resolved.question.prompt}</p>
              <p className="mt-3 text-sm">
                {t("result.yourAnswer")}: {yourText ?? "—"}
              </p>
              <p className="text-sm">
                {t("result.correctAnswer")}: {resolved.question.choices[resolved.question.answer]}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("result.explanation")}: {resolved.question.explanation}
              </p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
