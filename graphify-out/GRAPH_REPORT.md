# Graph Report - hipescript  (2026-08-11)

## Corpus Check
- 309 files · ~363,469 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2112 nodes · 4719 edges · 149 communities (125 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7496991`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- thumbnails.ts
- kit.ts
- getSupabaseServiceClient
- setup-cloud.ps1
- runtime.ts
- dependencies
- HypescriptGUI
- Clip
- transcription.py
- compilerOptions
- editing.py
- media.py
- 20260804170000_pkg_a_foundation.sql
- settings/page.tsx
- run
- EditorApi
- tools.ts
- What You Must Do When Invoked
- subtitles.py
- clipFilter.ts
- project.ts
- History
- providers.ts
- subtitlesEdl.ts
- transcribe/route.ts
- lemon.ts
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- clipDur
- storage.ts
- AGENTS.md — נקודת הכניסה לכל סוכן
- HANDOFF.md
- canvasCoords.ts
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
- app/page.tsx
- Word
- InspectorPanel.tsx
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- tests/__init__.py
- AGENTS.md
- commands.ts
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
- 20260810120000_enforce_cloud_quotas.sql
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
- chunking.ts
- images.ts
- create.ts
- model.ts
- commands.builtin.ts
- Chat.tsx
- timelineFrame.ts
- Hypescript — Brand Guidelines
- subtitles.ts
- ui.tsx
- ChatMediaCard.tsx
- models.ts
- time.ts
- BrandLogo.tsx
- graph.integration.test.ts
- captionBurn.ts
- agent/types.ts
- auth/config.ts
- prepare-ffmpeg.mjs
- public.cloud_runtime_settings
- ChatMarkdown.tsx
- 20260810050000_cloud_saas.sql
- cloud-render-worker/package.json
- server.mjs
- ffmpeg.ts
- ExportDialog.tsx
- חיבור הענן — בדיוק מה להשיג ואיפה לשים
- public.cloud_subscriptions
- requireCloudUser
- RenderBackend.ts
- generate-brand-assets.py
- Word
- render/route.ts
- lemon-discover.mjs
- BRAND-KIT.md
- dashboard/page.tsx
- Creative library architecture
- r2.ts
- preview.ts
- CreativePanel.tsx
- commandSurface.ts
- public.credit_ledger
- public.analytics_events
- public.user_settings
- continue/page.tsx
- quotaMessaging.ts

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 60 edges
2. `Clip` - 53 edges
3. `requireCloudUser()` - 41 edges
4. `ensureBuiltinCommands()` - 38 edges
5. `Overlay` - 37 edges
6. `clipDur()` - 35 edges
7. `isGapClip()` - 35 edges
8. `EditorApi` - 33 edges
9. `MediaAsset` - 32 edges
10. `Sub` - 32 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `HebrewCaptionGroupingTests` --uses--> `Word`  [INFERRED]
  local/tests/test_subtitles.py → local/hypescript/models.py
- `DragState` --references--> `Overlay`  [EXTRACTED]
  web/components/PreviewOverlays.tsx → web/lib/editor/overlay.ts
- `Conversation` --references--> `ChatMessage`  [EXTRACTED]
  web/lib/agent/chatStore.ts → web/lib/agent/types.ts
- `RegisteredMedia` --references--> `MediaAsset`  [EXTRACTED]
  web/lib/agent/tools.ts → web/lib/editor/model.ts

## Import Cycles
- None detected.

## Communities (149 total, 24 thin omitted)

### Community 0 - "thumbnails.ts"
Cohesion: 0.10
Nodes (29): Filmstrip(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, Waveform() (+21 more)

### Community 1 - "kit.ts"
Cohesion: 0.11
Nodes (39): BrandSettingsPage(), inputStyle, probeImage(), uid(), BRAND_ACTIVE_KEY, BRAND_KIT_VERSION, BRAND_KITS_KEY, BrandAssetMeta (+31 more)

### Community 2 - "getSupabaseServiceClient"
Cohesion: 0.20
Nodes (16): GET(), POST(), runtime, DELETE(), POST(), secretMatches(), ensureBootstrapSystemOwner(), normalizeSupabaseUrl() (+8 more)

### Community 3 - "setup-cloud.ps1"
Cohesion: 0.36
Nodes (4): Get-DotEnv(), Read-PlainSecret(), Require-Value(), Set-DotEnv()

### Community 4 - "runtime.ts"
Cohesion: 0.12
Nodes (19): SlashCmd, AgentEvents, agentLoopGuard(), AgentRunner, formatLlmError(), formatToolError(), isChunkLoadError(), LOOP_GUARDS (+11 more)

### Community 5 - "dependencies"
Cohesion: 0.04
Nodes (47): @aws-sdk/s3-request-presigner, @ffmpeg/core, @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom (+39 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "Clip"
Cohesion: 0.22
Nodes (20): ChatProps, Props, Props, Props, Props, EditorSnapshot, AgentContext, TOOL_BY_NAME (+12 more)

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
Nodes (20): public.handle_new_user, public.protect_system_owner, public.protect_system_owner_role, on_auth_user_created, public.audit_logs, public.credit_accounts, public.has_permission(), public.is_system_owner() (+12 more)

### Community 13 - "settings/page.tsx"
Cohesion: 0.11
Nodes (31): CloudStatus, SettingsPage(), DEFAULT_DATA_MODE_PREF, GROQ_KEY, OPENAI_KEY, PROVIDER_PREF, TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF (+23 more)

### Community 14 - "run"
Cohesion: 0.14
Nodes (23): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+15 more)

### Community 15 - "EditorApi"
Cohesion: 0.13
Nodes (4): EditorApi, queryProject(), inferArgs(), listRunnableCommands()

### Community 16 - "tools.ts"
Cohesion: 0.05
Nodes (44): buildImageBrandBrief(), buildImagePrompt(), captureFrameMode, clipsSummary(), dispatch(), fetchTranscribeConfigured(), fmt(), formatImageResult() (+36 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.15
Nodes (23): CaptionMode, build_cues(), _ends_phrase(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), _phrase_blocks() (+15 more)

### Community 19 - "clipFilter.ts"
Cohesion: 0.19
Nodes (18): EnergyProfile, auditCutQuality(), deleteClipRange(), deleteClipsAt(), intersectClipsWithSpeech(), keepSourceRange(), mergeOverlappingSameSource(), normalizeGeneratedCuts() (+10 more)

### Community 20 - "project.ts"
Cohesion: 0.15
Nodes (23): SOURCE_COLORS, Timeline(), TYPE_ICON, ensureTrackId(), migrateClips(), migrateState(), totalDur(), audioMuted() (+15 more)

### Community 22 - "providers.ts"
Cohesion: 0.18
Nodes (19): maxDuration, POST(), runtime, anthropicParts(), asText(), callAnthropic(), callGemini(), callOpenAICompat() (+11 more)

### Community 23 - "subtitlesEdl.ts"
Cohesion: 0.17
Nodes (22): assembledWords(), CaptionBuildOpts, CaptionMode, edlToCues(), edlToCuesWithScript(), edlToSrt(), edlToSubs(), edlToSubsWithScript() (+14 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.12
Nodes (27): GET(), runtime, GET(), runtime, maxDuration, POST(), runtime, GET() (+19 more)

### Community 25 - "lemon.ts"
Cohesion: 0.11
Nodes (29): AccountPage(), BillingStatus, gb(), GET(), POST(), POST(), runtime, validSignature() (+21 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "clipDur"
Cohesion: 0.14
Nodes (26): avgDb(), assembledDuration(), AssembleOpts, assembleTranscript(), formatTranscriptLines(), WordsBySource, assembledStart(), clipDur() (+18 more)

### Community 32 - "storage.ts"
Cohesion: 0.32
Nodes (13): ensureProjectPolicy(), getProjectPolicy(), saveProjectPolicy(), createProject(), ensureProject(), getCurrentProjectId(), kvClear(), kvGet() (+5 more)

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.22
Nodes (9): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+1 more)

### Community 34 - "HANDOFF.md"
Cohesion: 0.18
Nodes (10): 2026-08-11 — complete AI video editor rebrand, 2026-08-11 — persistent workspace + creative catalog foundation, Active Files, Changes Made, Current State, Exact Next Steps, Failed Attempts, Goal (+2 more)

### Community 35 - "canvasCoords.ts"
Cohesion: 0.19
Nodes (16): CORNERS, DragState, Handle, PreviewOverlays(), defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect() (+8 more)

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
Cohesion: 0.07
Nodes (29): 2026-08-08 — media placement and Preview/Export parity, D-001 — עיבוד וידאו מקומי, לא בשרת, D-002 — ליבה משוכפלת web/local, D-003 — מפתחות בצד לקוח / env של המשתמש, D-004 — סוכן AI מאושר במסגרת v0.3.0, D-005 — Graphify כניווט ברירת מחדל לסוכנים, D-006 — Continuity דרך Git בלבד, D-007 — התנהגות סוכן אחרי בחירת סקריפט (+21 more)

### Community 40 - "WORKFLOW.md — זרימת עבודה משותפת לכל סוכן"
Cohesion: 0.25
Nodes (7): Git בטוח, Graphify, WORKFLOW.md — זרימת עבודה משותפת לכל סוכן, אחרי שינויים רלוונטיים, בזמן מימוש, לפני עבודה מהותית, שיחות קריאה בלבד

### Community 41 - "ACTIVE_WORK.md"
Cohesion: 0.13
Nodes (13): 2026-08-08 — explicit logo workflow + designed cards, 2026-08-08 — mixed media + direct canvas UI package, 2026-08-09 — composited timeline frame capture (export-parity, opt-in), 2026-08-09 — stable overlay identity, alpha preview and safe logo geometry, 2026-08-10 — CTA asset pipeline: persisted narration + GPT images (main f72d88a + f368261), 2026-08-10 — exported video in chat with custom player (main f233969), 2026-08-10 — gapless tight-cut pipeline, 2026-08-10 — local organization/brand kit (main 7ab67e7) (+5 more)

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

### Community 61 - "app/page.tsx"
Cohesion: 0.19
Nodes (20): COMMAND_ICONS, download(), EditorPage(), kindOf(), probeDuration(), LeftTab, TABS, ToolRail() (+12 more)

### Community 62 - "Word"
Cohesion: 0.13
Nodes (20): build_keep_intervals(), בונה קטעים לשמירה מתוך המילים. שני מקורות לחיתוך, מטופלים באופן אחיד: *…, is_speech_word(), מבני נתונים משותפים לכל שלבי ה-pipeline. חשוב: שני מנועי התמלול (מקומי וענן)…, מילה בודדת עם חותמות זמן (בשניות, על ציר הזמן המקורי של הווידאו)., מילת דיבור בלבד — ללא רווחים/אירועי שמע., כל המילים מכל הקטעים, ממוינות לפי זמן התחלה., speech_words() (+12 more)

### Community 63 - "InspectorPanel.tsx"
Cohesion: 0.13
Nodes (20): CaptionsPanel(), InspectorFocus, InspectorPanel(), KIND, num(), OverlayInspector(), SubInspector(), titleFor() (+12 more)

### Community 64 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.12
Nodes (15): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), Migration, `No API key found in request` / כתובת עם `/rest/v1/auth/...`, Package A — משתני שרת נוספים, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה (+7 more)

### Community 67 - "commands.ts"
Cohesion: 0.10
Nodes (19): AGENT_COMMANDS, arr, bool, CommandContext, CommandId, CommandPermission, CommandPresentation, CommandSchema (+11 more)

### Community 68 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

### Community 69 - "20260810120000_enforce_cloud_quotas.sql"
Cohesion: 0.26
Nodes (10): public.cloud_assets, public.cloud_jobs, public.cloud_plans, public.cloud_projects, public.cloud_complete_render(), public.cloud_create_project(), public.cloud_reserve_render(), public.cloud_runtime_settings (+2 more)

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
Cohesion: 0.22
Nodes (8): 1. The export stall — root cause & fix (VERIFIED), 2. RenderBackend seam (shipped), 3. LocalNativeRenderBackend — file plan (next package, not built), 4. Cloud render target (selected, not connected), 5. Remaining roadmap (staged), Old vs new (per segment), Render engine — join fix + RenderBackend seam + native plan, Verification — measured, not asserted on a string

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
Cohesion: 0.22
Nodes (8): 2026-08-08 closed gaps, 2026-08-09 closed gaps, 2026-08-10 closed gaps, ISSUES לפי עדיפות, P0, P1, P2 (הבא), P3

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

### Community 96 - "chunking.ts"
Cohesion: 0.44
Nodes (7): DEFAULT_CHUNK_SEC, mergeWordChunks(), planChunkOffsets(), shiftWords(), wordsFromProviderPayload(), transcribeMediaFile(), TranscribeMediaOpts

### Community 97 - "images.ts"
Cohesion: 0.14
Nodes (21): maxDuration, POST(), runtime, buildImagePayload(), decodeFirstImage(), DEFAULT_OPENAI_IMAGE_BACKGROUND, DEFAULT_OPENAI_IMAGE_MODEL, DEFAULT_OPENAI_IMAGE_QUALITY (+13 more)

### Community 98 - "create.ts"
Cohesion: 0.14
Nodes (19): NewProjectWizard(), Props, WizardResult, CloudProject, CreateProjectInput, AspectRatio, CapabilityChoice, CapabilityKey (+11 more)

### Community 99 - "model.ts"
Cohesion: 0.15
Nodes (28): ClipInspector(), PreviewHandle, VideoPreview, captionStyleToCss(), clipAudioFades(), clipContrast(), clipEnabled(), clipFlipX() (+20 more)

### Community 100 - "commands.builtin.ts"
Cohesion: 0.17
Nodes (25): ensureBuiltinCommands(), addClip(), assembledToSource(), splitClip(), uid(), clampOverlayTransform(), imageOverlayGeometry(), ImageOverlayPreset (+17 more)

### Community 101 - "Chat.tsx"
Cohesion: 0.11
Nodes (36): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+28 more)

### Community 102 - "timelineFrame.ts"
Cohesion: 0.20
Nodes (15): makeGap(), buildMicroEdl(), clampTimelineAt(), fadeLevelAt(), MICRO_WINDOW_SEC, MicroEdlOptions, microSeekAt(), MIN_WINDOW_SEC (+7 more)

### Community 103 - "Hypescript — Brand Guidelines"
Cohesion: 0.29
Nodes (6): Accessibility and metadata, Canonical assets, Core idea, Hypescript — Brand Guidelines, Palette, Usage

### Community 104 - "subtitles.ts"
Cohesion: 0.26
Nodes (13): buildCues(), CaptionMode, endsPhrase(), endsSentence(), formatCueText(), mapToEdited(), phraseBlocks(), progressiveFromPhrases() (+5 more)

### Community 105 - "ui.tsx"
Cohesion: 0.21
Nodes (11): TextPanel(), TopBar(), Button(), ContextMenu(), CtxItem, ICON, Section(), STROKE (+3 more)

### Community 106 - "ChatMediaCard.tsx"
Cohesion: 0.23
Nodes (9): BeatAudioPlayer(), ChatMediaCard(), fmt(), LABEL, MKind, Props, VideoPlayer(), formatTime() (+1 more)

### Community 107 - "models.ts"
Cohesion: 0.15
Nodes (16): findRanges(), FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals() (+8 more)

### Community 108 - "time.ts"
Cohesion: 0.14
Nodes (27): TimelineToolbar(), IconButton(), clampTime(), clampZoom(), MagneticSnapResult, MagneticTarget, MS, msToSec() (+19 more)

### Community 109 - "BrandLogo.tsx"
Cohesion: 0.06
Nodes (41): metadata, viewport, OnboardingPage(), Step, features, metadata, plans, useCases (+33 more)

### Community 110 - "graph.integration.test.ts"
Cohesion: 0.21
Nodes (5): astream(), fmtDur(), probe(), vPackets(), vstream()

### Community 112 - "captionBurn.ts"
Cohesion: 0.15
Nodes (18): collapseProgressiveForBurn(), CaptionLayout, captionLayoutForTarget(), captionYFraction(), materializeCaptions(), renderCaptionPng(), roundRect(), wrapLines() (+10 more)

### Community 113 - "agent/types.ts"
Cohesion: 0.21
Nodes (9): CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), ToolMeta, AgentResponse, ChatMessage, ContentPart, PROVIDER_LABELS (+1 more)

### Community 114 - "auth/config.ts"
Cohesion: 0.16
Nodes (20): GET(), LoginInner(), Tab, AuthDiagnostics, authIssueMessage(), classifyPublicKey(), decodeJwtPayload(), getAuthDiagnostics() (+12 more)

### Community 115 - "prepare-ffmpeg.mjs"
Cohesion: 0.50
Nodes (3): root, source, target

### Community 118 - "ChatMarkdown.tsx"
Cohesion: 0.36
Nodes (4): ChatMarkdown(), contextualFileName(), MdPart, parseChatMarkdown()

### Community 120 - "20260810050000_cloud_saas.sql"
Cohesion: 0.33
Nodes (10): auth, public.cloud_assets, public.cloud_jobs, public.cloud_plans, public.cloud_projects, public.cloud_storage_limit_bytes(), public.cloud_storage_usage_bytes(), public.cloud_subscriptions (+2 more)

### Community 121 - "cloud-render-worker/package.json"
Cohesion: 0.17
Nodes (11): dependencies, @aws-sdk/client-s3, express, @aws-sdk/client-s3, name, private, scripts, start (+3 more)

### Community 122 - "server.mjs"
Cohesion: 0.21
Nodes (9): active, app, callback(), hasAudio(), missing, render(), required, run() (+1 more)

### Community 123 - "ffmpeg.ts"
Cohesion: 0.19
Nodes (19): extOf(), extractAssembledAudio(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame(), ffQueue, getFFmpeg() (+11 more)

### Community 124 - "ExportDialog.tsx"
Cohesion: 0.47
Nodes (7): ExportDialog(), ExportResult, Props, estimateRemainingSeconds(), exportPercent(), formatBytes(), formatDurationHe()

### Community 125 - "חיבור הענן — בדיוק מה להשיג ואיפה לשים"
Cohesion: 0.11
Nodes (17): 1. Supabase — שלושה ערכים, 2. Cloudflare R2 — ארבעה ערכים, 3. Google Cloud — בחירה אחת, 4. Vercel — איפה נשמרים 11 הערכים, CORS שחייבים להוסיף, בדיקה סופית, הדרך הקצרה ביותר, חיבור הענן — בדיוק מה להשיג ואיפה לשים (+9 more)

### Community 127 - "requireCloudUser"
Cohesion: 0.17
Nodes (15): DELETE(), GET(), PATCH(), GET(), POST(), GET(), GET(), DELETE() (+7 more)

### Community 128 - "RenderBackend.ts"
Cohesion: 0.20
Nodes (5): browserBackend, BrowserRenderBackend, ExecutionMode, RenderBackend, RenderCapabilities

### Community 129 - "generate-brand-assets.py"
Cohesion: 0.42
Nodes (8): Image, Path, font(), mark(), Generate Hypescript raster icons and social cards from the canonical mark…, save_icon(), social(), wordmark()

### Community 130 - "Word"
Cohesion: 0.32
Nodes (7): CutQualityReport, ElevenLabsSttRaw, ElevenLabsWordRaw, mapTokenType(), NormalizedTranscript, normalizeElevenLabsStt(), Word

### Community 131 - "render/route.ts"
Cohesion: 0.20
Nodes (15): DELETE(), ClipInput, parseClips(), POST(), dynamic, GET(), CloudServiceName, env() (+7 more)

### Community 137 - "dashboard/page.tsx"
Cohesion: 0.28
Nodes (12): DashboardPage(), DialogState, userAvatarUrl(), userLabel(), ConfirmDialog(), NameDialog(), listCloudProjects(), createProjectWithPolicy() (+4 more)

### Community 138 - "Creative library architecture"
Cohesion: 0.40
Nodes (4): Creative library architecture, Delivery order, Product contract, Sources and licensing

### Community 139 - "r2.ts"
Cohesion: 0.29
Nodes (10): GET(), POST(), POST(), getCloudUploadLimitBytes(), assetObjectKey(), headObject(), r2(), safeObjectName() (+2 more)

### Community 140 - "preview.ts"
Cohesion: 0.24
Nodes (10): fmtDate(), fmtRelativeHe(), ProjectCard(), asFile(), formatDurationHe(), getProjectCardInfo(), getProjectCoverUrl(), ProjectCardInfo (+2 more)

### Community 141 - "CreativePanel.tsx"
Cohesion: 0.40
Nodes (4): ClipPatch, CreativePanel(), FADES, LOOKS

### Community 142 - "commandSurface.ts"
Cohesion: 0.67
Nodes (3): CommandDef, CommandSelection, RunnableCommand

### Community 147 - "continue/page.tsx"
Cohesion: 0.52
Nodes (3): ContinueInner(), postLoginPath(), waitForSession()

### Community 148 - "quotaMessaging.ts"
Cohesion: 0.60
Nodes (4): QUOTA_CODES, quotaCode(), quotaMessage(), UserQuotaCode

## Knowledge Gaps
- **624 isolated node(s):** `track-edit.sh script`, `name`, `version`, `private`, `type` (+619 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Clip` connect `Clip` to `RenderBackend.ts`, `CreativePanel.tsx`, `EditorApi`, `tools.ts`, `graph.test.ts`, `clipFilter.ts`, `project.ts`, `subtitlesEdl.ts`, `clipDur`, `app/page.tsx`, `InspectorPanel.tsx`, `commands.ts`, `model.ts`, `commands.builtin.ts`, `Chat.tsx`, `timelineFrame.ts`, `graph.integration.test.ts`, `captionBurn.ts`, `ffmpeg.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `toast` connect `app/page.tsx` to `lemon.ts`, `dashboard/page.tsx`, `BrandLogo.tsx`, `kit.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Word` connect `Word` to `chunking.ts`, `Chat.tsx`, `Clip`, `subtitles.ts`, `models.ts`, `tools.ts`, `clipFilter.ts`, `app/page.tsx`, `clipDur`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `track-edit.sh script`, `name`, `version` to the rest of the system?**
  _624 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `thumbnails.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `kit.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10638297872340426 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11742424242424243 - nodes in this community are weakly interconnected._