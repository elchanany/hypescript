import { describe, expect, it, vi } from "vitest";
import { cleanGeneratedTitle, requestConversationTitle, shouldGenerateTitle, titlePrompt } from "./title";
import { addConversation, applyGeneratedTitle, emptyStore, markTitleGenerated, renameConversation, upsertActive } from "./chatStore";

describe("shouldGenerateTitle", () => {
  it("fires exactly once — on the first user message of a conversation", () => {
    expect(shouldGenerateTitle(false, 0)).toBe(true);
    expect(shouldGenerateTitle(false, 1)).toBe(false);
    expect(shouldGenerateTitle(false, 7)).toBe(false);
  });

  it("never fires again once a title exists (auto or manual)", () => {
    expect(shouldGenerateTitle(true, 0)).toBe(false);
    expect(shouldGenerateTitle(true, 3)).toBe(false);
  });
});

describe("titlePrompt", () => {
  it("returns null for an empty message so no request is made at all", () => {
    expect(titlePrompt("")).toBeNull();
    expect(titlePrompt("   ")).toBeNull();
  });

  it("caps the input it sends, so a pasted transcript cannot become a huge prompt", () => {
    const prompt = titlePrompt("א".repeat(5000))!;
    expect(prompt).toHaveLength(2);
    expect(String(prompt[1].content).length).toBeLessThanOrEqual(500);
  });
});

describe("cleanGeneratedTitle", () => {
  it("strips quotes, code fences, trailing dots and collapses whitespace", () => {
    expect(cleanGeneratedTitle('"חיתוך פתיח ארוך"')).toBe("חיתוך פתיח ארוך");
    expect(cleanGeneratedTitle("```\nהוספת כתוביות\n```")).toBe("הוספת כתוביות");
    expect(cleanGeneratedTitle("סיכום   שיעור.")).toBe("סיכום שיעור");
  });

  it("truncates an over-long title instead of letting it break the sidebar", () => {
    const out = cleanGeneratedTitle("א".repeat(120));
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns an empty string for junk, so the heuristic title survives", () => {
    expect(cleanGeneratedTitle(null)).toBe("");
    expect(cleanGeneratedTitle("  ")).toBe("");
  });
});

describe("requestConversationTitle", () => {
  it("fails silently on a network error — a title is never worth breaking the chat", async () => {
    const failing = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(requestConversationTitle("תחתוך לי את הפתיח", undefined, failing)).resolves.toBe("");
  });

  it("fails silently on a non-ok response", async () => {
    const notOk = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(requestConversationTitle("שלום", undefined, notOk)).resolves.toBe("");
  });

  it("cleans whatever the server returned", async () => {
    const ok = vi.fn(async () => ({ ok: true, json: async () => ({ title: '  "עריכת שיעור"  ' }) })) as unknown as typeof fetch;
    await expect(requestConversationTitle("שלום", undefined, ok)).resolves.toBe("עריכת שיעור");
  });
});

describe("auto title never overwrites a manual one", () => {
  it("keeps the name the user typed while the LLM call was still in flight", () => {
    let store = addConversation(upsertActive(emptyStore(), { items: [], history: [] }));
    const id = store.activeId;
    // Chat.tsx marks first, then awaits the LLM.
    store = markTitleGenerated(store, id);
    // ...and while it is awaiting, the user renames the conversation.
    store = renameConversation(store, id, "השיעור של רבי חיים");
    // The late auto-title arrives.
    store = applyGeneratedTitle(store, id, "חיתוך וידאו");
    expect(store.conversations.find((c) => c.id === id)!.title).toBe("השיעור של רבי חיים");
  });

  it("applies the auto title when the user did not rename anything", () => {
    let store = addConversation(emptyStore());
    const id = store.activeId;
    store = markTitleGenerated(store, id);
    store = applyGeneratedTitle(store, id, "חיתוך וידאו");
    expect(store.conversations.find((c) => c.id === id)!.title).toBe("חיתוך וידאו");
  });

  it("does not bump the conversation to the top of the list", () => {
    let store = addConversation(emptyStore());
    const id = store.activeId;
    const before = store.conversations.find((c) => c.id === id)!.updatedAt;
    store = applyGeneratedTitle(store, id, "כותרת");
    expect(store.conversations.find((c) => c.id === id)!.updatedAt).toBe(before);
  });
});
