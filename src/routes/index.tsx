import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SuperChoice AI - pstack Academy" },
      { name: "description", content: "Coming soon" },
      { property: "og:title", content: "SuperChoice AI - pstack Academy" },
      { property: "og:description", content: "Coming soon" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <h1 className="text-3xl font-semibold">SuperChoice AI - pstack Academy</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </main>
  );
}
