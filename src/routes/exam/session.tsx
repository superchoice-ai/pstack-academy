import { createFileRoute } from "@tanstack/react-router";

import { ExamSession } from "@/components/exam-session";

export const Route = createFileRoute("/exam/session")({
  head: () => ({
    meta: [{ title: "Exam in progress — SuperChoice AI" }, { name: "robots", content: "noindex" }],
  }),
  component: ExamSession,
});
