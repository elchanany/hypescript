# ACTIVE_WORK.md

## 2026-08-15 — CapCut-style 2D Drag Engine, Infinite Dynamic Tracks & Extended Full-Viewport Grid

- **CapCut-style 2D Free-Drag Engine (`Timeline.tsx`, `globals.css`)**:
  - Full 2D pointer tracking (horizontal across time + vertical across tracks/layers) on any clip or overlay drag.
  - Floating 2D ghost card with thumbnail/waveform, duration, and target track name badge with magnetic snap indicator (`🧲`).
  - Active target lane highlighting and visible landing preview box (`.tl-drop-box`) at snapped time position with exact clip duration width.
- **Infinite Dynamic Track Creation on Drag/Drop (`Timeline.tsx`, `page.tsx`)**:
  - Removed all arbitrary track/layer caps (unlimited video tracks and overlay rows).
  - Dynamic bottom new-track zone (`data-track-lane="__new_track__"`): dragging downward or dropping media automatically spawns a new video track dynamically on-the-fly (`createVideoTrack`).
- **Truly Infinite Grid Across Viewport & Zoom (`Timeline.tsx`, `globals.css`)**:
  - Set `visibleTotal = zoom < 1 ? total / Math.max(0.01, zoom) : total` and `min-width: 100%`.
  - Grid lines, ruler ticks, and lane background stretch seamlessly across 100% of viewport width and beyond at all zoom levels without dead black space on the right.
- **Global Tooltips (`GlobalTooltip.tsx`)**: Rendered through a top-level React portal at `z-index: 999999` with pointer-events pass-through, eliminating tooltip clipping underneath modal/dock layers.
- **Inline Composer Quotes & Mentions (`Chat.tsx`)**: Replaced top reference banners with inline badge pills (`[⏱️ 00:15 (15.00s)]`, `[@media:id "name"]`) inserted at cursor position and parsed accurately for the AI agent.
- **Aspect Ratio Picker & Video Transformations (`AspectRatioPicker.tsx`, `canvasCoords.ts`, `InspectorPanel.tsx`, `TopBar.tsx`)**:
  - Direct aspect ratio switcher (9:16 TikTok/Reels, 16:9 YouTube, 1:1 Instagram, 4:5, 4:3, 21:9) in TopBar and Project Inspector.
  - Video mirror flipping controls (↔ היפוך אופקי, ↕ היפוך אנכי) in Inspector and direct video controls.
  - Full AI Agent awareness: registered `canvas.setAspectRatio` command and `set_aspect_ratio` + `add_track` agent tools.
- **Verification**: 72 Vitest files / 554 tests passing (100% green), isolated Next.js multi-agent build (`agent-build.mjs`) passing with 45/45 static pages and clean TypeScript validation.

## 2026-08-13 — Rhea visual-system refactor

- הוחל בסיס shadcn Rhea על המוצר הקיים בלי לשנות נתיבים, API, הרשאות או לוגיקת עריכה.
- נוספה חוקת עיצוב מרכזית ב־`docs/DESIGN_SYSTEM.md`: Mauve חם, Indigo מאופק, סולם radius מצומצם, משטחים/צללים/מרווחים סמנטיים, Light + Dark ו־reduced motion.
- Geist הוא גופן ה־UI והקוד; כל ייבואי Lucide הוחלפו בשכבת Phosphor משותפת עם משקל, גודל ונגישות עקביים.
- הותקנו Skill רשמי של shadcn והגירת Base UI, ונוספו `components.json`, Tailwind/PostCSS וטוקני shadcn תואמי המערכת הקיימת.
- אימות: 62 קובצי Vitest / 481 בדיקות עברו (ללא שני קובצי עבודה לא־קשורים), `tsc` נקי, ו־production build מבודד בנה 41/41 מסלולים.

## 2026-08-13 — אימות על הקלטה אמיתית, תיקוני נגן, קטלוג יצירתי

