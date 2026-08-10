import "server-only";

export type CloudServiceName = "database" | "storage" | "renderer";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

export interface RendererConfig {
  url: string;
  token: string;
  callbackSecret: string;
  callbackUrl: string;
}

export function getR2Config(): R2Config | null {
  const accountId = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: env("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function getRendererConfig(): RendererConfig | null {
  const url = env("CLOUD_RENDER_URL").replace(/\/+$/, "");
  const token = env("CLOUD_RENDER_TOKEN");
  const callbackSecret = env("CLOUD_RENDER_CALLBACK_SECRET");
  const siteUrl = env("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
  const callbackUrl = env("CLOUD_RENDER_CALLBACK_URL") || (siteUrl ? `${siteUrl}/api/cloud/render/callback` : "");
  if (!url || !token || !callbackSecret || !callbackUrl) return null;
  return { url, token, callbackSecret, callbackUrl };
}

export function getCloudUploadLimitBytes(): number {
  const configured = Number(env("CLOUD_MAX_UPLOAD_BYTES"));
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 5 * 1024 * 1024 * 1024;
}

export function getCloudReadiness() {
  const database = !!env("NEXT_PUBLIC_SUPABASE_URL") && !!env("NEXT_PUBLIC_SUPABASE_ANON_KEY") && !!env("SUPABASE_SERVICE_ROLE_KEY");
  const storage = !!getR2Config();
  const renderer = !!getRendererConfig();
  const missing: string[] = [];
  if (!database) missing.push("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!storage) missing.push("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET");
  if (!renderer) missing.push("CLOUD_RENDER_URL", "CLOUD_RENDER_TOKEN", "CLOUD_RENDER_CALLBACK_SECRET", "NEXT_PUBLIC_SITE_URL");
  return {
    configured: database && storage && renderer,
    services: { database, storage, renderer },
    missing: [...new Set(missing.filter((name) => !env(name)))],
  };
}
