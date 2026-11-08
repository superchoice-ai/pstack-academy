import type { Question } from "@/lib/questions";

export const EXAM_SIZE = 20;
export const PASS_RATIO = 0.8;
export const EXAM_DURATION_MS = 30 * 60 * 1000;

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    const other = copy[swap];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swap] = current;
  }
  return copy;
}

export function drawExam(questions: readonly Question[], seed: string, size = EXAM_SIZE) {
  const random = mulberry32(hashString(seed));
  const questionIds = shuffle(
    questions.map((question) => question.id),
    random,
  ).slice(0, size);
  const optionOrders: Record<string, number[]> = {};
  for (const id of questionIds) {
    optionOrders[id] = shuffle([0, 1, 2, 3], random);
  }
  return { questionIds, optionOrders };
}

export function scoreAttempt(
  questions: readonly Question[],
  questionIds: readonly string[],
  optionOrders: Readonly<Record<string, readonly number[]>>,
  answers: Readonly<Record<string, number>>,
): { correct: number; total: number; passed: boolean; percent: number } {
  let correct = 0;
  for (const id of questionIds) {
    const question = questions.find((item) => item.id === id);
    const order = optionOrders[id];
    const selected = answers[id];
    if (!question || !order || selected === undefined) continue;
    if (order[selected] === question.answer) correct += 1;
  }
  const total = questionIds.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, passed: total > 0 && correct / total >= PASS_RATIO, percent };
}