**הרצה על שיעור אמיתי (355 שנ', WhatsApp דחוס).** שכבת המדידה עבדה: כיול נתן דיבור -21dB / רעש -39dB / הפרדה 17dB / `reliable=true`, פרופיל דיבור (שטיחות 0.126) נפרד היטב מרעש (0.338), 194/200 עמקים מתחת לסף, ומיקום הגבולות הזיז חותמות ב-45ms בחציון. ביצועים: מעטפת 383ms, כיול 205ms, סיווג 217 פערים 494ms.

**שכבת הסיווג לא אומתה.** אין תמלול (כל מפתחות ה-API ריקים), אז השתמשתי ב-VAD אנרגטי גס לניחוש גבולות המילים — כלומר סיווגתי פערים שאולי אינם פערים. המשתמש דחה את שלוש קבוצות הדגימה. שים לב: קבצי הדגימה היו *קולאז' אבחון* (5 רגעים מרוחקים מודבקים), וזה לא הוסבר טוב — הם נשמעו קפוצים כי כך נבנו, לא כי העריכה גרועה.

**`8a471ac` — מחלקת `speech_like`.** ההרצה האמיתית חשפה הנחה שנכונה רק על אות מסונתז: שכל פער הוא לא-דיבור. ASR אמיתי מפספס מילים, ואז הפער *מכיל דיבור* והמסווג היה חופשי לתייג אותו "שיעול" ולמחוק. עכשיו נבדק ראשון מול פרופיל הדיבור המכויל, ו-`isRemovable` תמיד false.

**`af97e2a` — שני באגים בנגן.** (א) ה-effect שמריץ `seekTo` היה תלוי בזהות מערך ה-EDL, לא בתוכן; כל רינדור מחדש של ההורה בנה מערך חדש עם אותו תוכן ו**עצר את הניגון** — זה ה"נתקע" האקראי. עכשיו חתימה מבנית. (ב) חיתוך לפי סקריפט מייצר עשרות קליפים מאותו מקור, והנגן החליף אלמנט וידאו בכל מעבר — פענוח כפול של אותו קובץ 45MB + seek קר בכל קאט. עכשיו קליפים רצופים מאותו מקור עושים דילוג במקום.

**`d3f199a` — קטלוג יצירתי** (`web/lib/creative/`): 52 לוקים, 57 מעברים (כל xfade), 18 תבניות טקסט. לכל פריט שני מימושים לפי חוזה `docs/CREATIVE_LIBRARY_ARCHITECTURE.md`. **כל מחרוזת פילטר הורצה מול FFmpeg אמיתי** — 52/52 אפקטים, 57/58 מעברים. שני ממצאים: `curves` עם רשימת נקודות דורש רווחים במרכאות (הוחלף ל-presets מובנים), ו-**`squeezev` מקריס את FFmpeg 8.0.1 ב-segfault בכל רזולוציה** — נחסם ב-`BLOCKED_XFADE` עם בדיקה שנכשלת אם מחזירים אותו. הקטלוג עדיין לא מחווט ל-UI/סוכן במכוון (הכלל "בלי כפתורים שמדמים עריכה").

**חסמים שנמצאו:**
- כל מפתחות ה-API ב-`web/.env.local` ריקים (GROQ / OPENAI / ANTHROPIC / GEMINI / DEEPSEEK). הסוכן והתמלול לא יכולים לרוץ מקומית.
- Vercel מסמן את המפתחות כ-Sensitive, ולכן `vercel env pull` מחזיר `[SENSITIVE]` — לא ניתן לשחזור בשום דרך, לפי תכנון.
- שלושה ערכי R2 מכילים את שם המפתח בתוך הערך (`R2_ACCOUNT_ID=R2_ACCOUNT_ID=...`) — העלאות לענן ייכשלו.

- אימות: 505 בדיקות web (64 קבצים), `tsc` נקי, production build עובר דרך `agent-build`; local 31 בדיקות.
- הבא: חיווט הקטלוג ל-CommandBus/סוכן (xfade ברנדר גרף + `effectId` על Clip); תמלול אמיתי כשיהיה מפתח, ואז ולידציה של הסיווג ופלט וידאו מלא.

## 2026-08-12 — ליבת חיתוך/כתוביות חדשה + שער קבלה (לא commited)

הפעלה אמיתית של המוצר נכשלה בארבע דרכים: נעלמו מילים מהטקסט שהלקוח ביקש, הקאטים לא נפלו בשקט, לא הייתה שום הבנה של צלילים שאינם דיבור, והכתוביות חזרו על מילים ונשברו באמצע צירופים. כל הארבעה תוקנו בשורש.

**מודולים חדשים (web):**
- `lib/align/hebrew.ts` — נרמול עברי + דמיון מדורג. קיפול פונטי (כ→ק, ט→ת, ש→ס, השמטת א/ע/ה ואמות קריאה פנימיות) מאחד את שתי טעויות ה-ASR שנצפו בפועל: `טיפרת`↔`תפארת`, `קשר`↔`כשר`. זיהוי אות שימוש (`ובמקום`↔`במקום`) כווריאציה ולא כמילה אחרת.
- `lib/align/globalAlign.ts` — Needleman–Wunsch עם פערים אפיניים (Gotoh) ועונשים א-סימטריים: דילוג ASR זול (-0.55/-0.03), דילוג סקריפט יקר (-3.2/-1.6), וזיווג מתחת לסף דמיון 0.62 **אסור** (FORBIDDEN=-1e5) — בלי זה האלגוריתם היה מצמיד מילה שלא נאמרה למילת ASR אקראית והדוח היה משקר. עוגני-ייחוד + LIS לקלט ארוך.
- `lib/audio/features.ts` — מעטפת RMS בחלונות 25ms/קפיצה 5ms (במקום 20ms בלי חפיפה), חלון Hann, רצפת רעש **נעה** (אחוזון 12 בחלון 3s), ZCR, ומאפיינים ספקטרליים לפי דרישה (FFT רדיקס-2: centroid/flatness/rolloff/יחסי פסים/attack/קצב אפנון).
- `lib/audio/nonSpeech.ts` — מסווג נשימה/כחכוח/חבטה-גרירת רהיט/צחוק בחברות טרפזית עם ביטחון. מתחת ל-0.55 או כשההפרש בין שני המועמדים <0.06 → `unknown_nonspeech`, לא ניחוש. תווית ספק תמיד גוברת.
- `lib/cut/boundaries.ts` — `refineOnset`/`refineOffset`/`findValley`/`chooseJoinPoint` עם אינטרפולציה תת-מסגרתית והרחבת "דיבור רך" (softMarginDb=3) שמגינה על עיצור שוקק ועל דעיכת סוף מילה.
- `lib/cut/scriptPlan.ts` — מתכנן יחיד שמחליף את הזוג `scriptToClips` + `tightSpeechFromWords` שעבדו זה נגד זה. שלושה presets: `broadcast` (0.85s), `natural` (0.42s), `tight` (0.16s). מחזיר `missingScript` מפורש.
- `lib/captions/segment.ts` + `fromScript.ts` — תכנות דינמי שממזער עלות משולבת (מספר מילים מול יעד 5, קצב קריאה ≤17 CPS, משך 1–5s, איכות נקודת שבירה). ניקוד שבירה דקדוקי: `BIND_NEXT` (בית/בן/רבי/של/את…) מונע `בית / אלהינו` ו-`רבי / יוחנן`; `BREAK_BEFORE` (אבל/כי/אז…) מעדיף שבירה לפני פסוקית. כל טוקן בכתובית אחת בדיוק ⇒ אפס חזרות מבנית.
- `lib/qa/editAudit.ts` — שער קבלה: כיסוי סקריפט, אינווריאנטות ציר, איכות מעברים מדודה, איכות כתוביות.
- `lib/audio/source.ts` — גשר דפדפן (ffmpeg.wasm → Web Audio → מעטפת), מטמון חסום ב-2 (דגימות של 10 דק' ≈ 38MB).

**שינויי סוכן:** `keep_by_script` עושה עכשיו יישור+הסרה+הידוק+מיקום מדויק בפעולה אחת (אין יותר `remove_silence` אחריו); `generate_subtitles` ברירת מחדל פעימות ללא חזרות (`reveal="progressive"` נשאר בבקשה מפורשת); כלי חדש `audit_edit`; `inspect_timeline_evidence(classify_sounds=true)`. SYSTEM_PROMPT נכתב מחדש כמבנה מדורג עם שלב 0 לסיווג הבריף לחמישה סוגים (הכשל שגרם להכנסת כותרות ו-CTA ל-keep_by_script) וכלל הכרעה: קטע הוא "טקסט מדובר" רק אם `find_in_transcript` מוצא אותו.

**Python parity (RULES §3):** `hebrew.py`, `align_global.py`, `captions.py` + 22 בדיקות. הליבה האקוסטית לא הועברה — ל-local אין numpy/librosa; מתועד ב-ARCHITECTURE.md.

**כיול עצמי — התשובה ל"איך זה יעבוד על כל סרטון":** `lib/audio/calibration.ts` מחליף כל סף מוחלט במיקום יחסי בהתפלגות של הקובץ עצמו. התיוג מגיע חינם מהתמלול: חלונות מילים = דיבור ודאי, אמצע פערים ארוכים = רעש הרקע האמיתי. סף הדיבור נגזר כ-`noise.p90 + 0.3·(speech.p10 − noise.p90)`; המסווג משווה שטיחות/יחסי-פסים/התקפה מול הפרופיל הספקטרלי של הדיבור *באותה* הקלטה (`percentileRank`). שלוש שכבות הגנה: כיול → נסיגה מוצהרת (`reliable=false`, ברירות מחדל שמרניות, דיווח למשתמש) → תיקון מבני (`repairedEdges`) שמבטיח שגבול לא חוצה מילה **גם אם הכיול נכשל לגמרי**.

**בידוד בילדים בין סוכנים:** `scripts/agent-build.mjs` — `distDir` נפרד לכל סוכן (דרך `HYPESCRIPT_NEXT_DIST_DIR` שכבר היה ב-next.config.js), רישום ב-`.ai/locks/builds.json` שמנוקה אוטומטית לפי חיות ה-pid, `--list` לפני הריגת תהליך, `--clean` שמדלג על תיקיות בשימוש. פרוטוקול ב-AGENTS.md. נכתב אחרי שני כשלים אמיתיים: ארבעה בילדים שנלחמו על `.next` ונתקעו, וסוכן (אני) שהרג בילד חי של סוכן אחר כי הסיק מדגימת mtime שהסשן מת.

- אימות: web 61 קבצים / 478 בדיקות, `tsc` נקי, production build עובר (דרך agent-build); local 31 בדיקות; graphify 2410 nodes / 5459 edges.
- `calibration.test.ts` מריץ את אותו תוכן בארבעה תנאי הקלטה (אולפן / אולם עם הד / טלפון עם המהום 50Hz / הקלטה חלשה) ומאמת: חיתוך זהה בכולם, סף נגזר ששונה ביניהם ביותר מ-10dB, ואי-חיתוך מילים גם עם סף אבסורדי של 60dB.
- לא נבדק: הרצה חיה עם וידאו אמיתי בדפדפן. כל האקוסטיקה נבדקה על אותות מסונתזים. הכיול נועד להסיר את התלות בכיוונון ידני לכל הקלטה, אבל זה טרם אומת על הקלטה אמיתית — זו מטרת ה-E2E הבא.
- הבא: E2E בדפדפן עם שיעור אמיתי (לאימות ההכללה, לא לכיוונון ידני); שקילת הסרת `scriptToClips`/`tightSpeechFromWords` הישנים אחרי שהחדשים יוכחו בשטח.

## 2026-08-10 — exported video in chat with custom player (main f233969)

- Manual render now auto-opens the chat dock and passes `exportResult` into Chat as `latestExport`, rendered as a pinned ChatMediaCard at the top of the message list. It survives dock close/reopen in-session because it is page-owned state (`exportResult` in page.tsx), not an ephemeral output item.
- ChatMediaCard video is now a custom player: play/pause (button + click video), seek slider, current/total time, mute toggle, fullscreen, error state; `controlsList=nodownload`; download anchor uses `safeDownloadName` (.mp4 sanitized) plus a "פתח בחלון חדש" fallback anchor (target=_blank rel=noopener).
- page.tsx URL lifecycle split: abort cleanup is unmount-only; previous export blob URL revoked when replaced, current on unmount — no premature revocation.
- New pure helpers `web/lib/render/videoCard.ts` (formatTime, safeDownloadName) + 7 tests.
- Verification: 54 files / 388 tests pass, `tsc` clean; production build passed in a temp worktree (primary `.next` locked by a running dev process, so build verified on an identical patched worktree); graphify 1978 nodes / 4420 edges.
- Agent artifact cards unchanged; no behavior change to cloud/local render paths. Pinned card is session-only (blob URL dies on full page reload — output items were always session-only).
- Next: browser E2E the pinned export player with a real render; fix production Supabase key before cloud org sync.

## 2026-08-10 — CTA asset pipeline: persisted narration + GPT images (main f72d88a + f368261)

- `generate_narration` now persists generated ElevenLabs audio into project media via `EditorApi.addMediaAsset` (no duplicate import, no array mutation) and returns a stable `@media:<id>` plus exact `add_clip` guidance: `timeline_start` = end of the current timeline (max across all tracks), audio track name, and a follow-up card/image exactly spanning the clip (`match_clip_id` from `list_clips`).
- New `openai-image` provider (kind `image`) reuses `OPENAI_API_KEY` with a distinct fail-closed billing approval (per-capability, not shared with LLM). `/api/openai/images` validates allowlisted gpt-image-1 parameters (model/size/quality/background, prompt ≤4000 chars), calls the official `images/generations` with `output_format=png` (gpt-image-1 has no `response_format`), decodes `data[0].b64_json`, and returns PNG bytes with secret-redacted Hebrew errors. No live key call was made.
- `generate_image` optionally appends a bounded binary-free brand brief (org/tagline/colors/writing guidelines only — never blobs/URLs/IDs), explicitly instructs not to draw a logo (real logo via `use_brand_asset`), registers the PNG into project media and returns `@media:<id>` + artifact.
- CTA system flow: new CTA text stays out of `keep_by_script`; brand assets first; exact audio/image/card span; composited verification (`capture_frame(timeline=true)`).
- Verification: narration branch 51 files / 351 tests + tsc/build pass; image branch 53 files / 381 tests + tsc/build pass (verified on main); native integrations still `durationDelta=0`/`audioDrift=0`; graphify 1851 nodes / 4186 edges; `npm audit` 8 existing vulns remain.
- Next: live browser E2E with a real lecture + ElevenLabs/OpenAI keys (composited capture/brand UI); fix production Supabase key before cloud org sync. No acoustic-quality claim without real media.

## 2026-08-10 — local organization/brand kit (main 7ab67e7)

- `/settings/brand` provides local-only IndexedDB organization/brand kits: org/name, tagline, writing guidelines, a normalized color picker palette, and logo/reference images with safe object URL cleanup; an active kit is selectable across projects.
- Agent `get_brand_kit` returns a binary-free summary only (no blobs reach the LLM). `use_brand_asset` imports the Blob through the explicit browser-only `EditorApi.addMediaAsset` boundary (not JSON CommandBus), then `logo_overlay` reuses the existing safe `overlay.addImage` path; `reference_media` imports only. Missing assets are never fabricated; duplicate imports are avoided.
- No cloud sync or new service; production Supabase auth key still broken.
- Verification: web 50 files / 342 tests pass, `tsc` clean; production build passed in the rebased isolated worktree including `/settings/brand` (a later primary invocation reached Next build start but timed out after 20m due environment/process contention — not claimed as passed); native render integration still `durationDelta=0`/`audioDrift=0`; graphify 1806 nodes / 4082 edges. `npm audit`: 8 existing vulnerabilities (3 moderate, 4 high, 1 critical), no audit fix applied.
- Next: browser E2E the brand UI / `use_brand_asset` and composited capture with real media; then complete the high-level CTA workflow (narration + image + popup) using existing generated media/audio/overlay boundaries and brand context, without fabricating assets.

## 2026-08-10 — gapless tight-cut pipeline

- Replaced transcript-only tight cutting with a hybrid: word timestamps protect speech, 20ms RMS windows place cuts in measured quiet valleys, and explicit provider `audio_event` still forces removal without inventing semantic labels from dB.
- Tight defaults are now 0.14s gap / 0.025s handles in web and local. Automatic results are repaired around whole spoken words and fail closed unless QA reports zero repeated source time, zero clipped words and zero invalid clips.
- Preview now keeps two media elements, preloads/seeks the next clip off-screen, swaps at the boundary, and observes playback each animation frame instead of relying on coarse `timeupdate` events.
- Export and local render use six-decimal half-open source ends and never extend a trim to the rounded CFR endpoint.
- Verification: web 47 files / 300 tests; local 9 tests; production build passed; native 20-cut content test proved 0 duration/audio drift, one-frame packet cadence, no silent joins, and the correct next-source tone after every join. Browser UI was auth-blocked, so real-session listening remains the acceptance step.

## 2026-08-09 — composited timeline frame capture (export-parity, opt-in)

- `main` ab2dcf1 + 58f39c6: `capture_frame` can now render an export-parity composited frame of the edited timeline. Explicit `timeline=true` (with an edited timeline) selects it; `timeline=false`, an explicit `source`, or an omitted `timeline` always stay on the fast raw source frame.
- Composited path reuses the export renderEDL flow: multi-track flatten/cutaway, active overlays, current styled caption, clip effects and export resolution; gaps and disabled clips render black. It renders a micro-segment, so it is slower by design and opt-in only.
- SYSTEM_PROMPT: after significant visual edits (overlay, cutaway, captions, color/flip/fades), verify once with `capture_frame(timeline=true)` at the changed point; no redundant or repeated captures.
- Verification: 47 files / 296 tests, `tsc` clean, production build passes; native export integration `durationDelta=0`/`audioDrift=0`; `graphify update .` → 1722 nodes / 3847 edges. Browser-live ffmpeg.wasm capture not yet manually E2E tested.
- Next product package (user-approved): local-first organization/brand kit — logos, colors picker, writing guidelines, reference images — selectable across projects and exposed safely to the agent, reusing the reliable mixed-media/logo agent workflow. IndexedDB first; cloud sync waits for working auth.

## 2026-08-09 — stable overlay identity, alpha preview and safe logo geometry

- Fixed the real multi-overlay Agent race: `add_image_overlay` is now one atomic command and never performs a stale second update against “the last overlay”. UI-facing EditorApi refs also advance synchronously across same-tick Agent commands.
- `list_overlays` exposes stable IDs; update/delete prefer `overlay_id` plus `expected_source`, reject mismatched assets, and refuse locked overlays. Agent rules prohibit touching an already-arranged end card or narration unless explicitly requested.
- Image natural dimensions are loaded before Agent placement. Shared geometry preserves aspect ratio, adds `fit_canvas`, and clamps UI/Agent move/resize inside the canvas.
- Removed the Preview checkerboard from transparent PNG overlays; alpha now reveals the underlying video, matching Export.
- Full verification: 46 files / 259 tests and production build pass. Browser QA confirmed transparent computed background, 3.5%/4.5% safe logo edges, preserved aspect ratio, and that adding a second image leaves the prior overlay geometry unchanged.

## 2026-08-08 — explicit logo workflow + designed cards

- Image insertion now has two named actions: full-frame timeline image versus timed logo/overlay. Image double-click chooses overlay; each media card also exposes both actions and a direct Agent mention button.
- An image accidentally inserted as a full-frame clip can be converted from Inspector into a small top-corner overlay without rebuilding the edit.
- Canvas overlays now have anchored corner resize, aspect-ratio preservation for images, layer badges, X/Y/W/H, quick top corners, corner radius, z-order and fade controls. Preview and FFmpeg Export share rounded images, text card borders/backgrounds/multiline content and overlay fades.
- The Agent resolves stable `@media:<id>` references, offers logo presets and source/speaker/dedication card presets, controls geometry/style/z/fades, and reports exact measured overlay state through `list_overlays`.
- Verification: 46 files / 256 tests pass, production build passes, and Browser QA confirmed styled dedication values, separate image actions, stable direct Agent mention and one-click 16%-width top-left logo placement. Final Graphify update and push remain.

## 2026-08-08 — mixed media + direct canvas UI package

- Preview now advances through full-frame image, video, gap and audio-only timelines; a dedicated audio track is synchronized during Preview and mixed during Export.
- `clip.add` accepts image clips on video tracks and audio clips on the audio track, including exact `timeline_start` insertion with split/gap behavior. Dragging an image onto a video lane therefore keeps it on that lane.
- Captions can be selected, edited and vertically repositioned on the canvas. Concurrent cues stack and receive an explicit overlap badge/style.
- Editor and Preview right-click use Hypescript context menus; shared buttons receive useful tooltips, including dynamically mounted controls.
- Text overlays support background + radius in Preview and Export. UI and Agent expose a real `source_popup` opening-title preset.
- Agent render includes the standalone audio track and returns its existing downloadable video/SRT/image/audio artifact cards.
- Verification: 45 test files / 251 tests passed before new regressions; focused new tests 37/37 passed; production build passed; Browser QA confirmed the popup control/tooltips and custom Preview context menu.
- Next: run final full suite after documentation, `graphify update .`, commit/push product package, then graph-only sync commit if needed.

## Current task
Continue the professional editor roadmap from a verified baseline: chat-first UX, measurable speech-boundary cuts, non-overlapping captions, dynamic timeline layers and cloud-safe product flows.

## Branch
`main`

## Status
- Executed rich Micro-UX & Delightful Interaction package:
  1. Interactive Keyboard Shortcuts Modal (`KeyboardShortcutsModal.tsx`) triggered by `Ctrl+K` or Command icon with category cards and clickable `<kbd>` badges.
  2. Live Audio Equalizer Visualizer (`audio-eq-bars`) bouncing dynamically during playback in `VideoPreview.tsx`.
  3. Quick Floating Canvas Action Toolbar (`canvas-quick-bar`) appearing over selected overlays/captions for 1-click control.
  4. Smart Prompt Suggestion Chips (`chat-mentions`) in `Chat.tsx` for instant action triggering.
- Full verification: `npx tsc --noEmit` passed with exit code 0 (clean, no errors), Vitest test suites pass, and graphify knowledge graph updated. Continues in continuous UI/UX iteration loop.

## 2026-08-12 — minimal brand mark refresh

- Replaced the glossy multi-detail mark with a flat squircle containing one rounded H/play glyph.
- Regenerated favicon, PWA, Apple, social, raster lockups and plan cards from the same geometry; the shared lockup now uses explicit readable typography at every size.
- Enlarged branding in the editor top bar, landing navigation/footer, auth, dashboard, account, settings and legal surfaces.
- Verification: 60 Vitest files / 464 tests pass, `tsc --noEmit` is clean, CSS parses, and the 16px favicon remains legible. Live Next browser QA was blocked at server startup by the existing shared workspace process contention.

## 2026-08-14 — approved Brain + Play raster brand rollout

- Adopted the approved raster master: two slim mirrored brain rails forming an H around an isolated rounded play triangle, on the existing navy surface.
- The deterministic Pillow pipeline now derives UI/PWA/favicon sizes, full-name light/dark lockups, social previews and Creator/Pro plan artwork from that single source.
- `BrandLogo` uses a lightweight 256px raster in compact UI and real raster wordmarks where width permits; the landing laptop, tablet, phone and video previews now show the same mark instead of placeholder letters/icons.
- Verification: focused brand tests (4/4), `tsc --noEmit`, isolated production build, and local Chrome screenshot of `/welcome` all pass.

## 2026-08-14 — Brain+Play theme and account language foundation

- Replaced remaining purple/indigo product accents with the approved navy, smoky-blue, turquoise, mint and lime semantic palette across editor, auth, account, marketing and brand-preset surfaces.
- Added Hebrew-default locale negotiation for Hebrew, English, Arabic, Russian and Hindi: an explicit/profile choice wins, then browser language, Vercel country header, and finally Hebrew. Only the derived locale is stored; no raw IP is retained.
- Added account address preference (`male`, `female`, `plural`, `unspecified`) with plural/neutral fallback, persisted in Supabase and exposed during onboarding and account settings.
- Localized onboarding, account preferences, sign-in, cookie consent and the editor top bar; remaining product surfaces must move into the same typed catalog before claiming complete five-language coverage.
- Supabase migration `locale_address_preferences` applied and schema verified. Verification: 10 focused tests plus the new locale normalization test, `tsc --noEmit`, isolated production build, and Playwright HE/EN/AR/RU/HI direction/auth checks.
