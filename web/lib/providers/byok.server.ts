import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import type { Provider } from "@/lib/agent/types";

const ALLOWED = new Set<Provider>(["deepseek", "openai", "anthropic", "gemini"]);

function encryptionKey(): Buffer {
  const secret = (process.env.BYOK_ENCRYPTION_KEY || "").trim();
  if (secret.length < 32) throw new Error("byok_encryption_not_configured");
  return createHash("sha256").update(secret, "utf8").digest();
}

export function isByokProvider(value: unknown): value is Provider {
  return typeof value === "string" && ALLOWED.has(value as Provider);
}

export async function saveByokKey(userId: string, provider: Provider, plain: string): Promise<void> {
  if (!isByokProvider(provider)) throw new Error("unsupported_provider");
  const service = getSupabaseServiceClient();
  if (!service) throw new Error("byok_storage_unavailable");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const { error } = await service.from("user_provider_secrets").upsert({
    user_id: userId,
    provider,
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: tag.toString("base64"),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error("byok_save_failed");
}

export async function deleteByokKey(userId: string, provider: Provider): Promise<void> {
  const service = getSupabaseServiceClient();
  if (!service) throw new Error("byok_storage_unavailable");
  const { error } = await service.from("user_provider_secrets").delete().eq("user_id", userId).eq("provider", provider);
  if (error) throw new Error("byok_delete_failed");
}

export async function listByokProviders(userId: string): Promise<Provider[]> {
  const service = getSupabaseServiceClient();
  if (!service) return [];
  const { data } = await service.from("user_provider_secrets").select("provider").eq("user_id", userId);
  return (data || []).map((row) => row.provider).filter(isByokProvider);
}

export async function readByokKey(userId: string, provider: Provider): Promise<string | null> {
  const service = getSupabaseServiceClient();
  if (!service) return null;
  const { data } = await service
    .from("user_provider_secrets")
    .select("ciphertext,iv,auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data) return null;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(data.iv, "base64"));
  decipher.setAuthTag(Buffer.from(data.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
