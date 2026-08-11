import { describe, it, expect } from "vitest";
import { activeConversation, addConversation, migrateChatStore, removeConversation, renameConversation, titleFromItems, upsertActive } from "./chatStore";

describe("migrateChatStore", () => {
  it("migrates v1 {items,history}", () => {
    const s = migrateChatStore({
      items: [{ kind: "user", text: "תמלל את השיעור בבקשה", time: "1:00" }],
      history: [{ role: "user", content: "תמלל את השיעור בבקשה" }],
    });
    expect(s.version).toBe(2);
    expect(s.conversations).toHaveLength(1);
    expect(s.conversations[0].title).toContain("תמלל");
    expect(s.conversations[0].history).toHaveLength(1);
  });

  it("keeps v2 as-is", () => {
    const raw = {
      version: 2,
      activeId: "a",
      conversations: [{ id: "a", title: "X", createdAt: 1, updatedAt: 1, items: [], history: [] }],
    };
    expect(migrateChatStore(raw).activeId).toBe("a");
  });
});

describe("addConversation / upsertActive", () => {
  it("creates a fresh chat and updates title from first user message", () => {
    let s = migrateChatStore(null);
    s = addConversation(s);
    expect(s.conversations.length).toBe(2);
    s = upsertActive(s, { items: [{ kind: "user", text: "הכן כתוביות יפות", time: "2:00" }] });
    const active = s.conversations.find((c) => c.id === s.activeId)!;
    expect(active.title).toContain("הכן כתוביות");
  });
});

describe("titleFromItems", () => {
  it("truncates long titles", () => {
    const t = titleFromItems([{ kind: "user", text: "א".repeat(40), time: "0" }]);
    expect(t.endsWith("…")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(28);
  });
});

describe("conversation management", () => {
  it("renames and removes conversations without leaving an invalid active id", () => {
    const initial = addConversation(migrateChatStore(null));
    const activeId = initial.activeId;
    const renamed = renameConversation(initial, activeId, "  עריכת   פתיח  ");
    expect(activeConversation(renamed).title).toBe("עריכת פתיח");
    const removed = removeConversation(renamed, activeId);
    expect(removed.conversations).toHaveLength(1);
    expect(removed.activeId).toBe(removed.conversations[0].id);
    const lastRemoved = removeConversation(removed, removed.activeId);
    expect(lastRemoved.conversations).toHaveLength(1);
    expect(lastRemoved.activeId).toBe(lastRemoved.conversations[0].id);
  });
});
