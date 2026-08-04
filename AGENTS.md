# AGENTS.md — נקודת הכניסה לכל סוכן

> קרא קובץ זה ראשון. הוא מסכם את הפרויקט ומפנה לשאר קבצי התיעוד. הוא ניטרלי —
> תקף לכל סוכן או כלי (Claude, Codex, Cursor וכו') שעובד בתיקייה הזו.

## Continuity (חובה לפני עבודה מהותית)

1. קרא [RULES.md](RULES.md) ואת `.ai/HANDOFF.md` + `.ai/ACTIVE_WORK.md`.
2. זרימה מלאה: `.ai/WORKFLOW.md`. מצב יציב: `.ai/PROJECT_STATE.md`. החלטות: `.ai/DECISIONS.md`.
3. לשאלות קוד — Graphify לפני חיפוש רחב (ראה סעיף graphify למטה).
4. אמת קבצי מקור לפני עריכה; שמור על שינויים לא-קשורים.
5. אחרי שינויים רלוונטיים: אימות → `graphify update .` → עדכון HANDOFF/ACTIVE_WORK.
6. שיחות קריאה בלבד לא מעדכנות continuity. אין סודות ב-Git. אין deploy אוטומטי. אין Git הרסני.

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

- **v0.1.0 קיים** — web MVP + כלי local מלא; `web build` עובר.
- **v0.3.0 אושר במפורש ובעבודה** — סוכן AI + עורך בסגנון CapCut (יסודות ב-`main` אחרי PR #4/#5/#6). הפערים הבאים: [docs/GAP_MAP.md](docs/GAP_MAP.md).
- **v0.2.0 עדיין רלוונטי במקביל** — chunking/intro-outro/preview ב-web; ראה [ROADMAP.md](ROADMAP.md).

## מה בטווח עכשיו / מה לא

- **בטווח:** המשך v0.3.0 לפי GAP_MAP (CommandBus/AG-4, עורך), ושיפורי v0.2.0 ב-web.
- **מחוץ לטווח עד אישור מפורש:** Auth/Dashboard/Supabase ושירותים חדשים אחרים (RULES §7). אין להרחיב מעבר למה שאושר ב-ROADMAP בלי לשאול.

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
- `docs/` — GAP_MAP, SECURITY_MODEL, DATA_MODEL ועוד.
- `.ai/` — continuity משותף (HANDOFF / WORKFLOW / PROJECT_STATE / DECISIONS / ACTIVE_WORK).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
