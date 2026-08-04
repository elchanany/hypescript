import { afterEach, describe, expect, it } from "vitest";
import {
  classifyPublicKey,
  getAuthDiagnostics,
  getSupabasePublicConfig,
  normalizeSupabaseUrl,
  sanitizeEnvValue,
} from "./config";

describe("normalizeSupabaseUrl", () => {
  it("strips /rest/v1 and trailing slashes", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
  });
});

describe("sanitizeEnvValue", () => {
  it("removes wrapping quotes and whitespace", () => {
    expect(sanitizeEnvValue('  "sb_publishable_abc" \n')).toBe("sb_publishable_abc");
    expect(sanitizeEnvValue("'eyJhbGciOi...'")).toBe("eyJhbGciOi...");
  });
});

describe("classifyPublicKey", () => {
  it("detects publishable and secret prefixes", () => {
    expect(classifyPublicKey("sb_publishable_xxx")).toBe("publishable");
    expect(classifyPublicKey("sb_secret_xxx")).toBe("secret");
  });

  it("detects service_role JWT", () => {
    const payload = Buffer.from(JSON.stringify({ role: "service_role", ref: "x" })).toString("base64url");
    const jwt = `hdr.${payload}.sig`;
    expect(classifyPublicKey(jwt)).toBe("jwt_service_role");
  });

  it("detects anon JWT", () => {
    const payload = Buffer.from(JSON.stringify({ role: "anon", ref: "x" })).toString("base64url");
    const jwt = `hdr.${payload}.sig`;
    expect(classifyPublicKey(jwt)).toBe("jwt_anon");
  });
});

describe("getSupabasePublicConfig", () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const prevPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
    if (prevPub === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevPub;
  });

  it("rejects service_role as public config", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = `hdr.${payload}.sig`;
    expect(getSupabasePublicConfig()).toBeNull();
    expect(getAuthDiagnostics().issue).toBe("secret_used_as_public");
  });

  it("accepts publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/rest/v1";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '"sb_publishable_test_key_value"';
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://abc.supabase.co",
      anonKey: "sb_publishable_test_key_value",
    });
  });
});
