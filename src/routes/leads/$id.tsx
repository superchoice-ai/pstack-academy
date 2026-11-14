import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { LeadDetailView } from "@/components/leads/detail";
import { LeadsLogin } from "@/components/leads/login";
import { clearLeadsToken, readLeadsToken, writeLeadsToken } from "@/lib/leads-api";

export const Route = createFileRoute("/leads/$id")({
  head: () => ({
    meta: [{ title: "รายละเอียดลีด — SuperChoice" }, { name: "robots", content: "noindex" }],
  }),
  component: LeadPage,
});

function LeadPage() {
  const { id } = Route.useParams();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setToken(readLeadsToken());
    setReady(true);
  }, []);
  const logout = useCallback((message: string) => {
    clearLeadsToken();
    setToken("");
    setError(message);
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      {!ready ? null : token ? (
        <LeadDetailView token={token} id={id} onLogout={logout} />
      ) : (
        <LeadsLogin
          error={error}
          onSubmit={(next) => {
            writeLeadsToken(next);
            setError("");
            setToken(next);
          }}
        />
      )}
    </main>
  );
}
