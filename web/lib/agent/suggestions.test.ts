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

  it("parses strict or fenced JSON and removes duplicates", () => {
    expect(parseSuggestions('```json\n{"suggestions":["צור כתוביות","צור כתוביות","ייצא סרטון"]}\n```'))
      .toEqual(["צור כתוביות", "ייצא סרטון"]);
  });
});
