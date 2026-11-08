import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { decodePayload, type CertPayload } from "@/lib/certificate";
import { formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";
import { lookupCertificate, type RegistryCertificate } from "@/lib/registry";

export const Route = createFileRoute("/verify/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    d: typeof search["d"] === "string" ? search["d"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify a certificate — SuperChoice AI" },
      {
        name: "description",
        content: "Check a SuperChoice AI community certificate against the public registry.",
      },
      { property: "og:title", content: "Verify a certificate — SuperChoice AI" },
    ],
  }),
  component: VerifyPage,
});

type RegistryState =
  | { kind: "loading" }
  | { kind: "verified"; certificate: RegistryCertificate }
  | { kind: "not_found" }
  | { kind: "unreachable" };

function VerifyPage() {
  const { id } = Route.useParams();
  const { d } = Route.useSearch();
  const { t, lang } = useI18n();
  const payload = d ? decodePayload(d) : null;
  const mismatch = payload !== null && payload.id !== id;
  const [registry, setRegistry] = useState<RegistryState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setRegistry({ kind: "loading" });
    void lookupCertificate(id).then((result) => {
      if (cancelled) return;
      if (result.status === "verified")
        setRegistry({ kind: "verified", certificate: result.certificate });
      else if (result.status === "not_found") setRegistry({ kind: "not_found" });
      else setRegistry({ kind: "unreachable" });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${t("verify.title")} — ${t("brand.mark")}`} />
      <h1 className="font-serif text-5xl">{t("verify.title")}</h1>
      {registry.kind === "loading" ? (
        <p className="mt-4 text-muted-foreground" data-testid="verify-status">
          {t("verify.checking")}
        </p>
      ) : null}
      {registry.kind === "verified" ? (
        <RegistryCard
          certificate={registry.certificate}
          heading={t("verify.verified")}
          holder={t("verify.holder")}
          course={t("verify.course")}
          courseName={t("cert.course")}
          score={t("verify.score")}
          date={t("verify.date")}
          idLabel={t("verify.id")}
          issuer={t("verify.issuer")}
          disclaimer={t("verify.disclaimer")}
          lang={lang}
        />
      ) : null}
      {registry.kind === "not_found" ? (
        <p className="mt-8 text-lg" data-testid="verify-status">
          {t("verify.notFound")}
        </p>
      ) : null}
      {registry.kind === "not_found" && payload ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("verify.registryMiss")}</p>
      ) : null}
      {registry.kind === "unreachable" ? (
        <PayloadFallback payload={payload} mismatch={mismatch} />
      ) : null}
    </main>
  );
}

function PayloadFallback({
  payload,
  mismatch,
}: {
  payload: CertPayload | null;
  mismatch: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <>
      <p
        className="mt-4 rounded-2xl border border-border bg-accent px-4 py-3 text-sm"
        data-testid="verify-notice"
      >
        {t("verify.coming")}
      </p>
      {!payload && !mismatch ? <p className="mt-8 text-lg">{t("verify.invalid")}</p> : null}
      {mismatch ? <p className="mt-8 text-lg">{t("verify.mismatch")}</p> : null}
      {payload && !mismatch ? (
        <dl
          className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6"
          data-testid="verify-record"
        >
          <p className="text-sm text-primary">{t("verify.ok")}</p>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.holder")}
            </dt>
            <dd className="mt-1 font-serif text-3xl">{payload.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.course")}
            </dt>
            <dd className="mt-1">{payload.course}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.score")}
            </dt>
            <dd className="mt-1">
              {payload.score}% ({payload.correct}/{payload.total})
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.date")}
            </dt>
            <dd className="mt-1">{formatDate(payload.date, lang)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.id")}
            </dt>
            <dd className="mt-1 font-mono">{payload.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("verify.issuer")}
            </dt>
            <dd className="mt-1">{payload.issuer}</dd>
          </div>
          <p className="text-sm text-muted-foreground">{t("verify.disclaimer")}</p>
        </dl>
      ) : null}
    </>
  );
}

function RegistryCard({
  certificate,
  heading,
  holder,
  course,
  courseName,
  score,
  date,
  idLabel,
  issuer,
  disclaimer,
  lang,
}: {
  certificate: RegistryCertificate;
  heading: string;
  holder: string;
  course: string;
  courseName: string;
  score: string;
  date: string;
  idLabel: string;
  issuer: string;
  disclaimer: string;
  lang: Parameters<typeof formatDate>[1];
}) {
  const issued = certificate.issued_at.slice(0, 10);
  return (
    <dl
      className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6"
      data-testid="verify-record"
    >
      <p className="text-sm text-primary" data-testid="verify-status">
        {heading}
      </p>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{holder}</dt>
        <dd className="mt-1 font-serif text-3xl">{certificate.name}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{course}</dt>
        <dd className="mt-1">{courseName}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{score}</dt>
        <dd className="mt-1">{certificate.score}%</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{date}</dt>
        <dd className="mt-1">{formatDate(issued, lang)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{idLabel}</dt>
        <dd className="mt-1 font-mono">{certificate.id}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{issuer}</dt>
        <dd className="mt-1">SuperChoice AI</dd>
      </div>
      <p className="text-sm text-muted-foreground">{disclaimer}</p>
    </dl>
  );
}
