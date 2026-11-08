import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { TurnstileWidget, turnstileSiteKey } from "@/components/turnstile";
import { createAttempt, readAttempt, type Attempt } from "@/lib/attempt";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/exam/")({
  head: () => ({
    meta: [
      { title: "Exam — SuperChoice AI" },
      { name: "description", content: "Twenty questions, thirty minutes, eighty percent to pass." },
      { property: "og:title", content: "pstack Fundamentals exam — SuperChoice AI" },
    ],
  }),
  component: ExamLanding,
});

function ExamLanding() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<Attempt | null>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    setExisting(readAttempt());
  }, []);

  const start = () => {
    if (name.trim().length < 2) {
      setError(t("exam.needName"));
      return;
    }
    if (siteKey && !token) {
      setError(t("exam.turnstile"));
      return;
    }
    createAttempt(name);
    void navigate({ to: "/exam/session" });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${t("exam.title")} — ${t("brand.mark")}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {t("courses.courseTitle")}
      </p>
      <h1 className="mt-3 font-serif text-5xl">{t("exam.title")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("exam.lede")}</p>
      {existing?.status === "active" ? (
        <p className="mt-6 rounded-2xl border border-border bg-accent px-4 py-3 text-sm">
          {t("exam.inProgress")}{" "}
          <Link to="/exam/session" className="text-primary underline">
            {t("exam.continue")}
          </Link>
        </p>
      ) : null}
      {existing?.status === "submitted" && existing.result?.passed ? (
        <p className="mt-6 text-sm">
          {t("exam.passedLink")}{" "}
          <Link to="/exam/result" className="text-primary underline">
            {t("exam.reviewLink")}
          </Link>
        </p>
      ) : null}
      <h2 className="mt-10 font-serif text-2xl">{t("exam.rulesTitle")}</h2>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-muted-foreground">
        <li>{t("exam.rule1")}</li>
        <li>{t("exam.rule2")}</li>
        <li>{t("exam.rule3")}</li>
        <li>{t("exam.rule4")}</li>
        <li>{t("exam.rule5")}</li>
      </ul>
      <label className="mt-8 block text-sm font-medium" htmlFor="candidate-name">
        {t("exam.name")}
      </label>
      <input
        id="candidate-name"
        data-testid="candidate-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3"
        autoComplete="name"
      />
      <p className="mt-2 text-sm text-muted-foreground">{t("exam.nameHint")}</p>
      <p className="mt-6 text-sm text-muted-foreground">{t("exam.turnstileNote")}</p>
      {siteKey ? <TurnstileWidget siteKey={siteKey} onToken={setToken} /> : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <button
        type="button"
        data-testid="start-exam"
        onClick={start}
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground"
      >
        {t("exam.start")}
      </button>
    </main>
  );
}
