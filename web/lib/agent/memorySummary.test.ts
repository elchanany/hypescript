import { describe, expect, it, vi } from "vitest";
import type { Conversation } from "./chatStore";
import {
  buildMemorySummaryCache, cleanMemorySummaryText, memorySourceFingerprint, memorySummaryNeedsRefresh,
  memorySummaryPrompt, pickMemorySourceConversations, refreshMemorySummary, summarySourceFromConversation,
} from "./memorySummary";

function conv(id: string, updatedAt: number, userText: string | null, title = `שיחה ${id}`): Conversation {
  return {
    id, title, createdAt: updatedAt, updatedAt, history: [],
    items: userText == null ? [] : [{ kind: "user", text: userText, time: "10:00" }],
  };
}

describe("pickMemorySourceConversations", () => {
  it("takes the 5 most recent conversations that actually have a user message", () => {
    const conversations = [
      conv("a", 10, "אחת"), conv("b", 20, "שתיים"), conv("c", 30, "שלוש"),
      conv("d", 40, "ארבע"), conv("e", 50, "חמש"), conv("f", 60, "שש"),
    ];
    expect(pickMemorySourceConversations(conversations, "none").map((c) => c.id))
      .toEqual(["f", "e", "d", "c", "b"]);
  });

  it("excludes the active conversation — the agent already has it in context", () => {
    const conversations = [conv("a", 10, "אחת"), conv("b", 20, "שתיים")];
    expect(pickMemorySourceConversations(conversations, "b").map((c) => c.id)).toEqual(["a"]);
  });

  it("skips empty conversations (opened and never used)", () => {
    const conversations = [conv("a", 10, "אחת"), conv("empty", 99, null)];
    expect(pickMemorySourceConversations(conversations, "x").map((c) => c.id)).toEqual(["a"]);
  });
});

describe("memorySummaryNeedsRefresh — the caching requirement", () => {
  const sources = [conv("a", 10, "אחת"), conv("b", 20, "שתיים")];

  it("needs a refresh when there is no cache at all", () => {
    expect(memorySummaryNeedsRefresh(undefined, sources)).toBe(true);
  });

  it("does NOT re-summarize when the same conversations are unchanged", () => {
    const cache = buildMemorySummaryCache("סיכום", sources);
    expect(memorySummaryNeedsRefresh(cache, sources)).toBe(false);
  });

  it("re-summarizes once a source conversation actually changed", () => {
    const cache = buildMemorySummaryCache("סיכום", sources);
    const changed = [conv("a", 10, "אחת"), conv("b", 21, "שתיים")];
    expect(memorySummaryNeedsRefresh(cache, changed)).toBe(true);
  });

  it("re-summarizes when a new conversation joins the window", () => {
    const cache = buildMemorySummaryCache("סיכום", sources);
    expect(memorySummaryNeedsRefresh(cache, [...sources, conv("c", 30, "שלוש")])).toBe(true);
  });

  it("does nothing at all when there are no previous conversations", () => {
    expect(memorySummaryNeedsRefresh(undefined, [])).toBe(false);
  });

  it("fingerprints content, not object identity", () => {
    expect(memorySourceFingerprint(sources)).toBe(memorySourceFingerprint([conv("a", 10, "אחת"), conv("b", 20, "שתיים")]));
  });
});

describe("refreshMemorySummary", () => {
  const sources = [conv("a", 10, "רציתי לחתוך שקטים"), conv("b", 20, "והוספתי כתוביות")];

  it("calls the LLM exactly once and not again while the cache is valid", async () => {
    const request = vi.fn(async () => "המשתמש חתך שקטים והוסיף כתוביות.");
    const cache = await refreshMemorySummary({ conversations: sources, activeId: "new", request });
    expect(request).toHaveBeenCalledTimes(1);
    expect(cache!.text).toBe("המשתמש חתך שקטים והוסיף כתוביות.");

    // A second new chat, with nothing changed -> reuse, no second call.
    const again = await refreshMemorySummary({ conversations: sources, activeId: "new2", cache, request });
    expect(request).toHaveBeenCalledTimes(1);
    expect(again).toBeNull();
  });

  it("never calls the LLM when there is nothing to remember", async () => {
    const request = vi.fn(async () => "לא אמור להיקרא");
    expect(await refreshMemorySummary({ conversations: [], activeId: "new", request })).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("returns null (and keeps no cache) when the LLM returns nothing", async () => {
    const request = vi.fn(async () => "   ");
    expect(await refreshMemorySummary({ conversations: sources, activeId: "new", request })).toBeNull();
  });
});

describe("memorySummaryPrompt / cleanMemorySummaryText", () => {
  it("returns null when every source is blank, so no request is made", () => {
    expect(memorySummaryPrompt([{ title: "שיחה", text: "  " }])).toBeNull();
  });

  it("includes each source title and text once", () => {
    const prompt = memorySummaryPrompt([summarySourceFromConversation(conv("a", 10, "חתוך שקטים", "עריכת שיעור"))])!;
    expect(String(prompt[1].content)).toContain("עריכת שיעור");
    expect(String(prompt[1].content)).toContain("חתוך שקטים");
  });

  it("caps the stored summary length", () => {
    expect(cleanMemorySummaryText("א".repeat(2000)).length).toBeLessThanOrEqual(600);
  });
});
