# Graph Report - hipescript  (2026-08-10)

## Corpus Check
- 240 files · ~446,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1732 nodes · 3873 edges · 117 communities (98 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5a36e115`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- thumbnails.ts
- runtime.ts
- timelineFrame.ts
- app/page.tsx
- commands.ts
- dependencies
- HypescriptGUI
- time.ts
- transcription.py
- compilerOptions
- editing.py
- media.py
- 20260804170000_pkg_a_foundation.sql
- BrandLogo.tsx
- run
- EditorPage
- tools.ts
- What You Must Do When Invoked
- subtitles.py
- clipFilter.ts
- models.ts
- History
- settings/page.tsx
- subtitlesEdl.ts
- transcribe/route.ts
- clipDur
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- dashboard/page.tsx
- canvasCoords.ts
- AGENTS.md — נקודת הכניסה לכל סוכן
- HANDOFF.md
- semanticTimeline.ts
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- כל קבוצות ההרשאות ומה הן עושות
- DECISIONS.md — החלטות עמידות
- WORKFLOW.md — זרימת עבודה משותפת לכל סוכן
- ACTIVE_WORK.md
- PROJECT_STATE.md — מצב יציב של hypescript
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- What You Must Do When Invoked
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
- model.ts
- Word
- storage.ts
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- tests/__init__.py
- AGENTS.md
- Clip
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
- project.ts
- KeepInterval
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
- GAP_MAP.md
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
- projects/types.ts
- toast.ts
- providers.ts
- loopGuard.test.ts
- useAuth
- Chat.tsx
- commands.builtin.ts
- Hypescript — Brand Guidelines
- ffmpeg.ts
- ChatMarkdown.tsx
- ChatMediaCard.tsx
- BrowserRenderBackend
- subtitles.ts
- config.ts
- normalizeSupabaseUrl
- agent/types.ts
- login/page.tsx
- providers/policy.ts
- graph.integration.test.ts
- colorPresets.ts
- chunking.ts

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 52 edges
2. `Clip` - 50 edges
3. `Overlay` - 35 edges
4. `ensureBuiltinCommands()` - 34 edges
5. `clipDur()` - 33 edges
6. `isGapClip()` - 33 edges
7. `EditorApi` - 30 edges
8. `Sub` - 30 edges
9. `uid()` - 29 edges
10. `Chat()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `HebrewCaptionGroupingTests` --uses--> `Word`  [INFERRED]
  local/tests/test_subtitles.py → local/hypescript/models.py
- `Conversation` --references--> `ChatMessage`  [EXTRACTED]
  web/lib/agent/chatStore.ts → web/lib/agent/types.ts
- `ensureTrackId()` --calls--> `primaryVideoTrackId()`  [EXTRACTED]
  web/lib/agent/tools.ts → web/lib/editor/project.ts
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts

## Import Cycles
- None detected.

## Communities (117 total, 19 thin omitted)

### Community 0 - "thumbnails.ts"
Cohesion: 0.10
Nodes (29): Filmstrip(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, Waveform() (+21 more)

### Community 1 - "runtime.ts"
Cohesion: 0.13
Nodes (16): AgentEvents, AgentRunner, formatLlmError(), formatToolError(), isChunkLoadError(), LOOP_GUARDS, MUTATING_TOOLS, normalizeToolResult() (+8 more)

### Community 2 - "timelineFrame.ts"
Cohesion: 0.16
Nodes (17): audioFadeFactor, edgeFadeFactor(), previewAudioGain(), buildMicroEdl(), clampTimelineAt(), fadeLevelAt(), MICRO_WINDOW_SEC, MicroEdlOptions (+9 more)

### Community 3 - "app/page.tsx"
Cohesion: 0.10
Nodes (27): COMMAND_ICONS, download(), kindOf(), probeDuration(), CaptionsPanel(), TextPanel(), LeftTab, TABS (+19 more)

### Community 4 - "commands.ts"
Cohesion: 0.09
Nodes (22): AGENT_COMMANDS, arr, bool, CommandContext, CommandDef, CommandId, CommandPermission, CommandPresentation (+14 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @supabase/ssr, @supabase/supabase-js (+30 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "time.ts"
Cohesion: 0.12
Nodes (30): InspectorPanel(), num(), OverlayInspector(), SubInspector(), titleFor(), TimelineToolbar(), clampTime(), clampZoom() (+22 more)

### Community 8 - "transcription.py"
Cohesion: 0.14
Nodes (25): קטע דיבור (משפט/שורה) כפי שהחזיר מנוע התמלול, מכיל את המילים שלו., Segment, Transcript, _cloud_payload_to_transcript(), _elevenlabs_payload_to_transcript(), _load_dotenv(), _post_elevenlabs_stt(), _post_transcription() (+17 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, ES2020, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.test.ts, **/*.ts (+20 more)

### Community 10 - "editing.py"
Cohesion: 0.23
Nodes (12): filler_mask(), filter_words_by_script(), normalize_hebrew(), parse_fillers(), Word, לוגיקת העריכה: מ-word timestamps אל רשימת קטעים לשמירה (KeepInterval). שני…, נרמול לצורך השוואה: הסרת ניקוד/פיסוק ואיחוד אותיות סופיות., כמו :func:`filter_words_by_script` אבל מחזיר מסכה בוליאנית מקבילה ל-``words``.… (+4 more)

### Community 11 - "media.py"
Cohesion: 0.14
Nodes (27): analyze_audio_energy(), check_ffmpeg(), _concat_copy(), _concat_reencode(), concat_videos(), concat_with_intro_outro(), extract_audio(), ffmpeg_path() (+19 more)

### Community 12 - "20260804170000_pkg_a_foundation.sql"
Cohesion: 0.14
Nodes (20): auth.users, public.handle_new_user, public.protect_system_owner, public.protect_system_owner_role, on_auth_user_created, public.audit_logs, public.credit_accounts, public.has_permission() (+12 more)

### Community 13 - "BrandLogo.tsx"
Cohesion: 0.14
Nodes (17): metadata, viewport, BrandLogo(), Props, ChunkReload(), isChunkError(), BRAND_NAME, BRAND_NAME_HE (+9 more)

### Community 14 - "run"
Cohesion: 0.14
Nodes (23): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+15 more)

### Community 15 - "EditorPage"
Cohesion: 0.16
Nodes (5): EditorPage(), EditorApi, queryProject(), inferArgs(), listRunnableCommands()

### Community 16 - "tools.ts"
Cohesion: 0.07
Nodes (33): captureFrameMode, clipsSummary(), dispatch(), ensureTrackId(), fetchTranscribeConfigured(), fmt(), mainVideo(), overlayTarget() (+25 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.15
Nodes (23): CaptionMode, build_cues(), _ends_phrase(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), _phrase_blocks() (+15 more)

### Community 19 - "clipFilter.ts"
Cohesion: 0.21
Nodes (16): auditCutQuality(), deleteClipRange(), deleteClipsAt(), intersectClipsWithSpeech(), keepSourceRange(), mergeOverlappingSameSource(), normalizeGeneratedCuts(), protectSpokenWordEdges() (+8 more)

### Community 20 - "models.ts"
Cohesion: 0.12
Nodes (22): findRanges(), FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals() (+14 more)

### Community 22 - "settings/page.tsx"
Cohesion: 0.17
Nodes (21): SettingsPage(), GROQ_KEY, OPENAI_KEY, PROVIDER_PREF, TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF, ApiConfigShape, flattenApiConfig() (+13 more)

### Community 23 - "subtitlesEdl.ts"
Cohesion: 0.16
Nodes (24): assembleTranscript(), assembledWords(), CaptionBuildOpts, CaptionMode, collapseProgressiveForBurn(), edlToCues(), edlToCuesWithScript(), edlToSrt() (+16 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.13
Nodes (25): GET(), runtime, maxDuration, POST(), runtime, GET(), runtime, maxDuration (+17 more)

### Community 25 - "clipDur"
Cohesion: 0.21
Nodes (16): assembledDuration(), AssembleOpts, formatTranscriptLines(), assembledStart(), clipDur(), buildTimelineEnergyEvidence(), buildTimelineEvidence(), closeGap() (+8 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "dashboard/page.tsx"
Cohesion: 0.14
Nodes (20): DashboardPage(), DialogState, fmtDate(), fmtRelativeHe(), ProjectCard(), userAvatarUrl(), userLabel(), ConfirmDialog() (+12 more)

### Community 32 - "canvasCoords.ts"
Cohesion: 0.29
Nodes (11): defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect, rotatePoint() (+3 more)

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.22
Nodes (9): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+1 more)

### Community 34 - "HANDOFF.md"
Cohesion: 0.33
Nodes (5): Active Files, Current State, Exact Next Steps, Goal, Verification

### Community 35 - "semanticTimeline.ts"
Cohesion: 0.14
Nodes (15): analyzeAudio(), avgDb(), cache, EnergyProfile, findSilences(), fp(), WordsBySource, TightSpeechOpts (+7 more)

### Community 36 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 37 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 38 - "כל קבוצות ההרשאות ומה הן עושות"
Cohesion: 0.05
Nodes (38): Ads Engine, Audio Isolation, Audio Native, Dubbing, ElevenAgents, Forced Alignment, History, Models (+30 more)

### Community 39 - "DECISIONS.md — החלטות עמידות"
Cohesion: 0.08
Nodes (25): 2026-08-08 — media placement and Preview/Export parity, D-001 — עיבוד וידאו מקומי, לא בשרת, D-002 — ליבה משוכפלת web/local, D-003 — מפתחות בצד לקוח / env של המשתמש, D-004 — סוכן AI מאושר במסגרת v0.3.0, D-005 — Graphify כניווט ברירת מחדל לסוכנים, D-006 — Continuity דרך Git בלבד, D-007 — התנהגות סוכן אחרי בחירת סקריפט (+17 more)

### Community 40 - "WORKFLOW.md — זרימת עבודה משותפת לכל סוכן"
Cohesion: 0.25
Nodes (7): Git בטוח, Graphify, WORKFLOW.md — זרימת עבודה משותפת לכל סוכן, אחרי שינויים רלוונטיים, בזמן מימוש, לפני עבודה מהותית, שיחות קריאה בלבד

### Community 41 - "ACTIVE_WORK.md"
Cohesion: 0.17
Nodes (10): 2026-08-08 — explicit logo workflow + designed cards, 2026-08-08 — mixed media + direct canvas UI package, 2026-08-09 — composited timeline frame capture (export-parity, opt-in), 2026-08-09 — stable overlay identity, alpha preview and safe logo geometry, 2026-08-10 — gapless tight-cut pipeline, Branch, Current task, Exact continuation point (+2 more)

### Community 42 - "PROJECT_STATE.md — מצב יציב של hypescript"
Cohesion: 0.29
Nodes (6): PROJECT_STATE.md — מצב יציב של hypescript, ארכיטקטורה יציבה, גרסאות, יכולות יציבות שעובדות, מגבלות ידועות, מה המוצר

### Community 43 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 44 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 45 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

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

### Community 61 - "model.ts"
Cohesion: 0.19
Nodes (22): ClipInspector(), InspectorFocus, KIND, clipAudioFades(), clipContrast(), clipEnabled(), clipFlipX(), clipFlipY() (+14 more)

### Community 62 - "Word"
Cohesion: 0.13
Nodes (20): build_keep_intervals(), בונה קטעים לשמירה מתוך המילים. שני מקורות לחיתוך, מטופלים באופן אחיד: *…, is_speech_word(), מבני נתונים משותפים לכל שלבי ה-pipeline. חשוב: שני מנועי התמלול (מקומי וענן)…, מילה בודדת עם חותמות זמן (בשניות, על ציר הזמן המקורי של הווידאו)., מילת דיבור בלבד — ללא רווחים/אירועי שמע., כל המילים מכל הקטעים, ממוינות לפי זמן התחלה., speech_words() (+12 more)

### Community 63 - "storage.ts"
Cohesion: 0.30
Nodes (16): createProjectWithPolicy(), ensureProjectPolicy(), getProjectPolicy(), saveProjectPolicy(), createProject(), deleteProject(), ensureProject(), getCurrentProjectId() (+8 more)

### Community 64 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.12
Nodes (15): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), Migration, `No API key found in request` / כתובת עם `/rest/v1/auth/...`, Package A — משתני שרת נוספים, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה (+7 more)

### Community 67 - "Clip"
Cohesion: 0.17
Nodes (28): ChatProps, Props, CORNERS, DragState, Handle, PreviewOverlays(), Props, Props (+20 more)

### Community 68 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

### Community 69 - "project.ts"
Cohesion: 0.13
Nodes (28): SOURCE_COLORS, Timeline(), TYPE_ICON, IconButton(), useEditor(), captionStyleToCss(), DEFAULT_CAPTION_STYLE, normalizeCaptionStyle() (+20 more)

### Community 70 - "KeepInterval"
Cohesion: 0.31
Nodes (5): _merge_overlaps(), ממזג קטעים חופפים/נוגעים (יכול לקרות אם threshold < 2*padding)., KeepInterval, קטע שנשמור בעריכה (על ציר הזמן המקורי)., HebrewCaptionGroupingTests

### Community 71 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 72 - "EDITOR_FEATURE_MATRIX"
Cohesion: 0.22
Nodes (8): Agent, EDITOR_FEATURE_MATRIX, Inspector, Timeline, אודיו / כתוביות, ייצוא (verified), מעטפת עורך (Editor shell), נגן / Canvas

### Community 73 - "GAP_MAP — מצב אמת מול חזון "CapCut מקצועי + סוכן AI""
Cohesion: 0.22
Nodes (9): 1. Editor shell, 2. Canvas / Direct manipulation, 3. Timeline, 4. Text / Captions / Images / Logos / Overlays, 5. Agent workspace, 6. Project / Auth / Dashboard, 7. Providers, 8–9. Templates / Effects / Usage / Admin (+1 more)

### Community 74 - "RULES.md — חוקים מחייבים"
Cohesion: 0.22
Nodes (9): 1. פרטיות — הווידאו לא עוזב את המחשב, 2. חינמי ו-open-source בלבד, 3. סנכרון ליבה בין שתי האפליקציות, 4. הפרדת אפליקציות, 5. סוכן AI — מחוץ לטווח עד אישור, 6. עברית ו-RTL, 7. אין מערכות לא-מאושרות, 8. תיעוד החלטות (+1 more)

### Community 75 - "Render engine — join fix + RenderBackend seam + native plan"
Cohesion: 0.25
Nodes (7): 1. The export stall — root cause & fix (VERIFIED), 2. RenderBackend seam (shipped), 3. LocalNativeRenderBackend — file plan (next package, not built), 4. Remaining roadmap (staged, per the spec — not started), Old vs new (per segment), Render engine — join fix + RenderBackend seam + native plan, Verification — measured, not asserted on a string

### Community 76 - "DATA_MODEL"
Cohesion: 0.25
Nodes (7): DATA_MODEL, Package A — Auth foundation (Supabase migration קיימת), מגבלות מודל שיש להרחיב (חבילות הבאות), מודל יעד (חבילות B–G), מודל פרויקט בפועל (`lib/editor/`), מיגרציה מהמצב הנוכחי, מצב נוכחי (client-first, אמת)

### Community 77 - "PROVIDER_CAPABILITY_MATRIX"
Cohesion: 0.29
Nodes (6): Image / Video / Voice / Music / Storage / Search / Fonts / Icons / Templates, LLM (Agent), Missing-key policy, PROVIDER_CAPABILITY_MATRIX, ארכיטקטורה נוכחית (אמת), תמלול

### Community 78 - "hypescript web"
Cohesion: 0.29
Nodes (6): hypescript web, איך זה עובד (ארכיטקטורה), הרצה מקומית, מבנה, מגבלות v1, פריסה ב-Vercel

### Community 79 - "ARCHITECTURE.md — מבנה המערכת"
Cohesion: 0.33
Nodes (6): ARCHITECTURE.md — מבנה המערכת, החלטת מפתח: למה ffmpeg.wasm ולא עיבוד בשרת, זרימת נתונים (local), זרימת נתונים (web), מה שטרם הוחלט, שתי אפליקציות, ליבה משותפת

### Community 80 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 81 - "GAP_MAP.md"
Cohesion: 0.25
Nodes (7): 2026-08-08 closed gaps, 2026-08-09 closed gaps, ISSUES לפי עדיפות, P0, P1, P2 (הבא), P3

### Community 82 - "SECURITY_MODEL"
Cohesion: 0.33
Nodes (5): Agent, SECURITY_MODEL, מצב נוכחי (אמת) ופערים ידועים, נתונים, עקרונות

### Community 83 - "PRODUCT_VISION.md — חזון המוצר"
Cohesion: 0.33
Nodes (6): PRODUCT_VISION.md — חזון המוצר, הבעיה, החוויה, המוצר, לאן זה הולך, למי

### Community 84 - "hypescript"
Cohesion: 0.40
Nodes (5): hypescript, איך מריצים, בהמשך, מבנה, תיעוד הפרויקט

### Community 85 - "ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap"
Cohesion: 0.40
Nodes (5): ROADMAP_GUIDELINES.md — איך מנהלים את ה-Roadmap, איך פותחים גרסה חדשה, גבול בין שלבים — לא לזלוג קדימה, מתי פיצ'ר "מוכן", שינוי היקף

### Community 86 - "ROADMAP.md — שלבים וגרסאות"
Cohesion: 0.40
Nodes (5): ROADMAP.md — שלבים וגרסאות, ✅ v0.1.0 — קיים (הגרסה הפעילה), 🔜 v0.2.0 — ליטוש ה-web לרמת production, 🧠 v0.3.0 — סוכן AI + עורך בסגנון CapCut (אושר מפורשות, בעבודה), 🎯 v1.0.0 — יציב ושמיש

### Community 87 - "UI_GUIDELINES.md — עקרונות ממשק"
Cohesion: 0.40
Nodes (5): UI_GUIDELINES.md — עקרונות ממשק, מה שטרם הוחלט, נגישות, עקרונות, שפה חזותית (קיים)

### Community 88 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 89 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 90 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 91 - "AGENT_UI_PARITY"
Cohesion: 0.50
Nodes (3): AGENT_UI_PARITY, מקרא, פערי Parity מיידיים (לחבילה הבאה)

### Community 92 - "STACK.md — טכנולוגיות"
Cohesion: 0.50
Nodes (4): local/, STACK.md — טכנולוגיות, web/ (המסלול המרכזי), עתידי / אפשרי (טרם הוחלט)

### Community 96 - "projects/types.ts"
Cohesion: 0.19
Nodes (17): NewProjectWizard(), Props, STEPS, WizardResult, CreateProjectInput, AspectRatio, CapabilityChoice, CapabilityKey (+9 more)

### Community 97 - "toast.ts"
Cohesion: 0.26
Nodes (11): ICONS, ToastHost(), dismissToast(), emit(), items, Listener, listeners, pushToast() (+3 more)

### Community 98 - "providers.ts"
Cohesion: 0.18
Nodes (19): maxDuration, POST(), runtime, anthropicParts(), asText(), callAnthropic(), callGemini(), callOpenAICompat() (+11 more)

### Community 100 - "useAuth"
Cohesion: 0.20
Nodes (13): OnboardingPage(), Step, getSupabaseBrowser(), AuthState, humanAuthError(), postBootstrap(), useAuth(), Ctx (+5 more)

### Community 101 - "Chat.tsx"
Cohesion: 0.10
Nodes (34): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, SlashCmd (+26 more)

### Community 102 - "commands.builtin.ts"
Cohesion: 0.17
Nodes (20): ensureBuiltinCommands(), addClip(), assembledToSource(), splitClip(), trimClip(), clampOverlayTransform(), imageOverlayGeometry(), ImageOverlayPreset (+12 more)

### Community 103 - "Hypescript — Brand Guidelines"
Cohesion: 0.13
Nodes (14): Accessibility, Clear space / Minimum size, Email, Hypescript — Brand Guidelines, Metadata / PWA / Social, Palette (נדגם מהלוגו), Theme, כלל מקור (+6 more)

### Community 104 - "ffmpeg.ts"
Cohesion: 0.10
Nodes (36): uid(), extOf(), extractAssembledAudio(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame(), ffQueue (+28 more)

### Community 105 - "ChatMarkdown.tsx"
Cohesion: 0.36
Nodes (4): ChatMarkdown(), contextualFileName(), MdPart, parseChatMarkdown()

### Community 106 - "ChatMediaCard.tsx"
Cohesion: 0.29
Nodes (6): BeatAudioPlayer(), ChatMediaCard(), fmt(), LABEL, MKind, Props

### Community 108 - "subtitles.ts"
Cohesion: 0.26
Nodes (13): buildCues(), CaptionMode, endsPhrase(), endsSentence(), formatCueText(), mapToEdited(), phraseBlocks(), progressiveFromPhrases() (+5 more)

### Community 109 - "config.ts"
Cohesion: 0.23
Nodes (14): GET(), runtime, GET(), configuredProviders(), classifyPublicKey(), decodeJwtPayload(), getAuthDiagnostics(), getRawPublicKey() (+6 more)

### Community 110 - "normalizeSupabaseUrl"
Cohesion: 0.30
Nodes (11): POST(), runtime, ensureBootstrapSystemOwner(), normalizeSupabaseUrl(), allowGuestEditor(), getBootstrapSuperAdminEmail(), getServiceRoleKey(), getSupabaseAnonServer() (+3 more)

### Community 111 - "agent/types.ts"
Cohesion: 0.19
Nodes (10): CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), ToolMeta, AgentResponse, AgentUsage, ChatMessage, ContentPart (+2 more)

### Community 112 - "login/page.tsx"
Cohesion: 0.26
Nodes (7): ContinueInner(), LoginInner(), Tab, AuthDiagnostics, authIssueMessage(), postLoginPath(), waitForSession()

### Community 113 - "providers/policy.ts"
Cohesion: 0.32
Nodes (8): ApprovalStore, empty(), ensureProviderBillingApproval(), getProviderApprovals(), isProviderBillingApproved(), parseProviderApprovals(), PROVIDER_APPROVALS_KEY, setProviderBillingApproval()

### Community 114 - "graph.integration.test.ts"
Cohesion: 0.21
Nodes (5): astream(), fmtDur(), probe(), vPackets(), vstream()

### Community 115 - "colorPresets.ts"
Cohesion: 0.67
Nodes (4): CLIP_COLOR_PRESETS, ClipColorPreset, colorPreset(), matchingColorPreset()

### Community 116 - "chunking.ts"
Cohesion: 0.44
Nodes (7): DEFAULT_CHUNK_SEC, mergeWordChunks(), planChunkOffsets(), shiftWords(), wordsFromProviderPayload(), transcribeMediaFile(), TranscribeMediaOpts

## Knowledge Gaps
- **536 isolated node(s):** `track-edit.sh script`, `runtime`, `maxDuration`, `runtime`, `runtime` (+531 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Clip` connect `Clip` to `timelineFrame.ts`, `app/page.tsx`, `commands.ts`, `project.ts`, `Chat.tsx`, `commands.builtin.ts`, `semanticTimeline.ts`, `ffmpeg.ts`, `EditorPage`, `tools.ts`, `graph.integration.test.ts`, `clipFilter.ts`, `subtitlesEdl.ts`, `clipDur`, `model.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Timeline()` connect `project.ts` to `thumbnails.ts`, `app/page.tsx`, `commands.builtin.ts`, `time.ts`, `clipDur`, `model.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `AgentRunner` connect `runtime.ts` to `Chat.tsx`, `agent/types.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `track-edit.sh script`, `runtime`, `maxDuration` to the rest of the system?**
  _536 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `thumbnails.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09659090909090909 - nodes in this community are weakly interconnected._