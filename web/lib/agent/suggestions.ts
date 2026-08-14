import { ChatMessage, ContentPart } from "./types";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 700;
const MAX_SUGGESTION_CHARS = 84;

export interface SuggestionContext {
  projectSummary?: string;
  availableCapabilities?: string[];
}

function textContent(content: string | ContentPart[] | null): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part.type === "text").map((part) => part.text).join(" ");
}

export function suggestionPrompt(messages: unknown, context: SuggestionContext = {}): ChatMessage[] | null {
  if (!Array.isArray(messages)) return null;
  const turns = messages
    .filter((message): message is ChatMessage => !!message && typeof message === "object" && ["user", "assistant"].includes((message as ChatMessage).role))
    .map((message) => ({ role: message.role, text: textContent(message.content).trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter((message) => message.text)
    .slice(-MAX_MESSAGES);
  if (!turns.some((turn) => turn.role === "user") || !turns.some((turn) => turn.role === "assistant")) return null;

  const transcript = turns.map((turn) => `${turn.role === "user" ? "המשתמש" : "Hypescript"}: ${turn.text}`).join("\n");
  const capabilities = (context.availableCapabilities || []).filter(Boolean).slice(0, 16).join(", ");
  const projectSummary = String(context.projectSummary || "").trim().slice(0, 900);
  return [
    {
      role: "system",
      content: "אתה מנוע הצעות קטן בתוך עורך וידאו בשיחה. הסק מהשיחה ומהפרויקט את מטרת היצירה, הקהל, האירוע או ערוץ הפרסום (למשל מודעת דירה בפייסבוק או סרט בת מצווה). החזר JSON בלבד במבנה {\"suggestions\":[\"...\",\"...\",\"...\"]}. בדיוק 3 הוראות קצרות מאוד בעברית שהמשתמש יכול לשלוח עכשיו: אחת היא הצעד ההגיוני הבא, אחת משפרת את התוצאה לפי מטרת היצירה, ואחת מגלה יכולת רלוונטית שהמשתמש אולי לא ידע שקיימת. אל תציע יכולת שאינה ברשימת היכולות. אל תחזור על פעולה שכבר הושלמה. בלי הסברים, כותרות או Markdown.",
    },
    { role: "user", content: `הפרויקט הנוכחי:\n${projectSummary || "אין עדיין פרטי פרויקט נוספים."}\n\nיכולות זמינות באמת:\n${capabilities || "חיתוך, כתוביות, שכבות וייצוא"}\n\nהשיחה האחרונה:\n${transcript}` },
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
