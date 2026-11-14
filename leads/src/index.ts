import type { LeadsEnv } from "./db";
import { handleRequest } from "./handler";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const bindings: LeadsEnv = {
        DB: env.DB,
        LEADS_API_TOKEN: env.LEADS_API_TOKEN,
        LEADS_UNSUBSCRIBE_SECRET: env.LEADS_UNSUBSCRIBE_SECRET,
      };
      return await handleRequest(request, bindings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      console.error(JSON.stringify({ event: "unhandled", message }));
      return Response.json({ error: "internal" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
