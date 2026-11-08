import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { readAttempt, writeAttempt, type Attempt } from "@/lib/attempt";
import { grade } from "@/lib/attempt";
import { fill } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { questionById, questionsFor } from "@/lib/questions";

function blockedShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const meta = event.metaKey || event.ctrlKey;
  if (event.key === "PrintScreen") return true;
  if (event.key === "F12") return true;
  if (meta && ["p", "s", "c", "x", "u", "a"].includes(key)) return true;
  if (meta && event.shiftKey && ["i", "j", "c", "k", "3", "4", "5", "s"].includes(key)) return true;
  return false;
}

export function ExamSession() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [blurred, setBlurred] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  const submitted = useRef(false);
  const blurredRef = useRef(false);

  useEffect(() => {
    const current = readAttempt();
    if (!current) {
      void navigate({ to: "/exam" });
      return;
    }
    if (current.status === "submitted") {
      void navigate({ to: "/exam/result" });
      return;
    }
    setAttempt(current);
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    document.body.classList.add("exam-active");
    const block = (event: Event) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (!blockedShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const markBlur = () => {
      if (blurredRef.current) return;
      blurredRef.current = true;
      setBlurred(true);
      setAttempt((current) => {
        if (!current) return current;
        const next = { ...current, blurCount: current.blurCount + 1 };
        writeAttempt(next);
        return next;
      });
    };
    const onFocus = () => {
      if (document.hidden || !document.hasFocus()) return;
      blurredRef.current = false;
      setBlurred(false);
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    const onVisibility = () => {
      if (document.hidden) markBlur();
      else onFocus();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", markBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.body.classList.remove("exam-active");
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", markBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setClock(new Date().toLocaleTimeString());
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready]);

  const finish = useCallback(
    (current: Attempt) => {
      if (submitted.current) return;
      submitted.current = true;
      const result = grade(current);
      const next: Attempt = {
        ...current,
        status: "submitted",
        result: { ...result, submittedAt: Date.now() },
      };
      writeAttempt(next);
      void navigate({ to: "/exam/result" });
    },
    [navigate],
  );

  useEffect(() => {
    if (!attempt || attempt.status !== "active") return;
    if (attempt.endsAt - now <= 0) finish(attempt);
  }, [attempt, finish, now]);

  if (!ready || !attempt) {
    return (
      <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">{t("session.loading")}</p>
    );
  }

  const bank = questionsFor(lang);
  const questionId = attempt.questionIds[index] ?? attempt.questionIds[0] ?? "";
  const resolved = questionById(lang, questionId);
  const order = attempt.optionOrders[questionId] ?? [0, 1, 2, 3];
  const remaining = Math.max(0, attempt.endsAt - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const answered = Object.keys(attempt.answers).length;
  const unanswered = attempt.questionIds.length - answered;
  const watermark = `${attempt.name} · ${attempt.id.slice(0, 8)} · ${clock}`;

  const choose = (choiceIndex: number) => {
    const next: Attempt = {
      ...attempt,
      answers: { ...attempt.answers, [questionId]: choiceIndex },
    };
    writeAttempt(next);
    setAttempt(next);
  };

  return (
    <>
      <p className="exam-print-notice">{t("session.printHidden")}</p>
      <div className={`exam-shield ${blurred ? "blur-md" : ""}`}>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='460' height='200'><text x='16' y='120' fill='#8a4b24' font-size='18' font-family='sans-serif' transform='rotate(-28 200 100)'>${watermark.replaceAll("&", "")}</text></svg>`,
            )}")`,
          }}
        />
        <div className="mx-auto max-w-3xl px-6 py-10">
          {bank.fellBack ? (
            <p className="mb-6 rounded-2xl border border-border bg-accent px-4 py-3 text-sm">
              {t("session.fallback")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {fill(t("session.progress"), {
                  current: index + 1,
                  total: attempt.questionIds.length,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {fill(t("session.answered"), { count: answered })}
              </p>
            </div>
            <p
              className={`font-mono text-2xl ${remaining < 5 * 60 * 1000 ? "text-destructive" : ""}`}
              aria-live="polite"
            >
              <span className="me-2 text-xs uppercase tracking-widest text-muted-foreground">
                {t("session.time")}
              </span>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {attempt.questionIds.map((id, position) => (
              <button
                key={id}
                type="button"
                onClick={() => setIndex(position)}
                className={`size-8 rounded-full text-xs ${
                  position === index
                    ? "bg-primary text-primary-foreground"
                    : attempt.answers[id] === undefined
                      ? "border border-border"
                      : "bg-accent"
                }`}
              >
                {position + 1}
              </button>
            ))}
          </div>
          {resolved ? (
            <fieldset className="mt-8" data-testid="exam-question">
              <legend className="font-serif text-2xl leading-snug">
                {resolved.question.prompt}
              </legend>
              <div className="mt-6 grid gap-3">
                {order.map((originalIndex, displayIndex) => {
                  const label = resolved.question.choices[originalIndex] ?? "";
                  const selected = attempt.answers[questionId] === displayIndex;
                  return (
                    <label
                      key={`${questionId}-${displayIndex}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
                    >
                      <input
                        type="radio"
                        name={questionId}
                        className="mt-1"
                        checked={selected}
                        data-testid="exam-choice"
                        onChange={() => choose(displayIndex)}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2 text-sm"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              {t("session.prev")}
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2 text-sm"
              onClick={() =>
                setIndex((value) => Math.min(attempt.questionIds.length - 1, value + 1))
              }
              disabled={index >= attempt.questionIds.length - 1}
            >
              {t("session.next")}
            </button>
            <button
              type="button"
              data-testid="submit-exam"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => setConfirming(true)}
            >
              {t("session.submit")}
            </button>
          </div>
          {confirming ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-4">
              <p>{t("session.confirm")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fill(t("session.unansweredCount"), { count: unanswered })}
              </p>
              <button
                type="button"
                data-testid="confirm-submit"
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={() => finish(attempt)}
              >
                {t("session.submit")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {blurred ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-xl">
          <div className="max-w-md rounded-3xl border border-border bg-card p-6 text-center">
            <h2 className="font-serif text-3xl">{t("session.blurTitle")}</h2>
            <p className="mt-3 text-muted-foreground">
              {fill(t("session.blurBody"), { count: attempt.blurCount })}
            </p>
            <button
              type="button"
              className="mt-6 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => {
                if (document.hidden) return;
                blurredRef.current = false;
                setBlurred(false);
              }}
            >
              {t("session.blurReturn")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
