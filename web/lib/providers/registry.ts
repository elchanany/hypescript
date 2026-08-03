import type { Provider } from "@/lib/agent/types";
import type { ProviderDefinition } from "./types";

export const PROVIDER_REGISTRY = [
  {
    id: "deepseek",
    labelHe: "DeepSeek",
    kind: "llm",
    envKeys: ["DEEPSEEK_API_KEY"],
    configuredKeys: ["deepseek"],
  },
  {
    id: "openai",
    labelHe: "OpenAI",
    kind: "llm",
    envKeys: ["OPENAI_API_KEY"],
    configuredKeys: ["openai"],
  },
  {
    id: "anthropic",
    labelHe: "Anthropic",
    kind: "llm",
    envKeys: ["ANTHROPIC_API_KEY"],
    configuredKeys: ["anthropic"],
  },
  {
    id: "gemini",
    labelHe: "Gemini",
    kind: "llm",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    configuredKeys: ["gemini"],
  },
  {
    id: "groq-transcribe",
    labelHe: "Groq Whisper",
    kind: "transcribe",
    envKeys: ["GROQ_API_KEY"],
    configuredKeys: ["groq-transcribe"],
  },
] as const satisfies readonly ProviderDefinition[];

export const LLM_PROVIDERS = PROVIDER_REGISTRY.filter((provider) => provider.kind === "llm") as readonly (ProviderDefinition & { id: Provider })[];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDER_REGISTRY.map((provider) => [provider.id, provider])) as Record<
  (typeof PROVIDER_REGISTRY)[number]["id"],
  (typeof PROVIDER_REGISTRY)[number]
>;
