import { describe, expect, it } from "vitest";
import { parseSuggestions, suggestionPrompt } from "./suggestions";

describe("chat follow-up suggestions", () => {
  it("builds a bounded prompt only after a two-sided conversation", () => {
    expect(suggestionPrompt([{ role: "user", content: "חתוך את הסרטון" }])).toBeNull();
    const prompt = suggestionPrompt([
      { role: "user", content: "חתוך את הסרטון" },
      { role: "assistant", content: "סיימתי לחתוך" },
    ]);
    expect(prompt).toHaveLength(2);
    expect(String(prompt?.[1].content)).toContain("סיימתי לחתוך");
  });

  it("grounds suggestions in the creative goal and real capabilities", () => {
    const prompt = suggestionPrompt([
      { role: "user", content: "אני מכין מודעה לדירת שותפים בפייסבוק" },
      { role: "assistant", content: "סידרתי את הקטעים" },
    ], {
      projectSummary: "וידאו אנכי באורך 35 שניות",
      availableCapabilities: ["כתוביות", "מוזיקת רקע", "כותרות"],
    });
    const request = String(prompt?.[1].content);
    expect(request).toContain("דירת שותפים בפייסבוק");
    expect(request).toContain("וידאו אנכי באורך 35 שניות");
    expect(request).toContain("מוזיקת רקע");
    expect(String(prompt?.[0].content)).toContain("יכולת רלוונטית");
  });

  it("parses strict or fenced JSON and removes duplicates", () => {
    expect(parseSuggestions('```json\n{"suggestions":["צור כתוביות","צור כתוביות","ייצא סרטון"]}\n```'))
      .toEqual(["צור כתוביות", "ייצא סרטון"]);
  });

  it("keeps suggestion chips compact", () => {
    expect(parseSuggestions(JSON.stringify({ suggestions: ["א".repeat(140)] }))[0]).toHaveLength(84);
  });
});
