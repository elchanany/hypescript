import { PROVIDER_BY_ID, PROVIDER_REGISTRY } from "./registry";
import type { ProviderDefinition, ProviderId, ProviderStatusInfo } from "./types";

export interface ApiConfigShape {
  providers?: Record<string, boolean>;
  transcription?: Record<string, boolean>;
  images?: Record<string, boolean>;
}

export function flattenApiConfig(config: ApiConfigShape): Record<string, boolean> {
  const eleven = !!config.transcription?.elevenlabs;
  return {
    ...(config.providers || {}),
    "groq-transcribe": !!config.transcription?.groq,
    "elevenlabs-transcribe": eleven,
    "elevenlabs-voice": eleven,
    "openai-image": !!config.images?.openai,
  };
}

export function isProviderConfigured(provider: ProviderDefinition, configured: Record<string, boolean>): boolean {
  return provider.configuredKeys.some((key) => !!configured[key]);
}

export function getProviderStatuses(configured: Record<string, boolean>): ProviderStatusInfo[] {
  return PROVIDER_REGISTRY.map((provider) => {
    const unavailableReasonHe = "unavailableReasonHe" in provider ? provider.unavailableReasonHe : undefined;
    if (unavailableReasonHe) {
      return { ...provider, status: "unavailable", reasonHe: unavailableReasonHe };
    }
    if (isProviderConfigured(provider, configured)) {
      return { ...provider, status: "configured_unverified", reasonHe: "המפתח מוגדר; הזמינות טרם נבדקה" };
    }
    return {
      ...provider,
      status: "missing_key",
      reasonHe: `חסר מפתח: ${provider.envKeys.join(" או ")}`,
    };
  });
}

export function getProviderStatus(id: ProviderId, configured: Record<string, boolean>): ProviderStatusInfo {
  const provider = PROVIDER_BY_ID[id];
  const [status] = getProviderStatuses(configured).filter((item) => item.id === provider.id);
  return status;
}

/** A configured provider may be attempted; only `ready` means a live probe succeeded. */
export function isProviderUsable(status: ProviderStatusInfo): boolean {
  return status.status === "ready" || status.status === "configured_unverified";
}
