import { Link } from "@tanstack/react-router";

import { fill } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const DONATE = "https://buymeacoffee.com/superchoiceai";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-16 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="font-serif text-xl">{t("brand.mark")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("footer.blurb")}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/blog" className="hover:underline">
            {t("nav.blog")}
          </Link>
          <Link to="/courses" className="hover:underline">
            {t("nav.courses")}
          </Link>
          <Link to="/exam" className="hover:underline">
            {t("nav.exam")}
          </Link>
          <a href="/feed.json" className="hover:underline">
            {t("footer.feed")}
          </a>
          <a href="/rss.xml" className="hover:underline">
            {t("footer.rss")}
          </a>
        </div>
        <div className="text-sm">
          <a
            href={DONATE}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("nav.donate")}
          </a>
          <p className="mt-3 text-muted-foreground">{t("footer.disclaimer")}</p>
          <p className="mt-3 text-muted-foreground">
            {fill(t("footer.rights"), { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
