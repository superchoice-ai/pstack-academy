import { Link, useRouterState } from "@tanstack/react-router";

import { LANGUAGES } from "@/lib/languages";
import { useI18n } from "@/lib/i18n";

const DONATE = "https://buymeacoffee.com/superchoiceai";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const item = (to: "/" | "/blog" | "/courses" | "/exam", label: string) => {
    const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
    return (
      <Link
        to={to}
        onClick={onNavigate}
        className={`rounded-full px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
      >
        {label}
      </Link>
    );
  };
  return (
    <>
      {item("/blog", t("nav.blog"))}
      {item("/courses", t("nav.courses"))}
      {item("/exam", t("nav.exam"))}
      <a
        href={DONATE}
        target="_blank"
        rel="noreferrer"
        className="rounded-full px-3 py-2 text-sm hover:bg-accent"
      >
        {t("nav.donate")}
      </a>
    </>
  );
}

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-serif text-lg text-primary-foreground">
            S
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">{t("brand.mark")}</span>
            <span className="block text-xs text-muted-foreground">{t("brand.academy")}</span>
          </span>
        </Link>
        <nav className="ms-auto hidden items-center gap-1 md:flex">
          <NavLinks />
        </nav>
        <label className="ms-auto md:ms-0">
          <span className="sr-only">{t("lang.label")}</span>
          <select
            data-testid="lang-select"
            aria-label={t("lang.label")}
            value={lang}
            onChange={(event) => {
              const next = event.target.value;
              if (LANGUAGES.some((language) => language.id === next)) {
                setLang(next as (typeof LANGUAGES)[number]["id"]);
              }
            }}
            className="h-9 rounded-full border border-border bg-card px-3 text-sm"
          >
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {language.native}
              </option>
            ))}
          </select>
        </label>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-border px-3 py-2 text-sm">
            {t("nav.menu")}
          </summary>
          <div className="absolute end-0 z-50 mt-2 flex w-48 flex-col rounded-2xl border border-border bg-card p-2 shadow-lg">
            <NavLinks />
          </div>
        </details>
      </div>
    </header>
  );
}
