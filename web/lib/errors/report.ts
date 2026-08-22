// דיווח שגיאות "owner" — כדי שמי שמתחזק את המערכת יראה תקלות תשתית בלי
// שהמשתמש יצטרך לדווח עליהן בעצמו.
//
// שימוש בטבלה הקיימת audit_logs (supabase/migrations/20260804170000_
// pkg_a_foundation.sql) ולא ב-analytics_events: analytics_events דורשת
// user_id לא-ריק ו-RLS שמאפשר insert רק כשהמשתמש נתן analytics_consent —
// לא מתאים לתקלת תשתית שיכולה לקרות גם בלי משתמש מחובר, וגם לא לפני
// שהוא הסכים למעקב. audit_logs כבר מתאים בדיוק לצורה הזו: actor_id
// אופציונלי, action/target_type/target_id/result/reason/meta, ויש לה
// מדיניות RLS שמאפשרת קריאה למי שיש לו הרשאת audit.read (ראו
// audit_read_admin באותה מיגרציה) — כך שמנהל מערכת יכול לראות את זה.
//
// Server-only בכוונה: כתיבה ל-audit_logs דורשת את מפתח ה-service role.
// לעולם לא לקרוא לזה מקומפוננטת לקוח.

import "server-only";
import { getSupabaseServiceClient } from "@/lib/auth/server";

export interface OwnerErrorReport {
  /** קוד השגיאה המקורי (כמו ב-ErrorExplanation.code). */
  code: string;
  /** קוד סטטוס HTTP, אם רלוונטי. */
  status?: number;
  /** מזהה המשתמש שנתקל בתקלה, אם ידוע. null/undefined כשאין (למשל: webhook). */
  userId?: string | null;
  /** מסלול ה-API או המסך שבו זה קרה — עוזר לאתר את זה מהר. */
  path?: string;
  /** הודעת השגיאה הגולמית או פרטים טכניים נוספים, לצורך אבחון. */
  message?: string;
  /** נתונים חופשיים נוספים לאבחון (לא PII רגיש). */
  meta?: Record<string, unknown>;
}

/**
 * רושם תקלת תשתית ("owner"-class) ב-audit_logs. Fire-and-forget לגמרי:
 * לא מחזיר Promise שהקורא צריך להמתין לו, ולעולם לא זורק — כישלון בדיווח
 * עצמו אסור שישבור את הבקשה של המשתמש. אם אין Service Role מוגדר (למשל
 * בסביבת פיתוח בלי מפתחות), הפונקציה פשוט לא עושה כלום.
 */
export function reportOwnerError(report: OwnerErrorReport): void {
  try {
    const client = getSupabaseServiceClient();
    if (!client) return;
    const { code, status, userId, path, message, meta } = report;
    void client
      .from("audit_logs")
      .insert({
        actor_id: userId || null,
        action: "error.owner_fault",
        target_type: "error_code",
        target_id: code,
        result: "error",
        reason: message ? message.slice(0, 500) : code,
        meta: {
          status: status ?? null,
          path: path ?? null,
          ...(meta || {}),
        },
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // דיווח נכשל בשקט — לעולם לא לשבור את בקשת המשתמש בגלל זה.
  }
}
