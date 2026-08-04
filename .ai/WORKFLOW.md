# WORKFLOW.md — זרימת עבודה משותפת לכל סוכן

> מקור האמת המשותף ל-Cursor Local, Cursor Cloud, Codex, Claude Code, Cowork וסוכנים עתידיים.
> קבצי אפליקציה + `.ai/` + Graphify חייבים לתאר את **אותו** snapshot של הריפו.

## לפני עבודה מהותית

1. קרא `AGENTS.md` → `RULES.md` → `.ai/HANDOFF.md` → `.ai/ACTIVE_WORK.md`.
2. בדוק מצב Git: branch, status, diff רלוונטי. שמור על שינויים לא-קשורים.
3. לשאלות קוד/ארכיטקטורה: הרץ `graphify query "<שאלה>"` לפני חיפוש רחב בקבצים.
4. אמת את הקבצים האמיתיים לפני עריכה (אל תסמוך רק על הגרף או על ה-handoff).
5. פיצ'ר חדש? בדוק שהוא בגרסה הפעילה ב-`ROADMAP.md`. שינוי אלגוריתם ליבה? עדכן גם `web/lib` וגם `local/hypescript` (RULES §3).

## בזמן מימוש

- פתרון קטן, שלם וניתן לתחזוקה. אל תחליש בדיקות, ולידציה, אבטחה, נגישות או שלמות נתונים.
- אל תשנה התנהגות אפליקציה רק כדי לעדכן תיעוד/המשכיות.
- אל תבצע deploy אוטומטי, force-push, מחיקת branches, או overwrite להיסטוריית `main`.
- אל תשמור סודות, טוקנים, מפתחות, ערכי env פרטיים או נתוני ייצור בקבצי continuity.

## אחרי שינויים רלוונטיים

שינוי רלוונטי = קוד מקור, בדיקות, סכמות, מיגרציות, תלויות, build/CI, קונפיגורציית runtime, או התנהגות deploy/מוצר.

1. הרץ אימות מתאים (`web`: `npm test` / `npm run lint` / `npm run build` לפי הצורך; `local`: בדיקות/syntax רלוונטיים).
2. `graphify update .` (AST בלבד, בלי עלות API).
3. עדכן `.ai/HANDOFF.md` לפני התשובה הסופית (החלף מידע מיושן; מתחת ל-800 מילים).
4. עדכן `.ai/ACTIVE_WORK.md` עם task/branch/commit/status/נקודת המשך.
5. עדכן `.ai/PROJECT_STATE.md` רק אם יכולות/מגבלות יציבות השתנו.
6. עדכן `.ai/DECISIONS.md` רק להחלטות עמידות (ארכיטקטורה, אבטחה, API, מודל נתונים, deploy, workflow).
7. Commit יחד: שינויי אפליקציה + בדיקות/תיעוד + continuity + Graphify שצריך לשתף. Push לענף העבודה.

## שיחות קריאה בלבד

אם לא שינית קבצים רלוונטיים — אל תעדכן continuity, אל תריץ `graphify update`, ואל תיצור commit רק בשביל timestamp.

## Graphify

- ניווט: `graphify query` / `path` / `explain`. אל תטען את כל `graph.json` לקונטקסט.
- אחרי שינוי קוד: `graphify update .`.
- אל תבצע rebuild מלא אלא אם הגרף חסר/פגום או שהמשתמש ביקש.
- אל תכניס ל-Git: `cost.json`, `cache/`, קבצי `.graphify_*` זמניים, secrets.

## Git בטוח

- עבוד על feature branch (`cursor/<name>-…`) אלא אם התבקש אחרת.
- שמור על עקביות: handoff/graph לא יתארו קוד שלא קיים באותו branch.
- אין merge ל-`main` בלי אישור מפורש (חוץ ממשימות bootstrap שמורות שבהן המשתמש ביקש במפורש זמינות על default branch).
