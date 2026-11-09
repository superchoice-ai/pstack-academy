import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { LanguageProvider, useI18n } from "../lib/i18n";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { DEFAULT_OG_IMAGE } from "../lib/site";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-serif text-5xl">{t("notFound.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("notFound.body")}</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {t("notFound.home")}
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-serif text-4xl">{t("error.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("error.body")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("error.retry")}
        </button>
        <a href="/" className="rounded-full border border-border px-4 py-2 text-sm">
          {t("notFound.home")}
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SuperChoice AI" },
      {
        name: "description",
        content: "A community academy for pstack fundamentals, essays, and a public certificate.",
      },
      { name: "author", content: "SuperChoice AI" },
      { property: "og:title", content: "SuperChoice AI" },
      {
        property: "og:description",
        content: "Essays, a free pstack course, and a community certificate.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      {
        rel: "alternate",
        type: "application/feed+json",
        title: "SuperChoice AI",
        href: "/feed.json",
      },
      { rel: "alternate", type: "application/rss+xml", title: "SuperChoice AI", href: "/rss.xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <Document>{children}</Document>
    </LanguageProvider>
  );
}

function Document({ children }: { children: ReactNode }) {
  const { lang, dir } = useI18n();
  return (
    <html lang={lang} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}
