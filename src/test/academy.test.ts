import { describe, expect, it } from "vitest";

import { listLessons, listPosts, resolvePost } from "@/lib/content";
import { drawExam, scoreAttempt } from "@/lib/exam";
import { decodePayload, encodePayload, jpegToPdf, type CertPayload } from "@/lib/certificate";
import { buildJsonFeed, buildRss } from "@/lib/feed";
import { matchLanguage } from "@/lib/languages";
import { renderMarkdown } from "@/lib/markdown";
import { messages as en } from "@/lib/messages/en";
import { messages as ar } from "@/lib/messages/ar";
import { messages as es } from "@/lib/messages/es";
import { messages as fr } from "@/lib/messages/fr";
import { messages as hi } from "@/lib/messages/hi";
import { messages as ja } from "@/lib/messages/ja";
import { messages as pt } from "@/lib/messages/pt";
import { messages as ru } from "@/lib/messages/ru";
import { messages as th } from "@/lib/messages/th";
import { messages as zh } from "@/lib/messages/zh";
import { enQuestions } from "@/content/questions/en";
import { thQuestions } from "@/content/questions/th";

describe("language", () => {
  it("defaults Thai browsers to Thai and keeps other supported languages", () => {
    expect(matchLanguage(["th-TH", "en"])).toBe("th");
    expect(matchLanguage(["ar-EG"])).toBe("ar");
    expect(matchLanguage(["de-DE", "en-US"])).toBe("en");
  });

  it("translates every interface string", () => {
    const keys = Object.keys(en);
    for (const catalog of [th, zh, es, hi, ar, fr, pt, ru, ja]) {
      expect(Object.keys(catalog).sort()).toEqual(keys.sort());
      for (const key of keys) {
        expect(catalog[key as keyof typeof en]?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("content", () => {
  it("ships two posts in Thai and English, with the opinion piece newest", () => {
    const english = listPosts("en");
    expect(english.map((item) => item.post.slug)).toEqual([
      "humans-at-the-gate",
      "why-a-tesla-could-fly",
    ]);
    expect(english[0]?.post.opinion).toBe(true);
    expect(english[1]?.post.opinion).toBe(false);
    expect(resolvePost("why-a-tesla-could-fly", "th")?.fellBack).toBe(false);
    expect(resolvePost("why-a-tesla-could-fly", "ja")?.fellBack).toBe(true);
    const body = english[1]?.post.body.toLowerCase() ?? "";
    expect(body).toContain("did not work at tesla");
    expect(body).not.toContain("worked at tesla");
  });

  it("ships two lessons that link the original essays", () => {
    const lessons = listLessons("pstack-fundamentals", "en");
    expect(lessons.map((item) => item.lesson.id)).toEqual(["01-verification", "02-supervising"]);
    expect(lessons[0]?.lesson.source).toBe("https://x.com/poteto/status/2094457600259842065");
    expect(lessons[1]?.lesson.source).toBe("https://x.com/poteto/status/2097732320606507506");
    expect(listLessons("pstack-fundamentals", "fr")[0]?.fellBack).toBe(true);
  });

  it("escapes raw html in markdown", () => {
    const html = renderMarkdown("Hello <script>alert(1)</script> [site](https://example.com)");
    expect(html).not.toContain("<script>");
    expect(html).toContain("https://example.com");
  });
});

describe("exam", () => {
  it("keeps a bank of at least 30 aligned questions", () => {
    expect(enQuestions.length).toBeGreaterThanOrEqual(30);
    expect(thQuestions.map((question) => question.id)).toEqual(
      enQuestions.map((question) => question.id),
    );
    for (const question of enQuestions) {
      expect(question.choices).toHaveLength(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(4);
      const thai = thQuestions.find((item) => item.id === question.id);
      expect(thai?.answer).toBe(question.answer);
      expect(thai?.choices).toHaveLength(4);
    }
  });

  it("draws 20 questions and shuffles options", () => {
    const drawn = drawExam(enQuestions, "attempt-seed");
    expect(new Set(drawn.questionIds).size).toBe(20);
    for (const id of drawn.questionIds) {
      const order = drawn.optionOrders[id] ?? [];
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
    expect(drawExam(enQuestions, "attempt-seed").questionIds).toEqual(drawn.questionIds);
  });

  it("passes at 80 percent and fails below it", () => {
    const ids = enQuestions.slice(0, 20).map((question) => question.id);
    const orders = Object.fromEntries(ids.map((id) => [id, [0, 1, 2, 3]]));
    const perfect = Object.fromEntries(
      enQuestions.slice(0, 20).map((question) => [question.id, question.answer]),
    );
    const sixteen = { ...perfect };
    const misses = ids.slice(0, 4);
    for (const id of misses) {
      const question = enQuestions.find((item) => item.id === id);
      sixteen[id] = question && question.answer === 0 ? 1 : 0;
    }
    const fifteen = { ...sixteen, [ids[4] ?? ""]: 0 };
    const fourth = enQuestions.find((item) => item.id === ids[4]);
    if (fourth && fifteen[fourth.id] === fourth.answer)
      fifteen[fourth.id] = fourth.answer === 3 ? 0 : 3;
    expect(scoreAttempt(enQuestions, ids, orders, sixteen).passed).toBe(true);
    expect(scoreAttempt(enQuestions, ids, orders, fifteen).passed).toBe(false);
  });
});

describe("certificate", () => {
  it("round-trips a unicode payload and wraps a jpeg as a pdf", () => {
    const payload: CertPayload = {
      id: "SC-TEST1234",
      name: "ศิริพร สุข",
      score: 90,
      correct: 18,
      total: 20,
      date: "2026-11-08",
      course: "pstack Fundamentals",
      issuer: "SuperChoice AI",
    };
    expect(decodePayload(encodePayload(payload))).toEqual(payload);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = jpegToPdf(jpeg, 1600, 1000);
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(pdf.includes(0xff)).toBe(true);
  });
});

describe("feeds", () => {
  it("publishes both languages", () => {
    const json = JSON.parse(buildJsonFeed("https://example.com")) as {
      items: { language: string }[];
    };
    expect(json.items.some((item) => item.language === "en")).toBe(true);
    expect(json.items.some((item) => item.language === "th")).toBe(true);
    expect(buildRss("https://example.com")).toContain("<rss");
  });
});
