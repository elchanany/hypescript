export type ProviderKind = "llm" | "transcribe";

export type ProviderStatus = "ready" | "missing_key" | "unavailable";

export type ProviderId =
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq-transcribe";

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
