import { describe, expect, it } from "vitest";
import { configuredProviders } from "@/lib/agent/providers";
import { flattenApiConfig, getProviderStatus, getProviderStatuses, isProviderUsable } from "./health";
import { PROVIDER_REGISTRY } from "./registry";

describe("provider registry", () => {
  it("contains only LLM providers exposed by the existing agent proxy", () => {
    const registryLlmIds = PROVIDER_REGISTRY
      .filter((provider) => provider.kind === "llm")
      .map((provider) => provider.id)
      .sort();

    expect(registryLlmIds).toEqual(Object.keys(configuredProviders()).sort());
  });

  it("contains wired transcription and voice providers", () => {
    expect(PROVIDER_REGISTRY.filter((provider) => provider.kind === "transcribe").map((provider) => provider.id)).toEqual([
      "groq-transcribe",
      "elevenlabs-transcribe",
    ]);
    expect(PROVIDER_REGISTRY.filter((provider) => provider.kind === "voice").map((provider) => provider.id)).toEqual([
      "elevenlabs-voice",
    ]);
  });

  it("maps missing keys to missing_key status", () => {
    const status = getProviderStatus("deepseek", { deepseek: false });

    expect(status.status).toBe("missing_key");
    expect(status.reasonHe).toContain("DEEPSEEK_API_KEY");
  });

  it("maps configured providers from /api/config response shape", () => {
    const configured = flattenApiConfig({
      providers: { deepseek: true, openai: false, anthropic: false, gemini: false },
      transcription: { groq: true, elevenlabs: true },
    });
    const statuses = getProviderStatuses(configured);

    expect(statuses.find((provider) => provider.id === "deepseek")?.status).toBe("configured_unverified");
    expect(statuses.find((provider) => provider.id === "openai")?.status).toBe("missing_key");
    expect(statuses.find((provider) => provider.id === "groq-transcribe")?.status).toBe("configured_unverified");
    expect(statuses.find((provider) => provider.id === "elevenlabs-transcribe")?.status).toBe("configured_unverified");
    expect(statuses.find((provider) => provider.id === "elevenlabs-voice")?.status).toBe("configured_unverified");
  });

  it("does not claim live readiness from a key, while still allowing an attempted call", () => {
    const status = getProviderStatus("openai", { openai: true });
    expect(status.status).toBe("configured_unverified");
    expect(status.reasonHe).toContain("טרם נבדקה");
    expect(isProviderUsable(status)).toBe(true);
    expect(isProviderUsable(getProviderStatus("openai", { openai: false }))).toBe(false);
  });
});
