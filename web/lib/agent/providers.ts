// מתאמי ספקי LLM (רץ בצד-שרת בלבד). קורא מפתחות מ-env, ממיר פורמט הודעות/כלים
// לכל ספק, ומחזיר תשובה מנורמלת {content, tool_calls}.
//
// מפתחות (משתני סביבה ב-Vercel): DEEPSEEK_API_KEY, OPENAI_API_KEY,
// ANTHROPIC_API_KEY, GEMINI_API_KEY (או GOOGLE_API_KEY).

import { AgentResponse, AgentUsage, ChatMessage, ContentPart, Provider, ToolSchema } from "./types";

export function normalizeProviderUsage(provider: Provider, data: any): AgentUsage | undefined {
  const raw = provider === "anthropic" ? data?.usage : provider === "gemini" ? data?.usageMetadata : data?.usage;
  if (!raw) return undefined;
  const inputTokens = Number(provider === "anthropic" ? raw.input_tokens : provider === "gemini" ? raw.promptTokenCount : raw.prompt_tokens) || 0;
  const outputTokens = Number(provider === "anthropic" ? raw.output_tokens : provider === "gemini" ? raw.candidatesTokenCount : raw.completion_tokens) || 0;
  const totalTokens = Number(provider === "gemini" ? raw.totalTokenCount : raw.total_tokens) || inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

function parseDataUrl(url: string): { mime: string; data: string } {
  const m = url.match(/^data:([^;]+);base64,(.*)$/);
  return m ? { mime: m[1], data: m[2] } : { mime: "image/png", data: "" };
}
const textOnly = (parts: ContentPart[]) => parts.filter((p) => p.type === "text").map((p) => (p as any).text).join(" ");

function anthropicParts(content: ChatMessage["content"]): any[] {
  if (!Array.isArray(content)) return [{ type: "text", text: content || "" }];
  return content.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    const { mime, data } = parseDataUrl(p.image_url.url);
    return { type: "image", source: { type: "base64", media_type: mime, data } };
  });
}
function geminiParts(content: ChatMessage["content"]): any[] {
  if (!Array.isArray(content)) return [{ text: content || "" }];
  return content.map((p) => {
    if (p.type === "text") return { text: p.text };
    const { mime, data } = parseDataUrl(p.image_url.url);
    return { inlineData: { mimeType: mime, data } };
  });
}
const asText = (c: ChatMessage["content"]) => (Array.isArray(c) ? textOnly(c) : c || "");

interface ProviderConfig {
  envKeys: string[];
  defaultModel: string;
  modelEnv: string;
}

const CONFIG: Record<Provider, ProviderConfig> = {
  deepseek: { envKeys: ["DEEPSEEK_API_KEY"], defaultModel: "deepseek-chat", modelEnv: "DEEPSEEK_MODEL" },
  openai: { envKeys: ["OPENAI_API_KEY"], defaultModel: "gpt-4o-mini", modelEnv: "OPENAI_MODEL" },
  anthropic: { envKeys: ["ANTHROPIC_API_KEY"], defaultModel: "claude-3-5-sonnet-latest", modelEnv: "ANTHROPIC_MODEL" },
  gemini: { envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"], defaultModel: "gemini-2.0-flash", modelEnv: "GEMINI_MODEL" },
};

export function providerKey(provider: Provider): string | null {
  for (const name of CONFIG[provider].envKeys) {
    const v = process.env[name];
    if (v) return v.trim();
  }
  return null;
}

export function providerModel(provider: Provider): string {
  return process.env[CONFIG[provider].modelEnv]?.trim() || CONFIG[provider].defaultModel;
}

export function configuredProviders(): Record<Provider, boolean> {
  return {
    deepseek: !!providerKey("deepseek"),
    openai: !!providerKey("openai"),
    anthropic: !!providerKey("anthropic"),
    gemini: !!providerKey("gemini"),
  };
}

export async function callProvider(
  provider: Provider,
  messages: ChatMessage[],
  tools: ToolSchema[],
): Promise<AgentResponse> {
  const key = providerKey(provider);
  if (!key) throw new Error(`לא מוגדר מפתח ל-${provider}. הוסף אותו כמשתנה סביבה ב-Vercel.`);
  const model = providerModel(provider);

  if (provider === "deepseek" || provider === "openai") return callOpenAICompat(provider, key, model, messages, tools);
  if (provider === "anthropic") return callAnthropic(key, model, messages, tools);
  return callGemini(key, model, messages, tools);
}

// --------------------------------------------------------------------------- #
// OpenAI-compatible (DeepSeek / OpenAI)
// --------------------------------------------------------------------------- #
const OPENAI_BASE: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
};

