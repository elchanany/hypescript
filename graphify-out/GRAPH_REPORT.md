# Graph Report - workspace  (2026-08-04)

## Corpus Check
- 182 files · ~109,053 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1298 nodes · 2556 edges · 95 communities (77 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69fbc204`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- agent/types.ts
- app/page.tsx
- graph.ts
- Timeline.tsx
- subtitlesEdl.ts
- dependencies
- HypescriptGUI
- tools.ts
- transcription.py
- compilerOptions
- editing.py
- media.py
- providers.ts
- thumbnails.ts
- run
- MediaAsset
- כל קבוצות ההרשאות ומה הן עושות
- What You Must Do When Invoked
- subtitles.py
- Clip
- canvasCoords.ts
- History
- RenderBackend.ts
- toast.ts
- transcribe/route.ts
- What You Must Do When Invoked
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- Chat.tsx
- settings/page.tsx
- AGENTS.md — נקודת הכניסה לכל סוכן
- HANDOFF
- graph.integration.test.ts
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- collapseTools.ts
- DECISIONS.md — החלטות עמידות
- WORKFLOW.md — זרימת עבודה משותפת לכל סוכן
- ACTIVE_WORK.md
- PROJECT_STATE.md — מצב יציב של hypescript
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- ui.tsx
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native AGENTS.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- hypescript — עורך אוטומטי לסרטוני שיעורים בעברית
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .agents/skills/graphify/references/extraction-spec.md
- graphify
- .claude/skills/graphify/references/extraction-spec.md
- handoff.md
- dashboard/page.tsx
- EditorApi
- ffmpeg.ts
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- captionBurn.ts
- AGENTS.md
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
- graphify reference: extra exports and benchmark
- EDITOR_FEATURE_MATRIX
- GAP_MAP — מצב אמת מול חזון "CapCut מקצועי + סוכן AI"
- RULES.md — חוקים מחייבים
- Render engine — join fix + RenderBackend seam + native plan
- DATA_MODEL
- PROVIDER_CAPABILITY_MATRIX
- hypescript web
- ARCHITECTURE.md — מבנה המערכת
- graphify reference: query, path, explain
- ISSUES לפי עדיפות
- SECURITY_MODEL
- PRODUCT_VISION.md — חזון המוצר
- hypescript
- ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap
- ROADMAP.md — שלבים וגרסאות
- UI_GUIDELINES.md — עקרונות ממשק
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- AGENT_UI_PARITY
- STACK.md — טכנולוגיות
- ToolRail.tsx
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- history.ts
- .codex/skills/graphify/references/extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 44 edges
2. `Clip` - 37 edges
3. `Overlay` - 31 edges
4. `HypescriptGUI` - 27 edges
5. `uid()` - 25 edges
6. `MediaAsset` - 24 edges
7. `run()` - 23 edges
8. `CanvasSize` - 23 edges
9. `Sub` - 23 edges
10. `כל קבוצות ההרשאות ומה הן עושות` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `DragState` --references--> `Overlay`  [EXTRACTED]
  web/components/PreviewOverlays.tsx → web/lib/editor/overlay.ts
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts
- `NormalizedTranscript` --references--> `Word`  [EXTRACTED]
  web/lib/elevenlabs/normalize.ts → web/lib/models.ts
- `write_cut_log()` --calls--> `kept_duration()`  [EXTRACTED]
  local/hypescript/cli.py → local/hypescript/editing.py

## Import Cycles
- None detected.

## Communities (95 total, 18 thin omitted)

### Community 0 - "agent/types.ts"
Cohesion: 0.12
Nodes (18): SlashCmd, Conversation, CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), AgentEvents, AgentRunner, MODE_PROMPTS (+10 more)

### Community 1 - "app/page.tsx"
Cohesion: 0.20
Nodes (26): download(), EditorPage(), kindOf(), probeDuration(), PreviewHandle, VideoPreview, useEditor(), MediaKind (+18 more)

### Community 2 - "graph.ts"
Cohesion: 0.15
Nodes (18): clipEnabled(), mediaById(), aChain(), buildConcatGraph(), DEFAULT_TARGET, ext(), RenderGraph, RenderGraphOpts (+10 more)

### Community 3 - "Timeline.tsx"
Cohesion: 0.12
Nodes (27): ClipInspector(), InspectorPanel(), KIND, num(), OverlayInspector(), SOURCE_COLORS, Timeline(), TYPE_ICON (+19 more)

### Community 4 - "subtitlesEdl.ts"
Cohesion: 0.07
Nodes (46): findRanges(), FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals() (+38 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (36): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @supabase/supabase-js, @types/node (+28 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "tools.ts"
Cohesion: 0.05
Nodes (55): clipsSummary(), fetchTranscribeConfigured(), fmt(), mainVideo(), readTranscribeModelPref(), readTranscribePref(), Reporter, resolveSttChoice() (+47 more)

### Community 8 - "transcription.py"
Cohesion: 0.11
Nodes (32): is_speech_word(), מבני נתונים משותפים לכל שלבי ה-pipeline. חשוב: שני מנועי התמלול (מקומי וענן)…, מילה בודדת עם חותמות זמן (בשניות, על ציר הזמן המקורי של הווידאו)., מילת דיבור בלבד — ללא רווחים/אירועי שמע., קטע דיבור (משפט/שורה) כפי שהחזיר מנוע התמלול, מכיל את המילים שלו., כל המילים מכל הקטעים, ממוינות לפי זמן התחלה., Segment, speech_words() (+24 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, ES2020, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.test.ts, **/*.ts (+20 more)

### Community 10 - "editing.py"
Cohesion: 0.12
Nodes (24): build_keep_intervals(), filler_mask(), filter_words_by_script(), kept_duration(), _merge_overlaps(), normalize_hebrew(), parse_fillers(), KeepInterval (+16 more)

### Community 11 - "media.py"
Cohesion: 0.15
Nodes (25): check_ffmpeg(), _concat_copy(), _concat_reencode(), concat_videos(), concat_with_intro_outro(), extract_audio(), ffmpeg_path(), ffprobe_path() (+17 more)

### Community 12 - "providers.ts"
Cohesion: 0.18
Nodes (18): maxDuration, POST(), runtime, anthropicParts(), asText(), callAnthropic(), callGemini(), callOpenAICompat() (+10 more)

### Community 13 - "thumbnails.ts"
Cohesion: 0.16
Nodes (19): Filmstrip(), Waveform(), cache, filmstripCount(), fp(), getSource(), getThumbnail(), seek() (+11 more)

### Community 14 - "run"
Cohesion: 0.18
Nodes (17): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+9 more)

### Community 15 - "MediaAsset"
Cohesion: 0.19
Nodes (9): CORNERS, DragState, Handle, PreviewOverlays(), Props, MediaAsset, overlayVisibleAt(), fmtDur() (+1 more)

### Community 16 - "כל קבוצות ההרשאות ומה הן עושות"
Cohesion: 0.05
Nodes (38): Ads Engine, Audio Isolation, Audio Native, Dubbing, ElevenAgents, Forced Alignment, History, Models (+30 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.19
Nodes (13): build_cues(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), KeepInterval, Word, יצירת קובץ SRT מסונכרן, על ציר-הזמן של הסרטון *הערוך* (אחרי החיתוכים). נקודה… (+5 more)

### Community 19 - "Clip"
Cohesion: 0.18
Nodes (27): ChatProps, Props, Props, Props, EditorSnapshot, Updater, AgentContext, CanvasSize (+19 more)

### Community 20 - "canvasCoords.ts"
Cohesion: 0.29
Nodes (11): defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect, rotatePoint() (+3 more)

### Community 22 - "RenderBackend.ts"
Cohesion: 0.20
Nodes (5): browserBackend, BrowserRenderBackend, ExecutionMode, RenderBackend, RenderCapabilities

### Community 23 - "toast.ts"
Cohesion: 0.16
Nodes (15): metadata, ChunkReload(), isChunkError(), ICONS, ToastHost(), dismissToast(), emit(), items (+7 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.07
Nodes (41): GET(), runtime, GET(), runtime, maxDuration, POST(), runtime, GET() (+33 more)

### Community 25 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "Chat.tsx"
Cohesion: 0.16
Nodes (25): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+17 more)

### Community 32 - "settings/page.tsx"
Cohesion: 0.18
Nodes (19): SettingsPage(), GROQ_KEY, OPENAI_KEY, PROVIDER_PREF, TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF, ApiConfigShape, flattenApiConfig() (+11 more)

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.22
Nodes (9): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+1 more)

### Community 34 - "HANDOFF"
Cohesion: 0.33
Nodes (5): Current State (verified), Exact Next Steps, Goal, HANDOFF, Risks

### Community 35 - "graph.integration.test.ts"
Cohesion: 0.29
Nodes (5): astream(), fmtDur(), probe(), vPackets(), vstream()

### Community 36 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 37 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 38 - "collapseTools.ts"
Cohesion: 0.36
Nodes (6): collapseConsecutiveTools(), CollapsedToolView, CollapsibleTool, mergeToolState(), toolGroupSummary(), toolGroupTitle()

### Community 39 - "DECISIONS.md — החלטות עמידות"
Cohesion: 0.25
Nodes (7): D-001 — עיבוד וידאו מקומי, לא בשרת, D-002 — ליבה משוכפלת web/local, D-003 — מפתחות בצד לקוח / env של המשתמש, D-004 — סוכן AI מאושר במסגרת v0.3.0, D-005 — Graphify כניווט ברירת מחדל לסוכנים, D-006 — Continuity דרך Git בלבד, DECISIONS.md — החלטות עמידות

### Community 40 - "WORKFLOW.md — זרימת עבודה משותפת לכל סוכן"
Cohesion: 0.25
Nodes (7): Git בטוח, Graphify, WORKFLOW.md — זרימת עבודה משותפת לכל סוכן, אחרי שינויים רלוונטיים, בזמן מימוש, לפני עבודה מהותית, שיחות קריאה בלבד

### Community 41 - "ACTIVE_WORK.md"
Cohesion: 0.29
Nodes (5): Branch, Current task, Exact continuation point, Latest commit, Status

### Community 42 - "PROJECT_STATE.md — מצב יציב של hypescript"
Cohesion: 0.29
Nodes (6): PROJECT_STATE.md — מצב יציב של hypescript, ארכיטקטורה יציבה, גרסאות, יכולות יציבות שעובדות, מגבלות ידועות, מה המוצר

### Community 43 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 44 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 45 - "ui.tsx"
Cohesion: 0.13
Nodes (20): CaptionsPanel(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, TextPanel() (+12 more)

### Community 46 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 47 - "graphify reference: commit hook and native AGENTS.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native AGENTS.md integration, graphify reference: commit hook and native AGENTS.md integration

### Community 48 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 49 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 50 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 51 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 52 - "hypescript — עורך אוטומטי לסרטוני שיעורים בעברית"
Cohesion: 0.09
Nodes (22): 1. השג מפתח (Groq, חינם), 2. הרצה — התרחיש המרכזי, hypescript — עורך אוטומטי לסרטוני שיעורים בעברית, איך זה עובד (למתעניינים), אינטרו/אאוטרו וכללי, דוגמאות נוספות, דרישות מוקדמות, התקנה (+14 more)

### Community 61 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (18): DashboardPage(), DialogState, fmtDate(), fmtRelativeHe(), ProjectCard(), userAvatarUrl(), userLabel(), ConfirmDialog() (+10 more)

### Community 63 - "ffmpeg.ts"
Cohesion: 0.30
Nodes (14): extOf(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame(), ffQueue, getFFmpeg(), LogFn (+6 more)

### Community 64 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.14
Nodes (13): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), `No API key found in request` / כתובת עם `/rest/v1/auth/...`, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה, מה תצטרך לפני שמתחילים (5 דקות הכנה), פתרון תקלות (+5 more)

### Community 65 - "captionBurn.ts"
Cohesion: 0.33
Nodes (10): captionStyleToCss(), DEFAULT_CAPTION_STYLE, normalizeCaptionStyle(), CaptionLayout, captionLayoutForTarget(), captionYFraction(), materializeCaptions(), renderCaptionPng() (+2 more)

### Community 67 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

### Community 68 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 69 - "EDITOR_FEATURE_MATRIX"
Cohesion: 0.22
Nodes (8): Agent, EDITOR_FEATURE_MATRIX, Inspector, Timeline, אודיו / כתוביות, ייצוא (verified), מעטפת עורך (Editor shell), נגן / Canvas

### Community 70 - "GAP_MAP — מצב אמת מול חזון "CapCut מקצועי + סוכן AI""
Cohesion: 0.22
Nodes (9): 1. Editor shell, 2. Canvas / Direct manipulation, 3. Timeline, 4. Text / Captions / Images / Logos / Overlays, 5. Agent workspace, 6. Project / Auth / Dashboard, 7. Providers, 8–9. Templates / Effects / Usage / Admin (+1 more)

### Community 71 - "RULES.md — חוקים מחייבים"
Cohesion: 0.22
Nodes (9): 1. פרטיות — הווידאו לא עוזב את המחשב, 2. חינמי ו-open-source בלבד, 3. סנכרון ליבה בין שתי האפליקציות, 4. הפרדת אפליקציות, 5. סוכן AI — מחוץ לטווח עד אישור, 6. עברית ו-RTL, 7. אין מערכות לא-מאושרות, 8. תיעוד החלטות (+1 more)

### Community 72 - "Render engine — join fix + RenderBackend seam + native plan"
Cohesion: 0.25
Nodes (7): 1. The export stall — root cause & fix (VERIFIED), 2. RenderBackend seam (shipped), 3. LocalNativeRenderBackend — file plan (next package, not built), 4. Remaining roadmap (staged, per the spec — not started), Old vs new (per segment), Render engine — join fix + RenderBackend seam + native plan, Verification — measured, not asserted on a string

### Community 73 - "DATA_MODEL"
Cohesion: 0.29
Nodes (6): DATA_MODEL, מגבלות מודל שיש להרחיב (חבילות הבאות), מודל יעד (Supabase Postgres — חבילת מעטפת מוצר B/6, לא ממומש), מודל פרויקט בפועל (`lib/editor/`), מיגרציה מהמצב הנוכחי, מצב נוכחי (client-first, אמת)

### Community 74 - "PROVIDER_CAPABILITY_MATRIX"
Cohesion: 0.29
Nodes (6): Image / Video / Voice / Music / Storage / Search / Fonts / Icons / Templates, LLM (Agent), Missing-key policy, PROVIDER_CAPABILITY_MATRIX, ארכיטקטורה נוכחית (אמת), תמלול

### Community 75 - "hypescript web"
Cohesion: 0.29
Nodes (6): hypescript web, איך זה עובד (ארכיטקטורה), הרצה מקומית, מבנה, מגבלות v1, פריסה ב-Vercel

### Community 76 - "ARCHITECTURE.md — מבנה המערכת"
Cohesion: 0.33
Nodes (6): ARCHITECTURE.md — מבנה המערכת, החלטת מפתח: למה ffmpeg.wasm ולא עיבוד בשרת, זרימת נתונים (local), זרימת נתונים (web), מה שטרם הוחלט, שתי אפליקציות, ליבה משותפת

### Community 77 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 78 - "ISSUES לפי עדיפות"
Cohesion: 0.33
Nodes (5): ISSUES לפי עדיפות, P0, P1, P2 (הבא), P3

### Community 79 - "SECURITY_MODEL"
Cohesion: 0.33
Nodes (5): Agent, SECURITY_MODEL, מצב נוכחי (אמת) ופערים ידועים, נתונים, עקרונות

### Community 80 - "PRODUCT_VISION.md — חזון המוצר"
Cohesion: 0.33
Nodes (6): PRODUCT_VISION.md — חזון המוצר, הבעיה, החוויה, המוצר, לאן זה הולך, למי

### Community 81 - "hypescript"
Cohesion: 0.40
Nodes (5): hypescript, איך מריצים, בהמשך, מבנה, תיעוד הפרויקט

### Community 82 - "ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap"
Cohesion: 0.40
Nodes (5): ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap, איך פותחים גרסה חדשה, גבול בין שלבים — לא לזלוג קדימה, מתי פיצ'ר "מוכן", שינוי היקף

### Community 83 - "ROADMAP.md — שלבים וגרסאות"
Cohesion: 0.40
Nodes (5): ROADMAP.md — שלבים וגרסאות, ✅ v0.1.0 — קיים (הגרסה הפעילה), 🔜 v0.2.0 — ליטוש ה-web לרמת production, 🧠 v0.3.0 — סוכן AI + עורך בסגנון CapCut (אושר מפורשות, בעבודה), 🎯 v1.0.0 — יציב ושמיש

### Community 84 - "UI_GUIDELINES.md — עקרונות ממשק"
Cohesion: 0.40
Nodes (5): UI_GUIDELINES.md — עקרונות ממשק, מה שטרם הוחלט, נגישות, עקרונות, שפה חזותית (קיים)

### Community 85 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 86 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 87 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 88 - "AGENT_UI_PARITY"
Cohesion: 0.50
Nodes (3): AGENT_UI_PARITY, מקרא, פערי Parity מיידיים (לחבילה הבאה)

### Community 89 - "STACK.md — טכנולוגיות"
Cohesion: 0.50
Nodes (4): local/, STACK.md — טכנולוגיות, web/ (המסלול המרכזי), עתידי / אפשרי (טרם הוחלט)

### Community 90 - "ToolRail.tsx"
Cohesion: 0.50
Nodes (3): LeftTab, TABS, ToolRail()

## Knowledge Gaps
- **443 isolated node(s):** `track-edit.sh script`, `runtime`, `maxDuration`, `runtime`, `runtime` (+438 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Clip` connect `Clip` to `app/page.tsx`, `graph.ts`, `Timeline.tsx`, `subtitlesEdl.ts`, `graph.integration.test.ts`, `tools.ts`, `MediaAsset`, `RenderBackend.ts`, `ffmpeg.ts`, `EditorApi`, `Chat.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `MediaAsset` connect `MediaAsset` to `app/page.tsx`, `graph.ts`, `Timeline.tsx`, `graph.integration.test.ts`, `tools.ts`, `ui.tsx`, `Clip`, `RenderBackend.ts`, `ffmpeg.ts`, `EditorApi`, `Chat.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Overlay` connect `Clip` to `graph.ts`, `Timeline.tsx`, `tools.ts`, `MediaAsset`, `RenderBackend.ts`, `ffmpeg.ts`, `EditorApi`, `Chat.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `track-edit.sh script`, `runtime`, `maxDuration` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `agent/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._
- **Should `graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._
- **Should `Timeline.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12299465240641712 - nodes in this community are weakly interconnected._