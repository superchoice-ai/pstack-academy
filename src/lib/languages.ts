export const LANGUAGES = [
  { id: "th", native: "ไทย", html: "th" },
  { id: "en", native: "English", html: "en" },
  { id: "zh", native: "中文", html: "zh-CN" },
  { id: "es", native: "Español", html: "es" },
  { id: "hi", native: "हिन्दी", html: "hi" },
  { id: "ar", native: "العربية", html: "ar" },
  { id: "fr", native: "Français", html: "fr" },
  { id: "pt", native: "Português", html: "pt" },
  { id: "ru", native: "Русский", html: "ru" },
  { id: "ja", native: "日本語", html: "ja" },
] as const;

export type Language = (typeof LANGUAGES)[number]["id"];

const LANGUAGE_IDS = new Set<string>(LANGUAGES.map((language) => language.id));

export function isLanguage(value: string | null | undefined): value is Language {
  return typeof value === "string" && LANGUAGE_IDS.has(value);
}

export function htmlLang(language: Language): string {
  return LANGUAGES.find((item) => item.id === language)?.html ?? "en";
}

export function textDirection(language: Language): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

/** Thai browsers get Thai. Any other supported browser language is used as-is. */
export function matchLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const base = tag.toLowerCase().split("-")[0];
    if (base && isLanguage(base)) return base;
  }
  return "en";
}
