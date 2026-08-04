import { describe, it, expect } from "vitest";
import { contextualFileName, parseChatMarkdown } from "./markdown";

describe("parseChatMarkdown", () => {
  it("parses bold and code", () => {
    const parts = parseChatMarkdown("שלום **עולם** וגם `code`");
    expect(parts.some((p) => p.type === "bold" && p.text === "עולם")).toBe(true);
    expect(parts.some((p) => p.type === "code" && p.text === "code")).toBe(true);
  });

  it("parses fenced code block", () => {
    const parts = parseChatMarkdown("לפני\n```he\nשורה\n```\nאחרי");
    const block = parts.find((p) => p.type === "codeblock");
    expect(block && block.type === "codeblock" && block.text.includes("שורה")).toBe(true);
  });

  it("parses lists", () => {
    const parts = parseChatMarkdown("- אחד\n- שניים");
    expect(parts.some((p) => p.type === "ul" && p.items.length === 2)).toBe(true);
  });
});

describe("contextualFileName", () => {
  it("builds hebrew audio name from text", () => {
    const n = contextualFileName("שלום רבנים יקרים לשיעור", "audio", "x.mp3");
    expect(n.startsWith("קריינות_")).toBe(true);
    expect(n.endsWith(".mp3")).toBe(true);
  });
});
