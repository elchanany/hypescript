import type { Provider } from "@/lib/agent/types";
import type { ProviderDefinition, ProviderId } from "./types";

export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = [
  {
    id: "deepseek",
    labelHe: "DeepSeek",
    kind: "llm",
    envKeys: ["DEEPSEEK_API_KEY"],
    configuredKeys: ["deepseek"],
    billingRisk: "metered_external",
    billingNoteHe: "השימוש מחויב בחשבון DeepSeek החיצוני לפי תנאיו.",
  },
  {
    id: "openai",
    labelHe: "OpenAI",
    kind: "llm",
    envKeys: ["OPENAI_API_KEY"],
    configuredKeys: ["openai"],
    billingRisk: "metered_external",
    billingNoteHe: "השימוש מחויב בחשבון OpenAI החיצוני לפי תנאיו.",
  },
  {
    id: "anthropic",
    labelHe: "Anthropic",
    kind: "llm",
    envKeys: ["ANTHROPIC_API_KEY"],
    configuredKeys: ["anthropic"],
    billingRisk: "metered_external",
    billingNoteHe: "השימוש מחויב בחשבון Anthropic החיצוני לפי תנאיו.",
  },
  {
    id: "gemini",
    labelHe: "Gemini",
    kind: "llm",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    configuredKeys: ["gemini"],
    billingRisk: "unknown",
    billingNoteHe: "לא ניתן להבטיח שהקריאה נמצאת במכסה חינמית; נדרש אישור.",
  },
  {
    id: "groq-transcribe",
    labelHe: "Groq Whisper",
    kind: "transcribe",
    envKeys: ["GROQ_API_KEY"],
    configuredKeys: ["groq-transcribe"],
    billingRisk: "unknown",
    billingNoteHe: "מכסה או חיוב תלויים בחשבון Groq; לא מניחים שהקריאה חינמית.",
  },
  {
    id: "elevenlabs-transcribe",
    labelHe: "ElevenLabs Scribe",
    kind: "transcribe",
    envKeys: ["ELEVENLABS_API_KEY"],
    configuredKeys: ["elevenlabs-transcribe"],
    billingRisk: "metered_external",
    billingNoteHe: "תמלול צורך מכסה בחשבון ElevenLabs החיצוני.",
  },
  {
    id: "elevenlabs-voice",
    labelHe: "ElevenLabs קריינות",
    kind: "voice",
    envKeys: ["ELEVENLABS_API_KEY"],
    configuredKeys: ["elevenlabs-voice"],
    billingRisk: "metered_external",
    billingNoteHe: "יצירת קול צורכת מכסה בחשבון ElevenLabs החיצוני.",
  },
] as const;

export const LLM_PROVIDERS = PROVIDER_REGISTRY.filter((provider) => provider.kind === "llm") as readonly (ProviderDefinition & { id: Provider })[];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDER_REGISTRY.map((provider) => [provider.id, provider])) as Record<ProviderId, ProviderDefinition>;
