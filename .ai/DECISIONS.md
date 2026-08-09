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
- **השלכה:** אודיו בזמן חפיפה מגיע מהרצועה המנצחת (לא A-roll שמור); clip opacity מיושם מול שחור באופן זהה בנגן ובייצוא. PiP/alpha שמגלה רצועה תחתונה נשאר compositor עתידי.

## D-009 — Commit אטומי לכלי workflow
- **בחירה:** חישובי keep/remove/filter/generate/import נשארים פונקציות וכלים ייעודיים; החלת EDL/כתוביות מלאה נעשית דרך `clip.replaceAll` ו-`subtitle.replaceAll` עם אימות collection לפני mutation.
- **סיבה:** כלי bulk צריכים Undo/checkpoint יחיד ונתיב state זהה לעורך, בלי להפוך את CommandBus למנוע ניתוח.
- **השלכה:** `setClips`/יצירה וייבוא מלא של כתוביות בסוכן אינם כותבים עוד ישירות ל-EditorApi; fallback מקומי נשמר רק כשאין גשר עורך.

## D-010 — חיתוכים שנוצרים אוטומטית: סופיים, חיוביים, source-non-overlapping
- **בחירה:** חיתוכים הנוצרים מאותו מקור חייבים להיות סופיים (finite), חיוביים (`end > start`) וללא חפיפות; נורמליזציה/הידוק חפיפות נעשים **בגבולות ה-generation** (בסוף `scriptToClips`/`snapSpeechToWords`), לא גלובלית על כל הרצועה.
- **סיבה:** חפיפת ASR נסבלת (~150ms) גרמה להשמעה כפולה של הברות גבול במעבר בין קליפים; נורמליזציה גלובלית הייתה חוסמת חזרות ידניות מכוונות.
- **השלכה:** `scriptToClips` מהדק חפיפה נסבלת ל-`lastEndTime` ודוחה שארית קצרה מ-`minClipSec`; `snapSpeechToWords` מאחד מקטעים חופפים מאותו מקור אחרי snap+pad. חזרות מכוונות שהמשתמש מכניס ידנית נשארות אפשריות.

## D-011 — הבנת timeline מבוססת ראיות בלבד
- **בחירה:** מקטע semantic מקבל תווית speech רק ממילת תמלול, audio-event רק מ-`audio_event` של הספק, ו-gap רק מקליפ gap מפורש. היעדר תמלול אינו שקט; dB הוא ראיית אנרגיה בלבד.
- **סיבה:** אין למנוע דרך להבדיל אמינה בין נשימה, שיעול, צחוק, רעש או דיבור שלא תומלל בלי ראיית ספק/מודל ייעודית.
- **השלכה:** כלי הסוכן שומר תוויות ספק verbatim ומצהיר על גבול הראיה; סיווג אנרגיה עתידי יישאר נפרד מסיווג סמנטי.

## D-012 — איזון כתובית יתומה רק בגבול תקציב רך
- **בחירה:** כשפיצול לפי תקציב תווים בלבד יוצר 3+1 מילים, מילה מתוזמנת אחת עוברת מהקבוצה הקודמת כדי ליצור 2+2, ורק אם שתי הקבוצות עומדות בתקציב. פאוזה ופיסוק הם גבולות קשיחים.
- **סיבה:** מילה בודדת בסוף רצף עברי רציף קשה לקריאה, אבל חיבור מעבר לפאוזה/סוף משפט פוגע במשמעות.
- **השלכה:** אותה פונקציית איזון קיימת ב-web/local; זמני מילים והיישור לסקריפט אינם משתנים.

## D-013 — Energy evidence נפרד מ-semantic evidence
- **בחירה:** RMS/dBFS ממופה בחלונות לזמן הערוך ומסווג רק `low`/`elevated` ביחס ל-`floorDb + 6dB`; המדידה היא opt-in בכלי agent. חלונות רציפים באותה רמה מתאחדים, אבל לא מעבר לקפיצת source או gap.
- **סיבה:** עוצמה היא ראיה מדידה ושימושית לעריכה, אך אינה מזהה את מקור הצליל.
- **השלכה:** web מפיק פרופיל בפועל דרך `analyzeAudio`; local מספק mapper מקביל לנתוני dB אך טרם מחבר extractor ב-CLI. התוצאה לעולם אינה מקבלת תווית נשימה/שיעול/שקט.

