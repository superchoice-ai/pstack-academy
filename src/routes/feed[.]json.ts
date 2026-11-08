import { createFileRoute } from "@tanstack/react-router";

import { buildJsonFeed } from "@/lib/feed";

export const Route = createFileRoute("/feed.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(buildJsonFeed(origin), {
          headers: { "content-type": "application/feed+json; charset=utf-8" },
        });
      },
    },
  },
});
