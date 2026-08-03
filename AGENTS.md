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

## Cursor Cloud specific instructions

סביבת ה-VM כבר כוללת את הכלים הדרושים: Node 22, Python 3.12, ו-FFmpeg/FFprobe ב-PATH.
סקריפט העדכון (רץ אוטומטית בכל הפעלה) מתקין את התלויות: `npm install` ב-`web/`, ויוצר
venv ב-`local/.venv` עם `local/requirements.txt`. אין Docker/DB. פרטים והערות לא-מובנות:

### web/ (המסלול המרכזי — Next.js)
- הרצה/בנייה/בדיקות/lint: דרך הסקריפטים ב-`web/package.json` (`dev`,`build`,`test`,`lint`).
  שרת הפיתוח: `npm run dev` (מתוך `web/`) → http://localhost:3000. בדיקות: `npm test` (Vitest).
- **`npm run lint` נכשל אינטראקטיבית**: אין קובץ תצורת ESLint ב-repo, ולכן `next lint`
  פותח שאלון הגדרה אינטראקטיבי. אימות טיפוסים כן רץ כחלק מ-`npm run build` ("checking
  validity of types"). אל תריץ `npm run lint` בסביבה לא-אינטראקטיבית — הוא ייתקע.
- **מפתחות API לא נדרשים לעריכה/ייצוא**: כל זרימת העריכה (טעינת וידאו, פיצול/גזירה,
  ייצוא MP4) רצה 100% בדפדפן דרך ffmpeg.wasm — בלי מפתח. רק **התמלול** (`/api/transcribe`)
  דורש `GROQ_API_KEY`. באנר אדום "GROQ_API_KEY לא מוגדר" הוא **מידע בלבד** (מגיע מ-
  `/api/config`) ואינו חוסם עריכה/ייצוא. כדי להסתירו בדמו אפשר להריץ עם `GROQ_API_KEY`
  כלשהו בסביבה.
- **גוצ'ה — רינדור ראשון איטי**: הייצוא הראשון אחרי טעינת עמוד איטי (טעינת ליבת
  ffmpeg.wash ה"קרה", יכול לקחת כמה דקות ב-VM); ייצואים נוספים באותה טעינה מהירים
  (שניות). אל תרענן את העמוד לפני ייצוא אם רוצים מהירות, וחכה בסבלנות לרינדור הראשון.

### local/ (כלי Python CLI/GUI)
- הרצה תמיד **מתוך `local/`** (או עם PYTHONPATH מתאים) — למשל
  `local/.venv/bin/python -m hypescript <video> ...`. הרצה מתיקייה אחרת נכשלת ב-
  `No module named hypescript`. נתיבי קלט/פלט יכולים להיות מוחלטים.
- E2E מלא אופליין דורש קובץ עם **דיבור אמיתי** (ה-CLI נכשל אם התמלול לא מחזיר מילים).
  `--engine local --model tiny` מוריד את המודל בהרצה הראשונה (דורש רשת פעם אחת), ואז רץ
  על CPU בלי מפתח. מצב ענן (`--engine cloud`, ברירת מחדל) דורש `GROQ_API_KEY`/`OPENAI_API_KEY`.
- ה-GUI (`python -m hypescript.gui`) הוא Tkinter (חלון דסקטופ) — לא נחוץ לבדיקות CLI.
