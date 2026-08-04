# DECISIONS.md — החלטות עמידות

רשום כאן רק החלטות ארכיטקטורה / אבטחה / API / מודל נתונים / deploy / workflow.
החלטות מוצר מפורטות גם ב-`ARCHITECTURE.md` / `STACK.md` / `RULES.md`.

## D-001 — עיבוד וידאו מקומי, לא בשרת
- **בחירה:** ffmpeg.wasm בדפדפן / FFmpeg מקומי ב-`local/`.
- **סיבה:** פרטיות + מגבלות Vercel serverless.
- **השלכה:** הווידאו לא עולה לשרת; רק אודיו דחוס לתמלול.

## D-002 — ליבה משוכפלת web/local
- **בחירה:** אותה לוגיקה ב-TypeScript וב-Python, בלי ייבוא משותף.
- **סיבה:** הפרדת אפליקציות + סביבות שונות.
- **השלכה:** כל שינוי התנהגותי באלגוריתם חייב בשני הצדדים (RULES §3).

## D-003 — מפתחות בצד לקוח / env של המשתמש
- **בחירה:** אין הטמעת סודות בקוד; מפתחות מ-localStorage או env של Vercel.
- **סיבה:** RULES §2 + אבטחה בסיסית.
- **השלכה:** proxies דקים בלבד (`/api/transcribe`, LLM proxy).

## D-004 — סוכן AI מאושר במסגרת v0.3.0
- **בחירה:** בניית סוכן + עורך CapCut-class אושרה במפורש ב-ROADMAP v0.3.0.
- **סיבה:** בקשת משתמש מפורשת מעבר ל-placeholder.
- **השלכה:** ממשיכים לפי `docs/GAP_MAP.md`; שירותים חדשים (Auth/Supabase וכו') עדיין דורשים אישור (RULES §7).

## D-005 — Graphify כניווט ברירת מחדל לסוכנים
- **בחירה:** `graphify-out/` משותף ב-Git; סוכנים מריצים query לפני חיפוש רחב.
- **סיבה:** המשכיות בין Cursor/Codex/Claude/Cowork בלי re-explore מלא.
- **השלכה:** אחרי שינוי קוד — `graphify update .`; לא commit ל-cost/cache/temp.

## D-006 — Continuity דרך Git בלבד
- **בחירה:** `.ai/*`, חוקי Cursor, skills/hooks של Graphify, ו-handoff — כולם בריפו.
- **סיבה:** מקור אמת אחד לכל הסוכנים והסביבות.
- **השלכה:** שיחות read-only לא מעדכנות continuity; אין deploy אוטומטי; אין Git הרסני.

## D-007 — התנהגות סוכן אחרי בחירת סקריפט
- **בחירה:** (1) `remove_silence` עם EDL קיים → within כברירת מחדל (רק `replace_all` מחליף); (2) `scriptToClips` סדרתי/forward בלי קפיצה גלובלית; (3) runtime חוסם לופי delete_clip/edit_subtitle ומפנה לכלים המוניים.
- **סיבה:** כשלים מצ'אט אמיתי — החלפת EDL מלאה, קפיצות ל־117s, עשרות מחיקות בודדות.
- **השלכה:** pipeline מומלץ: transcribe → keep_by_script → remove_silence(within) → transcribe_timeline → generate_subtitles(script).

## D-008 — רצועות וידאו מרובות + סוכן דרך EditorApi
- **בחירה:** (1) `clip.trackId` + N רצועות `type:"video"` (schema v5); (2) קומפוזיציה = cutaway (`flattenVideoTracks`, order גבוה מנצח) לנגן ולייצוא; (3) סוכן משנה פרויקט דרך `EditorApi`/`runCommand` עם `_editorDirty` (בלי History כפול), וכלים משני-state בסדר.
- **סיבה:** בקשת משתמש לרענון מיידי בעורך + מונטאז'/רצועות; AG-2 parity.
- **השלכה:** אודיו בזמן חפיפה מגיע מהרצועה המנצחת (לא A-roll שמור); PiP/שקיפות = החלטה נפרדת בעתיד.
