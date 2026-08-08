// אחסון שיחות מרובות בפרויקט אחד (מיגרציה שקופה מפורמט ישן {items,history}).

import { ChatMessage } from "./types";
import type { EditorSnapshot } from "@/hooks/useEditor";

export type ChatItem =
  | { kind: "user" | "assistant" | "error"; text: string; time: string }
  | { kind: "quote"; seconds: number; text: string; time: string }
  | { kind: "tool"; id: string; label: string; color: string; status: string; state: "running" | "ok" | "error"; summary: string; time: string; name: string; providerLabel?: string; args?: Record<string, any>; startedAt?: number; durationMs?: number; checkpoint?: EditorSnapshot; restored?: boolean }
  | { kind: "output"; name: string; url: string; mkind: "video" | "srt" | "image" | "audio"; time: string };

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  items: ChatItem[];
  history: ChatMessage[];
}

export interface ChatStoreV2 {
  version: 2;
  conversations: Conversation[];
  activeId: string;
}

const newId = () => "c_" + Math.random().toString(36).slice(2, 10);

export function titleFromItems(items: ChatItem[] | undefined): string {
  const u = (items || []).find((it) => it.kind === "user" && "text" in it) as { text?: string } | undefined;
  const t = (u?.text || "").trim().replace(/\s+/g, " ");
  if (!t) return "שיחה חדשה";
  return t.length > 28 ? t.slice(0, 27) + "…" : t;
}

export function emptyConversation(title = "שיחה חדשה"): Conversation {
  const now = Date.now();
  return { id: newId(), title, createdAt: now, updatedAt: now, items: [], history: [] };
}

export function emptyStore(): ChatStoreV2 {
  const c = emptyConversation();
  return { version: 2, conversations: [c], activeId: c.id };
}

/** ממיר שמירה ישנה או פגומה ל-v2. */
export function migrateChatStore(raw: unknown): ChatStoreV2 {
  if (!raw || typeof raw !== "object") return emptyStore();
  const o = raw as any;
  if (o.version === 2 && Array.isArray(o.conversations) && o.conversations.length) {
    const activeId = o.activeId && o.conversations.some((c: Conversation) => c.id === o.activeId)
      ? o.activeId
      : o.conversations[0].id;
    return {
      version: 2,
      activeId,
      conversations: o.conversations.map((c: any) => ({
        id: c.id || newId(),
        title: c.title || titleFromItems(c.items) || "שיחה",
        createdAt: c.createdAt || Date.now(),
        updatedAt: c.updatedAt || Date.now(),
        items: Array.isArray(c.items) ? c.items.filter((it: ChatItem) => it.kind !== "output") : [],
        history: Array.isArray(c.history) ? c.history : [],
      })),
    };
  }
  // v1: { items, history }
  if (Array.isArray(o.items) || Array.isArray(o.history)) {
    const c = emptyConversation(titleFromItems(o.items));
    c.items = Array.isArray(o.items) ? o.items.filter((it: ChatItem) => it.kind !== "output") : [];
    c.history = Array.isArray(o.history) ? o.history : [];
    return { version: 2, conversations: [c], activeId: c.id };
  }
  return emptyStore();
}

export function activeConversation(store: ChatStoreV2): Conversation {
  return store.conversations.find((c) => c.id === store.activeId) || store.conversations[0];
}

const isPlaceholderTitle = (t: string) => !t || t === "שיחה חדשה" || /^שיחה \d+$/.test(t);

export function upsertActive(
  store: ChatStoreV2,
  patch: Partial<Pick<Conversation, "items" | "history" | "title">>,
): ChatStoreV2 {
  const conversations = store.conversations.map((c) => {
    if (c.id !== store.activeId) return c;
    const items = patch.items ?? c.items;
    const autoTitle = isPlaceholderTitle(c.title) ? titleFromItems(items) : c.title;
    return {
      ...c,
      ...patch,
      title: patch.title ?? autoTitle,
      updatedAt: Date.now(),
      items,
    };
  });
  return { ...store, conversations };
}

export function addConversation(store: ChatStoreV2): ChatStoreV2 {
  const c = emptyConversation(`שיחה ${store.conversations.length + 1}`);
  return { version: 2, conversations: [c, ...store.conversations], activeId: c.id };
}

export function switchConversation(store: ChatStoreV2, id: string): ChatStoreV2 {
  if (!store.conversations.some((c) => c.id === id)) return store;
  return { ...store, activeId: id };
}
