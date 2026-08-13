import { ChatMessage, ContentPart } from "./types";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 700;
const MAX_SUGGESTION_CHARS = 110;

function textContent(content: string | ContentPart[] | null): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part.type === "text").map((part) => part.text).join(" ");
}

export function suggestionPrompt(messages: unknown): ChatMessage[] | null {
  if (!Array.isArray(messages)) return null;
  const turns = messages
    .filter((message): message is ChatMessage => !!message && typeof message === "object" && ["user", "assistant"].includes((message as ChatMessage).role))
    .map((message) => ({ role: message.role, text: textContent(message.content).trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter((message) => message.text)
    .slice(-MAX_MESSAGES);
  if (!turns.some((turn) => turn.role === "user") || !turns.some((turn) => turn.role === "assistant")) return null;

  const transcript = turns.map((turn) => `${turn.role === "user" ? "המשתמש" : "Hypescript"}: ${turn.text}`).join("\n");
  return [
    {
      role: "system",
      content: "אתה מציע את הפעולות הבאות בצ'אט של עורך וידאו. החזר JSON בלבד במבנה {\"suggestions\":[\"...\",\"...\",\"...\"]}. בדיוק 3 הצעות קצרות בעברית, שונות זו מזו, ישימות ומבוססות אך ורק על השיחה. נסח כל הצעה כהוראה שהמשתמש יכול לשלוח עכשיו. בלי הסברים ובלי Markdown.",
    },
    { role: "user", content: `השיחה האחרונה:\n${transcript}` },
  ];
}

export function parseSuggestions(content: string | null | undefined): string[] {
  const raw = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let candidates: unknown[] = [];
  try {
    const parsed = JSON.parse(raw);
    candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  } catch {
    candidates = raw.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  }
  return [...new Set(candidates
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.replace(/^["']|["']$/g, "").trim().slice(0, MAX_SUGGESTION_CHARS))
    .filter((value) => value.length >= 4))].slice(0, 3);
}
