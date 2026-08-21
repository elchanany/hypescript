// אחסון שיחות מרובות בפרויקט אחד (מיגרציה שקופה מפורמט ישן {items,history}).

import { AgentMode, ChatMessage, Provider } from "./types";
import type { EditorSnapshot } from "@/hooks/useEditor";

export type ChatMessageReference = {
  token: string;
  label: string;
  kind: "media" | "time" | "context" | "message";
  preview?: string;
  author?: "user" | "assistant";
  time?: string;
};

export type ChatItem =
  | { kind: "user"; text: string; time: string; references?: ChatMessageReference[] }
  | { kind: "assistant"; text: string; time: string; modelLabel?: string }
  | { kind: "error"; text: string; time: string }
  | { kind: "quote"; seconds: number; text: string; time: string }
  | { kind: "plan"; id: string; text: string; steps: string[]; state: "pending" | "approved" | "revision"; time: string }
  | { kind: "provider_approval"; id: string; provider: Provider; providerLabel: string; prompt: string; note: string; state: "pending" | "approved" | "declined"; time: string }
  | { kind: "tool"; id: string; label: string; color: string; status: string; state: "running" | "ok" | "error"; summary: string; time: string; name: string; providerLabel?: string; args?: Record<string, any>; startedAt?: number; durationMs?: number; checkpoint?: EditorSnapshot; restored?: boolean; /** נקבע כשה-runtime חסם את הקריאה הזו לפי מצב (Ask/Plan) — ל-UI, לא ל-retry */ modeBlocked?: AgentMode }
  | { kind: "output"; name: string; url: string; mkind: "video" | "srt" | "image" | "audio"; time: string };

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  items: ChatItem[];
  history: ChatMessage[];
  pinned?: boolean;
  /**
   * מצב הסוכן של השיחה הזו (Ask/Plan/Act) — נשמר לפי שיחה, לא גלובלית, כדי
   * שמעבר בין שיחות לא "יזליג" מצב ביצוע לשיחה שעדיין בתכנון. שיחות שהוגרו
   * ממבנה ישן (בלי שדה זה) נופלות ל-"act" דרך conversationMode, כדי לא לשבור
   * זרימה קיימת; שיחה חדשה מקבלת "plan" כברירת מחדל דרך emptyConversation.
   */
  mode?: AgentMode;
  /** האם כבר נוצרה כותרת אוטומטית (LLM) לשיחה — פעם אחת בלבד, לא בכל הודעה. */
  titleGenerated?: boolean;
}

/** מצב תקף של שיחה, עם נפילה בטוחה ל-"act" עבור שיחות ישנות/פגומות בלי שדה mode. */
export function conversationMode(c: Pick<Conversation, "mode">): AgentMode {
  return c.mode === "ask" || c.mode === "plan" || c.mode === "act" ? c.mode : "act";
}

/** Cache של סיכום-זיכרון קצר מ-עד 5 השיחות הקודמות בפרויקט (ראו lib/agent/memorySummary.ts). */
export interface MemorySummaryCache {
  text: string;
  sourceIds: string[];
  /** טביעת-אצבע זולה של תוכן המקורות — לזיהוי שינוי בלי לאחסן את כל השיחות. */
  fingerprint: string;
  generatedAt: number;
}

export interface ChatStoreV2 {
  version: 2;
  conversations: Conversation[];
  activeId: string;
  memorySummary?: MemorySummaryCache;
}

const newId = () => "c_" + Math.random().toString(36).slice(2, 10);

export function titleFromItems(items: ChatItem[] | undefined): string {
  const u = (items || []).find((it) => it.kind === "user") as Extract<ChatItem, { kind: "user" }> | undefined;
  const t = (u?.text || u?.references?.[0]?.label || "").trim().replace(/\s+/g, " ");
  if (!t) return "שיחה חדשה";
  return t.length > 28 ? t.slice(0, 27) + "…" : t;
}

