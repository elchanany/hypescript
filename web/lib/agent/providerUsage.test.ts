import { describe, expect, it } from "vitest";
import { normalizeProviderUsage } from "./providers";

describe("provider usage normalization", () => {
  it("normalizes OpenAI-compatible usage", () => {
    expect(normalizeProviderUsage("openai", { usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } })).toEqual({ inputTokens: 10, outputTokens: 4, totalTokens: 14 });
  });
  it("normalizes Anthropic usage", () => {
    expect(normalizeProviderUsage("anthropic", { usage: { input_tokens: 7, output_tokens: 3 } })).toEqual({ inputTokens: 7, outputTokens: 3, totalTokens: 10 });
  });
  it("normalizes Gemini usage metadata", () => {
    expect(normalizeProviderUsage("gemini", { usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 5, totalTokenCount: 13 } })).toEqual({ inputTokens: 8, outputTokens: 5, totalTokens: 13 });
  });
  it("returns undefined when the provider omitted usage", () => {
    expect(normalizeProviderUsage("deepseek", {})).toBeUndefined();
  });
});