## D-014 — תוצר בינארי מחוץ להיסטוריית כלי ה-LLM
- **בחירה:** כלי מחזיר `ToolOutcome { text, artifacts }`; ה-runtime מכניס להיסטוריית הספק רק `text` ומעביר כל `Blob` ישירות ל-Chat דרך `onArtifact`. Blob זהה נפלט פעם אחת בכל השלמת כלי.
- **סיבה:** Blob אינו חוזה JSON, אסור לשלוח אותו לספק, ונתיבי callback/auto-download מקבילים יצרו סיכון לכרטיסים או הורדות כפולים.
- **השלכה:** render, SRT, frame, narration ואודיו זמני משתמשים באותו boundary; output cards נשארים מקומיים ולא נשמרים בין sessions כי object URLs אינם durable.

## D-015 — פילטר ראשון רק כשיש Preview/Export שקולים
- **בחירה:** תיקוני הצבע הראשונים הם contrast (0.5..2) ו-saturation (0..3), שממופים ישירות ל-CSS ול-FFmpeg `eq`. Brightness לא נכלל כי הסקאלה האדיטיבית של FFmpeg אינה שקולה ל-multiplier של CSS.
- **סיבה:** פילטר שמופיע רק בתצוגה או רק בייצוא מפר את חוזה המוצר; parity חשוב יותר ממספר סליידרים.
- **השלכה:** השדות אופציונליים עם default 1, עוברים split/Undo/CommandBus/Agent, ומופעלים לפני yuv conversion. Presets, keyframes ויתר effects נשארים P3 עתידי.

## D-016 — Presets הם נתונים, לא מסלול אפקט נוסף
- **בחירה:** neutral/crisp/vivid/muted/mono מוגדרים ברג'יסטרי אחד כזוגות contrast/saturation; Inspector וה-Agent פותרים מאותו registry.
- **סיבה:** preset אינו צריך לייצר state או render path נפרד, אחרת Preview/Export ו-UI/Agent יכולים לסטות.
- **השלכה:** `custom` מחושב לתצוגה בלבד; בחירת preset כותבת את שני הערכים הקנוניים ומיד משתמשת בצינור הצבע הקיים.

## D-017 — חיתוך פרסומי היברידי: מילה מגינה, גל-קול ממקם
- **בחירה:** `remove_silence` משתמש בחותמות word-level להגנת תוכן וב-RMS של 20ms כדי למקם את החיתוך בעמק השקט האמיתי. `tight` חותך מפער 0.14s עם handles של 0.025s; `audio_event` מפורש עדיין מכריח גבול. dB הוא מדידה בלבד ואינו מקבל תווית "נשימה". web/local שומרים parity.
- **סיבה:** `timeupdate`/ASR בלבד השאירו נשימות או חתכו פונמות, ו-padding/EDL חופף החזיר source-time שכבר הושמע. קצב פרסומי דורש גם גל מדוד וגם הגנה קשיחה על המילה.
- **השלכה:** אחרי כל חיתוך אוטומטי מורחבים קצוות שחוצים מילה, מתבצעת נורמליזציה, ו-QA נכשל סגור אם קיימים source overlap, מילה חתוכה או קליפ לא תקין. חזרות ידניות נשארות אפשריות.

## D-023 — Preview רציף עם media כפול ובקרת גבול פריים
- **בחירה:** הנגן מכין את הקליפ הבא באלמנט מדיה נסתר ומחליף בין שני אלמנטים; בזמן נגינה גבול הקליפ נבדק בכל animation frame ולא רק ב-`timeupdate`.
- **סיבה:** טעינת `src`/seek בזמן המעבר יצרה עצירה, ו-`timeupdate` גס אפשר לנגן לעבור את נקודת החיתוך לפני ההחלפה.
- **השלכה:** playback אינו תלוי בטעינת המדיה בצומת. Export נשאר filter graph רציף יחיד, ושני הנתיבים משתמשים בגבולות source חצי-פתוחים ללא הארכת סוף.

## D-018 — תמונה מלאה ולוגו הם שתי פעולות נפרדות
- **בחירה:** הוספת תמונה לציר יוצרת פריים מלא; הוספת לוגו יוצרת overlay מתוזמן. לחיצה כפולה על תמונה ב-Media מעדיפה overlay, וה-Inspector יכול להמיר קליפ תמונה קיים ללוגו קטן.
- **סיבה:** אותה פעולת `add_clip` יצרה בתרחיש אמיתי תמונה גדולה שכיסתה את הווידאו, הסתירה את מודל השכבות והפנתה את הסוכן לכלי fade של קליפ במקום לכלי overlay.
- **השלכה:** UI וה-Agent משתמשים בחוזה מפורש; overlay מדווח ומאפשר x/y/w/h/z/radius/fades, וה-Preview והייצוא חייבים להישאר שקולים.

