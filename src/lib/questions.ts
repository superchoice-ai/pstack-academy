import { enQuestions } from "@/content/questions/en";
import { thQuestions } from "@/content/questions/th";
import type { Language } from "@/lib/languages";

export type ChoiceIndex = 0 | 1 | 2 | 3;

export type Question = {
  id: string;
  prompt: string;
  choices: readonly [string, string, string, string];
  answer: ChoiceIndex;
  explanation: string;
};

const banks: Partial<Record<Language, readonly Question[]>> = {
  en: enQuestions,
  th: thQuestions,
};

export function questionsFor(language: Language): {
  questions: readonly Question[];
  fellBack: boolean;
} {
  const exact = banks[language];
  if (exact) return { questions: exact, fellBack: false };
  return { questions: enQuestions, fellBack: language !== "en" };
}

export function questionById(
  language: Language,
  id: string,
): { question: Question; fellBack: boolean } | null {
  const localized = questionsFor(language);
  const found = localized.questions.find((question) => question.id === id);
  if (found) return { question: found, fellBack: localized.fellBack };
  const english = enQuestions.find((question) => question.id === id);
  if (!english) return null;
  return { question: english, fellBack: language !== "en" };
}