async function callOpenAICompat(
  provider: string, key: string, model: string, messages: ChatMessage[], tools: ToolSchema[],
): Promise<AgentResponse> {
  const body: any = {
    model,
    messages: messages.map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        return {
          role: "assistant",
          content: m.content || "",
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id, type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      if (m.role === "tool") {
        return { role: "tool", tool_call_id: m.tool_call_id, content: Array.isArray(m.content) ? textOnly(m.content) : m.content || "" };
      }
      if (Array.isArray(m.content)) {
        // openai תומך בתמונות; deepseek לא — נשלח טקסט בלבד.
        return { role: m.role, content: provider === "openai" ? m.content : textOnly(m.content) };
      }
      return { role: m.role, content: m.content || "" };
    }),
  };
  if (tools.length) {
    body.tools = tools.map((t) => ({ type: "function", function: t }));
    body.tool_choice = "auto";
  }

  const resp = await fetch(`${OPENAI_BASE[provider]}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${provider} (${resp.status}): ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  const msg = data.choices?.[0]?.message || {};
  const toolCalls = (msg.tool_calls || []).map((tc: any) => ({
    id: tc.id, name: tc.function.name, arguments: safeParse(tc.function.arguments),
  }));
  return { content: msg.content || null, tool_calls: toolCalls, usage: normalizeProviderUsage(provider as Provider, data), model: data.model || model };
}

// --------------------------------------------------------------------------- #
// Anthropic
// --------------------------------------------------------------------------- #
async function callAnthropic(
  key: string, model: string, messages: ChatMessage[], tools: ToolSchema[],
): Promise<AgentResponse> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n") || undefined;
  const conv: any[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") conv.push({ role: "user", content: anthropicParts(m.content) });
    else if (m.role === "assistant") {
      const blocks: any[] = [];
      if (m.content) blocks.push({ type: "text", text: asText(m.content) });
      for (const tc of m.tool_calls || []) blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
      conv.push({ role: "assistant", content: blocks });
    } else if (m.role === "tool") {
      conv.push({ role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: asText(m.content) }] });
    }
  }
  const body: any = { model, max_tokens: 4096, messages: conv };
  if (system) body.system = system;
  if (tools.length) body.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`anthropic (${resp.status}): ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  let content: string | null = null;
  const toolCalls: any[] = [];
  for (const block of data.content || []) {
    if (block.type === "text") content = (content || "") + block.text;
    else if (block.type === "tool_use") toolCalls.push({ id: block.id, name: block.name, arguments: block.input || {} });
  }
  return { content, tool_calls: toolCalls, usage: normalizeProviderUsage("anthropic", data), model: data.model || model };
}

// --------------------------------------------------------------------------- #
// Gemini
// --------------------------------------------------------------------------- #
async function callGemini(
  key: string, model: string, messages: ChatMessage[], tools: ToolSchema[],
): Promise<AgentResponse> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") contents.push({ role: "user", parts: geminiParts(m.content) });
    else if (m.role === "assistant") {
      const parts: any[] = [];
      if (m.content) parts.push({ text: asText(m.content) });
      for (const tc of m.tool_calls || []) parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
      contents.push({ role: "model", parts });
    } else if (m.role === "tool") {
      contents.push({ role: "user", parts: [{ functionResponse: { name: m.name || "tool", response: { result: asText(m.content) } } }] });
    }
  }
  const body: any = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (tools.length) body.tools = [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`gemini (${resp.status}): ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  const parts = data.candidates?.[0]?.content?.parts || [];
  let content: string | null = null;
  const toolCalls: any[] = [];
  let i = 0;
  for (const p of parts) {
    if (p.text) content = (content || "") + p.text;
    else if (p.functionCall) toolCalls.push({ id: `gem_${i++}`, name: p.functionCall.name, arguments: p.functionCall.args || {} });
  }
  return { content, tool_calls: toolCalls, usage: normalizeProviderUsage("gemini", data), model };
}

function safeParse(s: string): Record<string, any> {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
