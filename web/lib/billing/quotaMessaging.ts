const QUOTA_CODES = [
  "project_quota_exceeded",
  "storage_quota_exceeded",
  "global_storage_quota_exceeded",
  "render_quota_exceeded",
  "global_render_quota_exceeded",
  "render_concurrency_exceeded",
] as const;

export type UserQuotaCode = (typeof QUOTA_CODES)[number];

export function quotaCode(value: unknown): UserQuotaCode | null {
  const text = value instanceof Error ? value.message : String(value || "");
  return QUOTA_CODES.find((code) => text.includes(code)) || null;
}

export function quotaMessage(value: unknown): string | null {
  const code = quotaCode(value);
  if (code === "project_quota_exceeded") {
    return "הגעת למגבלת הפרויקטים במסלול הנוכחי. שדרג ל-Pro כדי ליצור פרויקטים ללא הגבלה ולערוך בענן מכל מכשיר!";
  }
  if (code === "storage_quota_exceeded" || code === "global_storage_quota_exceeded") {
    return "נפח האחסון בענן מלא. שדרג ל-Pro כדי להגדיל את נפח האחסון ולהמשיך לשמור את כל הסרטונים שלך בענן.";
  }
  if (code === "render_quota_exceeded" || code === "global_render_quota_exceeded") {
    return "מכסת דקות הרינדור בחשבון הסתיימה. שדרג ל-Pro כדי לייצא סרטונים באיכות 4K ללא הגבלה.";
  }
  if (code === "render_concurrency_exceeded") {
    return "ישנו תהליך רינדור אחר שרץ כרגע. במסלול Pro ניתן להריץ מספר רינדורים במקביל.";
  }
  return null;
}
