import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { readAttempt, writeAttempt, type Attempt } from "@/lib/attempt";
import {
  downloadBlob,
  downloadDataUrl,
  encodePayload,
  makeCertificateId,
  renderCertificate,
  verifyPath,
  type CertPayload,
} from "@/lib/certificate";
import { fill, formatDate, isoDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";
import { registerCertificate } from "@/lib/registry";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Community certificate — SuperChoice AI" },
      {
        name: "description",
        content: "A community certificate from SuperChoice AI. Not an official credential.",
      },
      { property: "og:title", content: "Community certificate — SuperChoice AI" },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { t, lang, dir } = useI18n();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState("");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [certId, setCertId] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [registryStatus, setRegistryStatus] = useState<"" | "registered" | "unreachable">("");
  const posted = useRef("");

  useEffect(() => {
    const current = readAttempt();
    if (!current || current.status !== "submitted" || !current.result?.passed) {
      setAttempt(null);
      return;
    }
    setAttempt(current);
    setName(current.name);
    setCertId(current.certificateId ?? "");
  }, []);

  useEffect(() => {
    if (!attempt?.result || name.trim().length < 2) return;
    const id = certId || makeCertificateId();
    if (!certId) {
      setCertId(id);
      const next = { ...attempt, certificateId: id };
      writeAttempt(next);
      setAttempt(next);
    }
    const payload: CertPayload = {
      id,
      name: name.trim(),
      score: attempt.result.percent,
      correct: attempt.result.correct,
      total: attempt.result.total,
      date: isoDate(attempt.result.submittedAt),
      course: t("cert.course"),
      issuer: "SuperChoice AI",
    };
    const encoded = encodePayload(payload);
    const url = verifyPath(window.location.origin, id, encoded);
    setVerifyUrl(url);
    let cancelled = false;
    void renderCertificate({
      heading: t("cert.heading"),
      issuedBy: t("cert.issuedBy"),
      statement: fill(t("cert.statement"), { name: payload.name }),
      disclaimer: t("cert.disclaimer"),
      scoreLabel: t("cert.scoreLabel"),
      dateLabel: t("cert.dateLabel"),
      idLabel: t("cert.idLabel"),
      verifyLabel: t("cert.verifyLabel"),
      course: payload.course,
      score: `${payload.score}%`,
      date: formatDate(payload.date, lang),
      id,
      name: payload.name,
      verifyUrl: url,
      direction: dir,
    }).then((rendered) => {
      if (cancelled) return;
      setPreview(rendered.png);
      setPdf(rendered.pdf);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, certId, dir, lang, name, t]);

  useEffect(() => {
    if (!attempt?.result || !certId || name.trim().length < 2) return;
    const key = `${certId}:${name.trim()}`;
    if (posted.current === key) return;
    posted.current = key;
    let cancelled = false;
    let finished = false;
    void registerCertificate({
      id: certId,
      name: name.trim(),
      score: attempt.result.percent,
      lang,
      issued_at: new Date(attempt.result.submittedAt).toISOString(),
      attempt_id: attempt.id,
      ...(attempt.turnstileToken ? { turnstileToken: attempt.turnstileToken } : {}),
    }).then((status) => {
      finished = true;
      if (!cancelled) setRegistryStatus(status);
    });
    return () => {
      cancelled = true;
      if (!finished) posted.current = "";
    };
  }, [attempt, certId, lang, name]);

  if (attempt === undefined) return <p className="px-6 py-16">{t("cert.working")}</p>;
  if (!attempt?.result?.passed) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p>{t("cert.needPass")}</p>
        <Link to="/exam" className="mt-4 inline-flex text-primary underline">
          {t("cert.backExam")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <PageTitle title={`${t("cert.title")} — ${t("brand.mark")}`} />
      <h1 className="font-serif text-5xl">{t("cert.title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("cert.lede")}</p>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t("cert.disclaimer")}</p>
      <label className="mt-8 block text-sm font-medium" htmlFor="print-name">
        {t("cert.name")}
      </label>
      <input
        id="print-name"
        data-testid="certificate-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="mt-2 w-full max-w-lg rounded-2xl border border-border bg-card px-4 py-3"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="download-png"
          disabled={!preview}
          onClick={() => downloadDataUrl(preview, `superchoice-${certId}.png`)}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {t("cert.downloadPng")}
        </button>
        <button
          type="button"
          data-testid="download-pdf"
          disabled={!pdf}
          onClick={() => pdf && downloadBlob(pdf, `superchoice-${certId}.pdf`)}
          className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          {t("cert.downloadPdf")}
        </button>
      </div>
      {registryStatus === "registered" ? (
        <p className="mt-4 text-sm text-primary" data-testid="registry-status">
          {t("cert.registered")}
        </p>
      ) : null}
      {registryStatus === "unreachable" ? (
        <p className="mt-4 text-sm text-muted-foreground" data-testid="registry-status">
          {t("cert.registryOffline")}
        </p>
      ) : null}
      {verifyUrl ? (
        <p className="mt-6 text-sm">
          <a data-testid="verify-link" href={verifyUrl} className="text-primary underline">
            {t("cert.verifyLabel")}
          </a>
        </p>
      ) : null}
      {preview ? (
        <img
          src={preview}
          alt={t("cert.heading")}
          data-testid="certificate-preview"
          className="mt-8 w-full rounded-2xl border border-border"
        />
      ) : (
        <p className="mt-8 text-muted-foreground">{t("cert.working")}</p>
      )}
    </main>
  );
}
