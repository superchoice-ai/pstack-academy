import { createFileRoute } from "@tanstack/react-router";

import { decodePayload } from "@/lib/certificate";
import { formatDate } from "@/lib/format";
import { PageTitle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/verify/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    d: typeof search["d"] === "string" ? search["d"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify a certificate — SuperChoice AI" },
      {
        name: "description",
        content: "Decode a community certificate link. Server-side verification is not live yet.",
      },
      { property: "og:title", content: "Verify a certificate — SuperChoice AI" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { id } = Route.useParams();
  const { d } = Route.useSearch();
  const { t, lang } = useI18n();
  const payload = d ? decodePayload(d) : null;
  const mismatch = payload !== null && payload.id !== id;
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageTitle title={`${t("verify.title")} — ${t("brand.mark")}`} />
      <h1 className="font-serif text-5xl">{t("verify.title")}</h1>
      <p
        className="mt-4 rounded-2xl border border-border bg-accent px-4 py-3 text-sm"
        data-testid="verify-notice"
      >
        {t("verify.coming")}
      </p>
      {!payload ? <p className="mt-8 text-lg">{t("verify.invalid")}</p> : null}
      {payload && mismatch ? <p className="mt-8 text-lg">{t("verify.mismatch")}</p> : null}
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
    </main>
  );
}
