export type ProviderKind = "llm" | "transcribe" | "voice" | "image";
export type ProviderBillingRisk = "no_charge" | "metered_external" | "unknown";

/** `ready` is reserved for a successful live probe; an env key alone is unverified.
 *  `unhealthy` = a key IS configured but the live probe failed (bad/expired key, quota, outage). */
export type ProviderStatus = "ready" | "unhealthy" | "configured_unverified" | "missing_key" | "unavailable";

export type ProviderId =
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq-transcribe"
  | "elevenlabs-transcribe"
  | "elevenlabs-voice"
  | "openai-image";

export interface ProviderDefinition {
  id: ProviderId;
  labelHe: string;
  kind: ProviderKind;
  envKeys: readonly string[];
  configuredKeys: readonly string[];
  billingRisk: ProviderBillingRisk;
  billingNoteHe: string;
  unavailableReasonHe?: string;
}

export interface ProviderStatusInfo extends ProviderDefinition {
  status: ProviderStatus;
  reasonHe: string;
}
