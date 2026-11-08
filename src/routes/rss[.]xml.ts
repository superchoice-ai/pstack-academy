import { createFileRoute } from "@tanstack/react-router";

import { buildRss } from "@/lib/feed";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(buildRss(origin), {
          headers: { "content-type": "application/rss+xml; charset=utf-8" },
        });
      },
    },
  },
});