## D-019 — אזכור מדיה לסוכן משתמש במזהה יציב
- **בחירה:** token של נכס הוא `@media:<assetId>` בעוד שם הקובץ נשאר תווית למשתמש.
- **סיבה:** שמות עם רווחים נשברו ב-composer וקבצים חדשים לא היו קלים לציטוט.
- **השלכה:** כל כרטיס מדיה מספק כפתור @ ישיר; resolver מקבל את ה-token היציב וגם חיפוש שמי ישן לתאימות.

## D-020 — שכבות סוכן מזוהות לפי ID ונוצרות אטומית
- **בחירה:** הוספת שכבת תמונה היא CommandBus יחיד עם `overlayId`, preset, גאומטריה, fade והגנה; עדכון/מחיקה משתמשים ב-`overlay_id` וב-`expected_source`, לא באינדקס משתנה.
- **סיבה:** snapshot React ישן גרם לעדכון השני שאחרי add לפגוע בשכבה הקודמת, בעוד דיווחי delete/update הציגו state ישן והובילו את המודל ללולאות מחיקה ובנייה מחדש.
- **השלכה:** שכבה חדשה אינה משנה קיימות; mismatch בשם הנכס נכשל סגור; שכבה נעולה מוגנת; רשימת שכבות מציגה ID קבוע.

## D-021 — שקיפות וגאומטריית תמונה זהות לתוצר
- **בחירה:** Preview אינו מצייר checkerboard בתוך הסרטון; PNG alpha חושף את הווידאו. UI/Agent/CommandBus חולקים חישוב יחס-מקור ו-clamp לקנבס; `fit_canvas` מכיל תמונת סיום בלי crop.
- **סיבה:** checkerboard עיצובי נראה כתוכן סופי, ומידות fallback ריבועיות חתכו לוגו רחב או אפשרו מרכז מחוץ לקנבס.
- **השלכה:** לוגו נשמר כולו בגבולות וביחס הנכון; Export ממשיך להשתמש באלפא המקורית; הזזה/resize אינם יכולים להשאיר שכבה חצויה מחוץ לפריים.
## D-022 — אימות ויזואלי: פריים מורכב opt-in בלבד, שקול לייצוא
- **בחירה:** `capture_frame` יודע לצלם פריים מורכב של הציר הערוך (multi-track flatten/cutaway, אובריי פעילים, סגנון כתוביות נוכחי, אפקטי קליפ, רזולוציית ייצוא; רווחים = שחור) — **רק** עם `timeline=true` מפורש ועם ציר ערוך קיים. `timeline=false`, `source` מפורש או השמטת `timeline` נשארים בפריים הגולמי המהיר מהמקור, שהוא ברירת המחדל.
- **סיבה:** הרינדור המורכב מרנדר מיקרו-קטע ולכן איטי יותר; צריך לאמת בו שינוי ויזואלי משמעותי בלבד (אובריי, cutaway, כתוביות, צבע/flip/fades), פעם אחת לכל נקודה שהשתנתה, בלי צילומים חוזרים מיותרים.
- **השלכה:** SYSTEM_PROMPT מחייב את הסוכן לאמת שינויים משמעותיים בלי צילומים מיותרים; הפריים אמור להראות בדיוק מה שייצא ב-render. כל נתיב אחר (גולמי/ברירת מחדל) נשאר זול ומהיר.
# 2026-08-08 — media placement and Preview/Export parity

- An image may be either a sequential full-frame video-track clip or a timed canvas overlay. The caller must choose; UI labels and Agent `placement` make the distinction explicit.
- Standalone audio lives on `trk_audio` as sequential clips. Exact late placement is represented by an explicit gap so Preview, Timeline and Export have the same time model.
- `timeline_start` insertion splits a source clip when necessary; it never creates overlapping/repeated source-time boundaries on one sequential track.
- Opening source attribution is a text overlay preset, not a separate mock component: background, radius, transform and timing are materialized to PNG for FFmpeg export.
- Multiple simultaneous captions remain legal but must be surfaced through stacking, warning styling and an on-canvas overlap badge.
