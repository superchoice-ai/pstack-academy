import { renderMarkdown } from "@/lib/markdown";

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose-academy max-w-2xl"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}
