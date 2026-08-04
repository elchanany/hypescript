# Graph Report - workspace  (2026-08-04)

## Corpus Check
- 184 files · ~112,430 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1327 nodes · 2653 edges · 95 communities (78 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e9dea0f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- agent/types.ts
- commands.ts
- graph.ts
- time.ts
- tools.ts
- dependencies
- HypescriptGUI
- ui.tsx
- transcription.py
- compilerOptions
- editing.py
- media.py
- providers.ts
- thumbnails.ts
- run
- Clip
- useAuth.ts
- What You Must Do When Invoked
- subtitles.py
- project.ts
- canvasCoords.ts
- History
- BrowserRenderBackend
- toast.ts
- transcribe/route.ts
- chatStore.ts
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
- DECISIONS.md — החלטות עמידות
- WORKFLOW.md — זרימת עבודה משותפת לכל סוכן
- ACTIVE_WORK.md
- PROJECT_STATE.md — מצב יציב של hypescript
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- subtitlesEdl.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native AGENTS.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- כל קבוצות ההרשאות ומה הן עושות
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .agents/skills/graphify/references/extraction-spec.md
- graphify
- .claude/skills/graphify/references/extraction-spec.md
- handoff.md
- app/page.tsx
- What You Must Do When Invoked
- hypescript — עורך אוטומטי לסרטוני שיעורים בעברית
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- model.ts
- ffmpeg.ts
- AGENTS.md
- KeepInterval
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
- VideoPreview.tsx
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
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .codex/skills/graphify/references/extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 45 edges
2. `Clip` - 38 edges
3. `Overlay` - 31 edges
4. `HypescriptGUI` - 27 edges
5. `uid()` - 26 edges
6. `MediaAsset` - 24 edges
7. `run()` - 23 edges
8. `CanvasSize` - 23 edges
9. `clipDur()` - 23 edges
10. `Sub` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts
- `scriptToClips()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editor/scriptClips.ts → web/lib/align.ts
- `toEditedWords()` --indirect_call--> `isSpeechWord()`  [INFERRED]
  web/lib/subtitles.ts → web/lib/models.ts
- `run()` --calls--> `build_keep_intervals()`  [EXTRACTED]
  local/hypescript/cli.py → local/hypescript/editing.py

## Import Cycles
- None detected.

## Communities (95 total, 17 thin omitted)

### Community 0 - "agent/types.ts"
Cohesion: 0.13
Nodes (12): SlashCmd, Conversation, CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), AgentRunner, AgentMode, AgentResponse (+4 more)

### Community 1 - "commands.ts"
Cohesion: 0.10
Nodes (8): CommandDef, CommandId, EditorApi, listCommands(), ProjectQuery, queryProject(), registry, runCommand()

### Community 2 - "graph.ts"
Cohesion: 0.16
Nodes (16): mediaById(), aChain(), buildConcatGraph(), ext(), RenderGraph, RenderGraphOpts, renderSegments(), RenderTarget (+8 more)

### Community 3 - "time.ts"
Cohesion: 0.15
Nodes (21): ClipInspector(), InspectorPanel(), TimelineToolbar(), clampTime(), clampZoom(), formatQuoteTime(), formatTimecode(), MS (+13 more)

### Community 4 - "tools.ts"
Cohesion: 0.06
Nodes (36): AgentEvents, clipsSummary(), fetchTranscribeConfigured(), fmt(), mainVideo(), MODE_PROMPTS, readTranscribeModelPref(), readTranscribePref() (+28 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (36): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @supabase/supabase-js, @types/node (+28 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "ui.tsx"
Cohesion: 0.13
Nodes (19): CaptionsPanel(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, TextPanel() (+11 more)

### Community 8 - "transcription.py"
Cohesion: 0.14
Nodes (25): קטע דיבור (משפט/שורה) כפי שהחזיר מנוע התמלול, מכיל את המילים שלו., Segment, Transcript, _cloud_payload_to_transcript(), _elevenlabs_payload_to_transcript(), _load_dotenv(), _post_elevenlabs_stt(), _post_transcription() (+17 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, ES2020, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.test.ts, **/*.ts (+20 more)

### Community 10 - "editing.py"
Cohesion: 0.13
Nodes (19): filler_mask(), filter_words_by_script(), normalize_hebrew(), parse_fillers(), Word, לוגיקת העריכה: מ-word timestamps אל רשימת קטעים לשמירה (KeepInterval). שני…, נרמול לצורך השוואה: הסרת ניקוד/פיסוק ואיחוד אותיות סופיות., כמו :func:`filter_words_by_script` אבל מחזיר מסכה בוליאנית מקבילה ל-``words``.… (+11 more)

### Community 11 - "media.py"
Cohesion: 0.15
Nodes (25): check_ffmpeg(), _concat_copy(), _concat_reencode(), concat_videos(), concat_with_intro_outro(), extract_audio(), ffmpeg_path(), ffprobe_path() (+17 more)

### Community 12 - "providers.ts"
Cohesion: 0.15
Nodes (22): maxDuration, POST(), runtime, GET(), runtime, anthropicParts(), asText(), callAnthropic() (+14 more)

### Community 13 - "thumbnails.ts"
Cohesion: 0.16
Nodes (19): Filmstrip(), Waveform(), cache, filmstripCount(), fp(), getSource(), getThumbnail(), seek() (+11 more)

### Community 14 - "run"
Cohesion: 0.18
Nodes (18): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+10 more)

### Community 15 - "Clip"
Cohesion: 0.17
Nodes (26): ChatProps, Props, CORNERS, DragState, Handle, Props, Props, SOURCE_COLORS (+18 more)

### Community 16 - "useAuth.ts"
Cohesion: 0.30
Nodes (9): AuthCallbackPage(), LoginPage(), TopBar(), getSupabasePublicConfig(), isAuthConfigured(), normalizeSupabaseUrl(), getSupabaseBrowser(), AuthState (+1 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.17
Nodes (20): CaptionMode, build_cues(), _ends_phrase(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), _phrase_blocks() (+12 more)

### Community 19 - "project.ts"
Cohesion: 0.22
Nodes (12): Updater, useEditor(), createHistory(), migrateState(), captionLocked(), captionTrack(), DEFAULT_CANVAS, defaultTracks() (+4 more)

### Community 20 - "canvasCoords.ts"
Cohesion: 0.24
Nodes (13): PreviewOverlays(), defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect (+5 more)

### Community 23 - "toast.ts"
Cohesion: 0.16
Nodes (15): metadata, ChunkReload(), isChunkError(), ICONS, ToastHost(), dismissToast(), emit(), items (+7 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.09
Nodes (36): GET(), runtime, maxDuration, POST(), runtime, GET(), runtime, maxDuration (+28 more)

### Community 25 - "chatStore.ts"
Cohesion: 0.36
Nodes (10): addConversation(), ChatItem, ChatStoreV2, emptyConversation(), emptyStore(), isPlaceholderTitle(), migrateChatStore(), newId() (+2 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "Chat.tsx"
Cohesion: 0.16
Nodes (18): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+10 more)

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

### Community 45 - "subtitlesEdl.ts"
Cohesion: 0.07
Nodes (48): findRanges(), FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals() (+40 more)

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

### Community 52 - "כל קבוצות ההרשאות ומה הן עושות"
Cohesion: 0.05
Nodes (38): Ads Engine, Audio Isolation, Audio Native, Dubbing, ElevenAgents, Forced Alignment, History, Models (+30 more)

### Community 61 - "app/page.tsx"
Cohesion: 0.07
Nodes (76): DashboardPage(), DialogState, fmtDate(), ProjectCard(), userAvatarUrl(), userLabel(), download(), EditorPage() (+68 more)

### Community 62 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 63 - "hypescript — עורך אוטומטי לסרטוני שיעורים בעברית"
Cohesion: 0.09
Nodes (22): 1. השג מפתח (Groq, חינם), 2. הרצה — התרחיש המרכזי, hypescript — עורך אוטומטי לסרטוני שיעורים בעברית, איך זה עובד (למתעניינים), אינטרו/אאוטרו וכללי, דוגמאות נוספות, דרישות מוקדמות, התקנה (+14 more)

### Community 65 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.14
Nodes (13): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), `No API key found in request` / כתובת עם `/rest/v1/auth/...`, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה, מה תצטרך לפני שמתחילים (5 דקות הכנה), פתרון תקלות (+5 more)

### Community 66 - "model.ts"
Cohesion: 0.16
Nodes (6): KIND, num(), OverlayInspector(), clipVolume(), OverlayKind, VisualTransform

### Community 67 - "ffmpeg.ts"
Cohesion: 0.20
Nodes (17): extOf(), extractAssembledAudio(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame(), ffQueue, getFFmpeg() (+9 more)

### Community 69 - "KeepInterval"
Cohesion: 0.21
Nodes (11): build_keep_intervals(), _merge_overlaps(), KeepInterval, בונה קטעים לשמירה מתוך המילים. שני מקורות לחיתוך, מטופלים באופן אחיד: *…, ממזג קטעים חופפים/נוגעים (יכול לקרות אם threshold < 2*padding)., קטע יחיד המכסה את כל הסרטון (כשלא מבצעים הסרת שתיקות)., מחשב את הקטעים שהוסרו (המשלים של keeps בתוך [0, duration])., removed_intervals() (+3 more)

### Community 70 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

### Community 72 - "VideoPreview.tsx"
Cohesion: 0.24
Nodes (11): captionStyleToCss(), DEFAULT_CAPTION_STYLE, normalizeCaptionStyle(), CaptionLayout, captionLayoutForTarget(), captionYFraction(), materializeCaptions(), renderCaptionPng() (+3 more)

### Community 73 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 74 - "EDITOR_FEATURE_MATRIX"
Cohesion: 0.22
Nodes (8): Agent, EDITOR_FEATURE_MATRIX, Inspector, Timeline, אודיו / כתוביות, ייצוא (verified), מעטפת עורך (Editor shell), נגן / Canvas

### Community 75 - "GAP_MAP — מצב אמת מול חזון "CapCut מקצועי + סוכן AI""
Cohesion: 0.22
Nodes (9): 1. Editor shell, 2. Canvas / Direct manipulation, 3. Timeline, 4. Text / Captions / Images / Logos / Overlays, 5. Agent workspace, 6. Project / Auth / Dashboard, 7. Providers, 8–9. Templates / Effects / Usage / Admin (+1 more)

### Community 76 - "RULES.md — חוקים מחייבים"
Cohesion: 0.22
Nodes (9): 1. פרטיות — הווידאו לא עוזב את המחשב, 2. חינמי ו-open-source בלבד, 3. סנכרון ליבה בין שתי האפליקציות, 4. הפרדת אפליקציות, 5. סוכן AI — מחוץ לטווח עד אישור, 6. עברית ו-RTL, 7. אין מערכות לא-מאושרות, 8. תיעוד החלטות (+1 more)

### Community 77 - "Render engine — join fix + RenderBackend seam + native plan"
Cohesion: 0.25
Nodes (7): 1. The export stall — root cause & fix (VERIFIED), 2. RenderBackend seam (shipped), 3. LocalNativeRenderBackend — file plan (next package, not built), 4. Remaining roadmap (staged, per the spec — not started), Old vs new (per segment), Render engine — join fix + RenderBackend seam + native plan, Verification — measured, not asserted on a string

### Community 78 - "DATA_MODEL"
Cohesion: 0.29
Nodes (6): DATA_MODEL, מגבלות מודל שיש להרחיב (חבילות הבאות), מודל יעד (Supabase Postgres — חבילת מעטפת מוצר B/6, לא ממומש), מודל פרויקט בפועל (`lib/editor/`), מיגרציה מהמצב הנוכחי, מצב נוכחי (client-first, אמת)

### Community 79 - "PROVIDER_CAPABILITY_MATRIX"
Cohesion: 0.29
Nodes (6): Image / Video / Voice / Music / Storage / Search / Fonts / Icons / Templates, LLM (Agent), Missing-key policy, PROVIDER_CAPABILITY_MATRIX, ארכיטקטורה נוכחית (אמת), תמלול

### Community 80 - "hypescript web"
Cohesion: 0.29
Nodes (6): hypescript web, איך זה עובד (ארכיטקטורה), הרצה מקומית, מבנה, מגבלות v1, פריסה ב-Vercel

### Community 81 - "ARCHITECTURE.md — מבנה המערכת"
Cohesion: 0.33
Nodes (6): ARCHITECTURE.md — מבנה המערכת, החלטת מפתח: למה ffmpeg.wasm ולא עיבוד בשרת, זרימת נתונים (local), זרימת נתונים (web), מה שטרם הוחלט, שתי אפליקציות, ליבה משותפת

### Community 82 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 83 - "ISSUES לפי עדיפות"
Cohesion: 0.33
Nodes (5): ISSUES לפי עדיפות, P0, P1, P2 (הבא), P3

### Community 84 - "SECURITY_MODEL"
Cohesion: 0.33
Nodes (5): Agent, SECURITY_MODEL, מצב נוכחי (אמת) ופערים ידועים, נתונים, עקרונות

### Community 85 - "PRODUCT_VISION.md — חזון המוצר"
Cohesion: 0.33
Nodes (6): PRODUCT_VISION.md — חזון המוצר, הבעיה, החוויה, המוצר, לאן זה הולך, למי

### Community 86 - "hypescript"
Cohesion: 0.40
Nodes (5): hypescript, איך מריצים, בהמשך, מבנה, תיעוד הפרויקט

### Community 87 - "ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap"
Cohesion: 0.40
Nodes (5): ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap, איך פותחים גרסה חדשה, גבול בין שלבים — לא לזלוג קדימה, מתי פיצ'ר "מוכן", שינוי היקף

### Community 88 - "ROADMAP.md — שלבים וגרסאות"
Cohesion: 0.40
Nodes (5): ROADMAP.md — שלבים וגרסאות, ✅ v0.1.0 — קיים (הגרסה הפעילה), 🔜 v0.2.0 — ליטוש ה-web לרמת production, 🧠 v0.3.0 — סוכן AI + עורך בסגנון CapCut (אושר מפורשות, בעבודה), 🎯 v1.0.0 — יציב ושמיש

### Community 89 - "UI_GUIDELINES.md — עקרונות ממשק"
Cohesion: 0.40
Nodes (5): UI_GUIDELINES.md — עקרונות ממשק, מה שטרם הוחלט, נגישות, עקרונות, שפה חזותית (קיים)

### Community 90 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 91 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 92 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 93 - "AGENT_UI_PARITY"
Cohesion: 0.50
Nodes (3): AGENT_UI_PARITY, מקרא, פערי Parity מיידיים (לחבילה הבאה)

### Community 94 - "STACK.md — טכנולוגיות"
Cohesion: 0.50
Nodes (4): local/, STACK.md — טכנולוגיות, web/ (המסלול המרכזי), עתידי / אפשרי (טרם הוחלט)

## Knowledge Gaps
- **447 isolated node(s):** `track-edit.sh script`, `runtime`, `maxDuration`, `runtime`, `runtime` (+442 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Clip` connect `Clip` to `commands.ts`, `model.ts`, `ffmpeg.ts`, `tools.ts`, `graph.ts`, `graph.integration.test.ts`, `VideoPreview.tsx`, `subtitlesEdl.ts`, `project.ts`, `app/page.tsx`, `Chat.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `EditorPage()` connect `app/page.tsx` to `commands.ts`, `graph.ts`, `subtitlesEdl.ts`, `Clip`, `project.ts`, `canvasCoords.ts`, `transcribe/route.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `MediaAsset` connect `Clip` to `commands.ts`, `model.ts`, `ffmpeg.ts`, `tools.ts`, `graph.ts`, `graph.integration.test.ts`, `ui.tsx`, `VideoPreview.tsx`, `app/page.tsx`, `Chat.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `track-edit.sh script`, `runtime`, `maxDuration` to the rest of the system?**
  _447 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `agent/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `tools.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059506531204644414 - nodes in this community are weakly interconnected._