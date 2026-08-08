// טיפוסים משותפים לסוכן ה-AI. פורמט ההודעות הקנוני הוא סגנון-OpenAI;
// שרת ה-proxy ממיר אותו לפורמט של כל ספק (Anthropic/Gemini) ובחזרה.

export type Provider = "deepseek" | "openai" | "anthropic" | "gemini";

// שלושת מצבי הסוכן. ההבדל אינו קוסמטי: Ask ו-Plan אינם מקבלים כלים כלל,
// ולכן אינם יכולים לשנות את הפרויקט (אכיפה אמיתית, לא רק הנחיה).
export type AgentMode = "ask" | "plan" | "act";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

// חלקי-תוכן (לתמיכה בתמונות/ראייה).
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// הודעה בפורמט קנוני (OpenAI-style).
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string; // עבור role:"tool"
  name?: string; // שם הכלי עבור role:"tool"
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface AgentResponse {
  content: string | null;
  tool_calls: ToolCall[];
  usage?: AgentUsage;
  model?: string;
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
};
