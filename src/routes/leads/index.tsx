import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { LeadsBoard } from "@/components/leads/board";
import { LeadsLogin } from "@/components/leads/login";
import { clearLeadsToken, readLeadsToken, writeLeadsToken } from "@/lib/leads-api";

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [{ title: "ไปป์ไลน์ลูกค้า — SuperChoice" }, { name: "robots", content: "noindex" }],
  }),
  component: LeadsPage,
});

function LeadsPage() {
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      {!ready ? null : token ? (
        <LeadsBoard token={token} onLogout={logout} />
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
