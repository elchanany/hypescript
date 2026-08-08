export type ProviderKind = "llm" | "transcribe" | "voice";

/** `ready` is reserved for a successful live probe; an env key alone is unverified. */
export type ProviderStatus = "ready" | "configured_unverified" | "missing_key" | "unavailable";

export type ProviderId =
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq-transcribe"
  | "elevenlabs-transcribe"
  | "elevenlabs-voice";

export interface ProviderDefinition {
  id: ProviderId;
  labelHe: string;
  kind: ProviderKind;
  envKeys: readonly string[];
  configuredKeys: readonly string[];
  unavailableReasonHe?: string;
}

export interface ProviderStatusInfo extends ProviderDefinition {
  status: ProviderStatus;
  reasonHe: string;
}
