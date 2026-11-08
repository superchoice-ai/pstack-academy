import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { messages as ar } from "@/lib/messages/ar";
import { messages as en, type MessageKey } from "@/lib/messages/en";
import { messages as es } from "@/lib/messages/es";
import { messages as fr } from "@/lib/messages/fr";
import { messages as hi } from "@/lib/messages/hi";
import { messages as ja } from "@/lib/messages/ja";
import { messages as pt } from "@/lib/messages/pt";
import { messages as ru } from "@/lib/messages/ru";
import { messages as th } from "@/lib/messages/th";
import { messages as zh } from "@/lib/messages/zh";
import { isLanguage, matchLanguage, textDirection, type Language } from "@/lib/languages";

const STORAGE_KEY = "scai-lang";

function catalog(language: Language): Record<MessageKey, string> {
  switch (language) {
    case "th":
      return th;
    case "en":
      return en;
    case "zh":
      return zh;
    case "es":
      return es;
    case "hi":
      return hi;
    case "ar":
      return ar;
    case "fr":
      return fr;
    case "pt":
      return pt;
    case "ru":
      return ru;
    case "ja":
      return ja;
  }
}

type I18nValue = {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (language: Language) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) {
      setLangState(stored);
      return;
    }
    const tags = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
    setLangState(matchLanguage(tags));
  }, []);

  const setLang = (language: Language) => {
    setLangState(language);
    localStorage.setItem(STORAGE_KEY, language);
  };

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir: textDirection(lang),
      setLang,
      t: (key) => catalog(lang)[key],
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within LanguageProvider");
  return value;
}

export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
