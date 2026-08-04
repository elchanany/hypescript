import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSupabasePublicConfig,
  isAuthConfigured,
  normalizeSupabaseUrl,
} from "./config";

describe("normalizeSupabaseUrl", () => {
  it("strips trailing slash", () => {
    expect(normalizeSupabaseUrl("https://x.supabase.co/")).toBe("https://x.supabase.co");
  });

  it("strips /rest/v1 (common copy-paste from Data API)", () => {
    expect(normalizeSupabaseUrl("https://x.supabase.co/rest/v1")).toBe(
      "https://x.supabase.co",
    );
    expect(normalizeSupabaseUrl("https://x.supabase.co/rest/v1/")).toBe(
      "https://x.supabase.co",
    );
  });

  it("strips /auth/v1 if pasted", () => {
    expect(normalizeSupabaseUrl("https://x.supabase.co/auth/v1")).toBe(
      "https://x.supabase.co",
    );
  });

  it("leaves a clean project URL alone", () => {
    expect(normalizeSupabaseUrl("https://x.supabase.co")).toBe("https://x.supabase.co");
  });
});

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

  it("normalizes URL when /rest/v1 was pasted into env", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://dbfednzsladjxjhlwfxr.supabase.co/rest/v1";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://dbfednzsladjxjhlwfxr.supabase.co",
      anonKey: "sb_publishable_test",
    });
  });
});
