import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSupabasePublicConfig, isAuthConfigured } from "./config";

describe("auth config (optional, crash-free)", () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  afterEach(() => {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
  });

  it("reports not configured when env missing", () => {
    expect(isAuthConfigured()).toBe(false);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("reports configured only when both url and anon key exist", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(isAuthConfigured()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
    expect(isAuthConfigured()).toBe(true);
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-test",
    });
  });
});
