# AGENTS.md — נקודת הכניסה לכל סוכן

> קרא קובץ זה ראשון. הוא מסכם את הפרויקט ומפנה לשאר קבצי התיעוד. הוא ניטרלי —
> תקף לכל סוכן או כלי (Claude, Codex, Cursor וכו') שעובד בתיקייה הזו.

## מה זה hypescript

כלי לעריכה אוטומטית של שיעורי וידאו בעברית (בעיקר שיעורי רב לעמותה, 5–10 דקות):
מקבל וידאו מלא + טקסט של מה שצריך להישאר, ומחזיר סרטון שמכיל **בדיוק** את הטקסט —
מדויק, בלי נשימות/שתיקות/מהססים — יחד עם כתוביות עברית מסונכרנות.

## מבנה הפרויקט (שתי אפליקציות)

| תיקייה | מה | מתי |
|---|---|---|
| `web/` | **המסלול המרכזי.** Next.js, רץ בדפדפן, נפרס ב-Vercel. עיבוד הווידאו מקומי דרך `ffmpeg.wasm` — הווידאו לא עוזב את המחשב. | ברירת מחדל |
| `local/` | כלי Python CLI + GUI (FFmpeg + faster-whisper/ענן). מהיר לקבצים כבדים, 100% אופליין אפשרי. | קבצים כבדים/לא-מקוון |

שתי הגרסאות חולקות את **אותה לוגיקת ליבה** (יישור-סקריפט, הסרת שתיקות/מהססים, בניית
SRT). ב-`web` היא TypeScript (`web/lib/`), ב-`local` היא Python (`local/hypescript/`).
ראה [ARCHITECTURE.md](ARCHITECTURE.md).

## השלב הנוכחי

- **גרסה פעילה: v0.1.0** — web MVP (חיתוך-לפי-סקריפט, הסרת שתיקות/מהססים, SRT, רינדור
  ffmpeg.wasm, עמוד הגדרות למפתחות) + כלי local מלא. שניהם עובדים; `web build` עובר.
- הבא בתור: ראה [ROADMAP.md](ROADMAP.md).

## מה בטווח עכשיו / מה לא

- **בטווח:** שיפורי v0.2.0 (chunking לאודיו ארוך, אינטרו/אאוטרו בווב, שיפורי רינדור/כתוביות).
- **מחוץ לטווח עד אישור מפורש:** סוכן ה-AI (חיתוך/עריכה אוטונומית). יש לו placeholder
  בלבד בהגדרות. אין לבנות אותו כרגע.

## לפני שנוגעים בקוד

1. קרא את [RULES.md](RULES.md) — חוקים מחייבים (פרטיות, סנכרון ליבה, הפרדת אפליקציות).
2. שינוי באלגוריתם? חובה לעדכן גם ב-`web/lib` וגם ב-`local/hypescript` (RULES §3).
3. פיצ'ר חדש? בדוק שהוא בגרסה הפעילה ב-ROADMAP לפני שמתחילים.

## מפת קבצים

- [PRODUCT_VISION.md](PRODUCT_VISION.md) — מה המוצר ולאן הוא הולך.
- [ARCHITECTURE.md](ARCHITECTURE.md) — מבנה המערכות והזרימה.
- [STACK.md](STACK.md) — טכנולוגיות ולמה.
- [UI_GUIDELINES.md](UI_GUIDELINES.md) — עקרונות ממשק (RTL, עיצוב).
- [ROADMAP.md](ROADMAP.md) + [ROADMAP_GUIDELINES.md](ROADMAP_GUIDELINES.md) — שלבים וניהולם.
- [README.md](README.md) — הפנים הציבוריות + הרצה.
- `web/README.md`, `local/README.md` — הוראות ספציפיות לכל אפליקציה.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