// Plan הוא ברירת המחדל לשיחה *חדשה* בלבד: המשתמש לרוב לא יודע לנסח בדיוק מה
// הוא רוצה, ו-Plan מריץ discover_intent (קורא את המדיה) לפני שנוגעים בפרויקט.
export function emptyConversation(title = "שיחה חדשה", mode: AgentMode = "plan"): Conversation {
  const now = Date.now();
  return { id: newId(), title, createdAt: now, updatedAt: now, items: [], history: [], mode };
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
      conversations: o.conversations.map((c: any) => {
        const items = Array.isArray(c.items) ? c.items.filter((it: ChatItem) => it.kind !== "output") : [];
        return {
          id: c.id || newId(),
          title: c.title || titleFromItems(c.items) || "שיחה",
          createdAt: c.createdAt || Date.now(),
          updatedAt: c.updatedAt || Date.now(),
          items,
          history: Array.isArray(c.history) ? c.history : [],
          pinned: c.pinned === true,
          // שיחות שקדמו לשדה הזה נופלות ל-"act" (הן כבר בעיצומן, לא "שיחה חדשה"
          // שצריכה Plan); רק emptyConversation/addConversation נותנים "plan".
          mode: c.mode === "ask" || c.mode === "plan" || c.mode === "act" ? c.mode : "act",
          titleGenerated: c.titleGenerated === true || items.some((it: ChatItem) => it.kind === "user"),
        };
      }),
      memorySummary: o.memorySummary && typeof o.memorySummary === "object" ? o.memorySummary : undefined,
    };
  }
  // v1: { items, history }
  if (Array.isArray(o.items) || Array.isArray(o.history)) {
    const c = emptyConversation(titleFromItems(o.items), "act");
    c.items = Array.isArray(o.items) ? o.items.filter((it: ChatItem) => it.kind !== "output") : [];
    c.history = Array.isArray(o.history) ? o.history : [];
    c.titleGenerated = c.items.some((it) => it.kind === "user");
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

export function renameConversation(store: ChatStoreV2, id: string, title: string): ChatStoreV2 {
  const clean = title.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!clean) return store;
  return {
    ...store,
    // titleGenerated=true גם על שינוי-שם ידני: כותרת שהמשתמש בחר לעולם לא
    // תידרס אחר כך על ידי כותרת אוטומטית שעדיין ב-flight.
    conversations: store.conversations.map((conversation) => conversation.id === id
      ? { ...conversation, title: clean, titleGenerated: true, updatedAt: Date.now() }
      : conversation),
  };
}

/** מעביר שיחה למצב סוכן אחר (Ask/Plan/Act) — נשמר על השיחה עצמה, לא גלובלית. */
export function setConversationMode(store: ChatStoreV2, id: string, mode: AgentMode): ChatStoreV2 {
  return {
    ...store,
    conversations: store.conversations.map((conversation) => conversation.id === id
      ? { ...conversation, mode, updatedAt: Date.now() }
      : conversation),
  };
}

/** מסמן שכבר נוצרה כותרת אוטומטית — נקרא מיד לפני קריאת ה-LLM כדי לחסום ניסיון כפול. */
export function markTitleGenerated(store: ChatStoreV2, id: string): ChatStoreV2 {
  return {
    ...store,
    conversations: store.conversations.map((conversation) => conversation.id === id
      ? { ...conversation, titleGenerated: true }
      : conversation),
  };
}

/** מחיל כותרת שנוצרה על ידי LLM. אם ריקה — רק מסמן שכבר נוצרה (בלי לדרוס כותרת קיימת). */
export function applyGeneratedTitle(store: ChatStoreV2, id: string, title: string): ChatStoreV2 {
  const clean = title.trim().replace(/\s+/g, " ").slice(0, 80);
  return {
    ...store,
    conversations: store.conversations.map((conversation) => conversation.id === id
      ? { ...conversation, title: clean || conversation.title, titleGenerated: true, updatedAt: conversation.updatedAt }
      : conversation),
  };
}

/** שומר cache חדש של סיכום-הזיכרון הקצר בין שיחות (ראו lib/agent/memorySummary.ts). */
export function setMemorySummaryCache(store: ChatStoreV2, cache: MemorySummaryCache): ChatStoreV2 {
  return { ...store, memorySummary: cache };
}

export function removeConversation(store: ChatStoreV2, id: string): ChatStoreV2 {
  const remaining = store.conversations.filter((conversation) => conversation.id !== id);
  if (!remaining.length) {
    const replacement = emptyConversation();
    return { version: 2, conversations: [replacement], activeId: replacement.id };
  }
  return {
    ...store,
    conversations: remaining,
    activeId: store.activeId === id ? remaining[0].id : store.activeId,
  };
}

export function pinnedConversationCount(store: ChatStoreV2): number {
  return store.conversations.filter((conversation) => conversation.pinned === true).length;
}

export function setConversationPinned(store: ChatStoreV2, id: string, pinned: boolean, limit: number): ChatStoreV2 {
  const target = store.conversations.find((conversation) => conversation.id === id);
  if (!target || target.pinned === pinned) return store;
  if (pinned && pinnedConversationCount(store) >= Math.max(0, limit)) return store;
  return {
    ...store,
    conversations: store.conversations.map((conversation) => conversation.id === id
      ? { ...conversation, pinned, updatedAt: Date.now() }
      : conversation),
  };
}

export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt);
}
