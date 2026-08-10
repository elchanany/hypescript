import { describe, expect, it, vi } from "vitest";
import { getProviderApprovals, isProviderBillingApproved, parseProviderApprovals, setProviderBillingApproval } from "./policy";

function memoryStorage(seed: string | null = null) {
  let raw = seed;
  return { getItem: vi.fn(() => raw), setItem: vi.fn((_key: string, value: string) => { raw = value; }) };
}

describe("provider billing policy", () => {
  it("fails closed for missing or corrupt approval state", () => {
    expect(parseProviderApprovals(null).approved).toEqual({});
    expect(parseProviderApprovals("not json").approved).toEqual({});
    expect(isProviderBillingApproved("openai", memoryStorage())).toBe(false);
  });

  it("persists and revokes explicit approval per provider without secrets", () => {
    const storage = memoryStorage();
    setProviderBillingApproval("openai", true, storage);
    expect(isProviderBillingApproved("openai", storage)).toBe(true);
    expect(isProviderBillingApproved("deepseek", storage)).toBe(false);
    expect(JSON.stringify(getProviderApprovals(storage))).not.toContain("key");
    setProviderBillingApproval("openai", false, storage);
    expect(isProviderBillingApproved("openai", storage)).toBe(false);
  });

  it("keeps openai-image billing approval separate from the OpenAI LLM approval", () => {
    const storage = memoryStorage();
    // אישור LLM של OpenAI אינו מאשר יצירת תמונות
    setProviderBillingApproval("openai", true, storage);
    expect(isProviderBillingApproved("openai", storage)).toBe(true);
    expect(isProviderBillingApproved("openai-image", storage)).toBe(false);
    // אישור תמונות אינו מאשר את ה-LLM
    setProviderBillingApproval("openai-image", true, storage);
    expect(isProviderBillingApproved("openai-image", storage)).toBe(true);
    expect(isProviderBillingApproved("openai", storage)).toBe(true);
    // ביטול ה-LLM לא מבטל את אישור התמונות
    setProviderBillingApproval("openai", false, storage);
    expect(isProviderBillingApproved("openai", storage)).toBe(false);
    expect(isProviderBillingApproved("openai-image", storage)).toBe(true);
  });
});
