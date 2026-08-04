import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { postLoginPath } from "./session";

describe("postLoginPath", () => {
  const original = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    // @ts-expect-error test stub
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };
  });

  afterEach(() => {
    // @ts-expect-error restore
    globalThis.localStorage = original;
  });

  it("sends new users to onboarding", () => {
    expect(postLoginPath("/dashboard")).toBe("/onboarding");
  });

  it("sends onboarded users to safe next path", () => {
    localStorage.setItem("hs_onboarding_done", "1");
    expect(postLoginPath("/dashboard")).toBe("/dashboard");
    expect(postLoginPath("/settings")).toBe("/settings");
  });

  it("rejects open redirects", () => {
    localStorage.setItem("hs_onboarding_done", "1");
    expect(postLoginPath("https://evil.example")).toBe("/dashboard");
    expect(postLoginPath("//evil.example")).toBe("/dashboard");
  });
});
