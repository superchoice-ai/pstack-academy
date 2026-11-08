import { isLanguage, type Language } from "@/lib/languages";

export type Post = {
  slug: string;
  lang: Language;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  author: string;
  opinion: boolean;
  body: string;
};

export type Lesson = {
  courseId: string;
  id: string;
  lang: Language;
  title: string;
  summary: string;
  order: number;
  minutes: number;
  source: string;
  sourceLabel: string;
  body: string;
};

export type ResolvedPost = { post: Post; fellBack: boolean };
export type ResolvedLesson = { lesson: Lesson; fellBack: boolean };

type Frontmatter = Record<string, string>;

const postModules = import.meta.glob("../content/posts/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const lessonModules = import.meta.glob("../content/lessons/*/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function rawModules(modules: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, value] of Object.entries(modules)) {
    if (typeof value !== "string") throw new Error(`Expected raw markdown at ${path}`);
    out[path] = value;
  }
  return out;
}

export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match || match[1] === undefined) return { data: {}, body: source };
  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }
  return { data, body: source.slice(match[0].length).trim() };
}

function required(data: Frontmatter, key: string, file: string): string {
  const value = data[key];
  if (!value) throw new Error(`Missing frontmatter "${key}" in ${file}`);
  return value;
}

function loadPosts(): Post[] {
  return Object.entries(rawModules(postModules)).map(([path, source]) => {
    const match = /\/posts\/([^/]+)\/([a-z]{2})\.md$/.exec(path);
    if (!match || !match[1] || !match[2] || !isLanguage(match[2])) {
      throw new Error(`Unrecognized post path ${path}`);
    }
    const { data, body } = parseFrontmatter(source);
    const date = required(data, "date", path);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date in ${path}`);
    return {
      slug: match[1],
      lang: match[2],
      title: required(data, "title", path),
      date,
      summary: required(data, "summary", path),
      tags: required(data, "tags", path)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      author: required(data, "author", path),
      opinion: data["opinion"] === "true",
      body,
    };
  });
}

function loadLessons(): Lesson[] {
  return Object.entries(rawModules(lessonModules)).map(([path, source]) => {
    const match = /\/lessons\/([^/]+)\/([^/]+)\/([a-z]{2})\.md$/.exec(path);
    if (!match || !match[1] || !match[2] || !match[3] || !isLanguage(match[3])) {
      throw new Error(`Unrecognized lesson path ${path}`);
    }
    const { data, body } = parseFrontmatter(source);
    return {
      courseId: match[1],
      id: match[2],
      lang: match[3],
      title: required(data, "title", path),
      summary: required(data, "summary", path),
      order: Number(required(data, "order", path)),
      minutes: Number(required(data, "minutes", path)),
      source: required(data, "source", path),
      sourceLabel: required(data, "sourceLabel", path),
      body,
    };
  });
}

export const posts: readonly Post[] = loadPosts();
export const lessons: readonly Lesson[] = loadLessons();

export function listPosts(language: Language): ResolvedPost[] {
  const slugs = [...new Set(posts.map((post) => post.slug))];
  return slugs
    .map((slug) => resolvePost(slug, language))
    .filter((item): item is ResolvedPost => item !== null)
    .sort((a, b) => (a.post.date < b.post.date ? 1 : -1));
}

export function resolvePost(slug: string, language: Language): ResolvedPost | null {
  const exact = posts.find((post) => post.slug === slug && post.lang === language);
  if (exact) return { post: exact, fellBack: false };
  const english = posts.find((post) => post.slug === slug && post.lang === "en");
  if (!english) return null;
  return { post: english, fellBack: language !== "en" };
}

export function listTags(): string[] {
  return [
    ...new Set(posts.filter((post) => post.lang === "en").flatMap((post) => post.tags)),
  ].sort();
}

export function courseIds(): string[] {
  return [...new Set(lessons.map((lesson) => lesson.courseId))];
}

export function listLessons(courseId: string, language: Language): ResolvedLesson[] {
  const ids = [
    ...new Set(lessons.filter((lesson) => lesson.courseId === courseId).map((lesson) => lesson.id)),
  ];
  return ids
    .map((id) => resolveLesson(courseId, id, language))
    .filter((item): item is ResolvedLesson => item !== null)
    .sort((a, b) => a.lesson.order - b.lesson.order);
}

export function resolveLesson(
  courseId: string,
  lessonId: string,
  language: Language,
): ResolvedLesson | null {
  const exact = lessons.find(
    (lesson) => lesson.courseId === courseId && lesson.id === lessonId && lesson.lang === language,
  );
  if (exact) return { lesson: exact, fellBack: false };
  const english = lessons.find(
    (lesson) => lesson.courseId === courseId && lesson.id === lessonId && lesson.lang === "en",
  );
  if (!english) return null;
  return { lesson: english, fellBack: language !== "en" };
}
