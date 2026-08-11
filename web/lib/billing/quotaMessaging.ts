const QUOTA_CODES = [
  "project_quota_exceeded",
  "storage_quota_exceeded",
  "render_quota_exceeded",
] as const;

export type UserQuotaCode = (typeof QUOTA_CODES)[number];

export function quotaCode(value: unknown): UserQuotaCode | null {
  const text = value instanceof Error ? value.message : String(value || "");
  return QUOTA_CODES.find((code) => text.includes(code)) || null;
}

export function quotaMessage(value: unknown): string | null {
  const code = quotaCode(value);
  if (code === "project_quota_exceeded") return "הגעת למספר הפרויקטים הכלול כרגע בחשבון שלך.";
  if (code === "storage_quota_exceeded") return "האחסון הכלול כרגע בחשבון שלך הסתיים.";
  if (code === "render_quota_exceeded") return "דקות הרינדור הכלולות כרגע בחשבון שלך הסתיימו.";
  return null;
}
