import { drawExam, EXAM_DURATION_MS, EXAM_SIZE, scoreAttempt } from "@/lib/exam";
import { questionsFor, type Question } from "@/lib/questions";

export type AttemptResult = {
  correct: number;
  total: number;
  passed: boolean;
  percent: number;
  submittedAt: number;
};

export type Attempt = {
  id: string;
  token: string;
  name: string;
  startedAt: number;
  endsAt: number;
  questionIds: string[];
  optionOrders: Record<string, number[]>;
  answers: Record<string, number>;
  blurCount: number;
  status: "active" | "submitted";
  result?: AttemptResult;
  certificateId?: string;
};

const STORAGE_KEY = "scai-exam-attempt";

function isNumberArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === "number")
  );
}

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record["id"] !== "string" || typeof record["token"] !== "string") return false;
  if (record["token"].length < 8) return false;
  if (typeof record["name"] !== "string" || typeof record["startedAt"] !== "number") return false;
  if (typeof record["endsAt"] !== "number" || typeof record["blurCount"] !== "number") return false;
  if (record["status"] !== "active" && record["status"] !== "submitted") return false;
  if (!isNumberArray(record["questionIds"], EXAM_SIZE) && !Array.isArray(record["questionIds"])) {
    return false;
  }
  if (!Array.isArray(record["questionIds"]) || record["questionIds"].length !== EXAM_SIZE)
    return false;
  if (!record["questionIds"].every((id) => typeof id === "string")) return false;
  if (!record["optionOrders"] || typeof record["optionOrders"] !== "object") return false;
  if (!record["answers"] || typeof record["answers"] !== "object") return false;
  return true;
}

export function readAttempt(): Attempt | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAttempt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAttempt(attempt: Attempt): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

export function clearAttempt(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function createAttempt(name: string): Attempt {
  const id = crypto.randomUUID();
  const bank = questionsFor("en").questions;
  const drawn = drawExam(bank, id);
  const now = Date.now();
  const attempt: Attempt = {
    id,
    token: crypto.randomUUID(),
    name: name.trim(),
    startedAt: now,
    endsAt: now + EXAM_DURATION_MS,
    questionIds: drawn.questionIds,
    optionOrders: drawn.optionOrders,
    answers: {},
    blurCount: 0,
    status: "active",
  };
  writeAttempt(attempt);
  return attempt;
}

export function grade(
  attempt: Attempt,
  questions: readonly Question[] = questionsFor("en").questions,
) {
  return scoreAttempt(questions, attempt.questionIds, attempt.optionOrders, attempt.answers);
}
