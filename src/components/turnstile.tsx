import { useEffect, useRef } from "react";

/**
 * TODO(server): Send the Turnstile token to a Cloudflare Worker and verify it
 * with the siteverify API before the exam attempt is accepted. The token in
 * the browser is not proof until that check exists. See the README roadmap.
 */
type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function turnstileSiteKey(): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env["VITE_TURNSTILE_SITE_KEY"];
  return typeof value === "string" ? value.trim() : "";
}

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    const scriptId = "cf-turnstile";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    let widgetId = "";
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled || !host.current || !window.turnstile) return;
      window.clearInterval(timer);
      widgetId = window.turnstile.render(host.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={host} data-testid="turnstile" />;
}
