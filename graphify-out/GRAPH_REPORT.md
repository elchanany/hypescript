# Graph Report - workspace  (2026-08-04)

## Corpus Check
- 215 files · ~412,280 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1505 nodes · 3160 edges · 105 communities (87 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80c02594`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- runtime.ts
- settings/page.tsx
- EditorPage
- config.ts
- models.ts
- dependencies
- HypescriptGUI
- tools.ts
- transcription.py
- compilerOptions
- editing.py
- media.py
- providers.ts
- MediaPanel.tsx
- run
- BrowserRenderBackend
- graph.integration.test.ts
- What You Must Do When Invoked
- subtitles.py
- project.ts
- canvasCoords.ts
- History
- toast.ts
- captionBurn.ts
- transcribe/route.ts
- app/page.tsx
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- subtitlesEdl.ts
- subtitles.ts
- AGENTS.md — נקודת הכניסה לכל סוכן
- HANDOFF
- chatStore.ts
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
- Clip
- ffmpeg.ts
- dashboard/page.tsx
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- KeepInterval
- AGENTS.md
- Chat.tsx
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
- agent/types.ts
- chunking.ts
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
- clipFilter.ts
- overlay.ts
- InspectorPanel.tsx
- loopGuard.test.ts
- Hypescript — Brand Guidelines
- assembleTranscript.ts
- ChatMarkdown.tsx
- ChatMediaCard.tsx
- audio.ts

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 52 edges
2. `Clip` - 40 edges
3. `Overlay` - 31 edges
4. `uid()` - 28 edges
5. `HypescriptGUI` - 27 edges
6. `Sub` - 26 edges
7. `ensureBuiltinCommands()` - 25 edges
8. `EditorApi` - 25 edges
9. `clipDur()` - 25 edges
10. `MediaAsset` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `Conversation` --references--> `ChatMessage`  [EXTRACTED]
  web/lib/agent/chatStore.ts → web/lib/agent/types.ts
- `ensureTrackId()` --calls--> `primaryVideoTrackId()`  [EXTRACTED]
  web/lib/agent/tools.ts → web/lib/editor/project.ts
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts
- `assembledDuration()` --indirect_call--> `clipEnabled()`  [INFERRED]
  web/lib/editor/assembleTranscript.ts → web/lib/editor/model.ts

## Import Cycles
- None detected.

## Communities (105 total, 18 thin omitted)

### Community 0 - "runtime.ts"
Cohesion: 0.14
Nodes (14): SlashCmd, AgentEvents, AgentRunner, formatLlmError(), formatToolError(), isChunkLoadError(), LOOP_GUARDS, MODE_PROMPTS (+6 more)

### Community 1 - "settings/page.tsx"
Cohesion: 0.07
Nodes (44): metadata, viewport, OnboardingPage(), Step, SettingsPage(), BrandLogo(), Props, ChunkReload() (+36 more)

### Community 2 - "EditorPage"
Cohesion: 0.09
Nodes (13): download(), EditorPage(), kindOf(), probeDuration(), CommandDef, EditorApi, listCommands(), ProjectQuery (+5 more)

### Community 3 - "config.ts"
Cohesion: 0.09
Nodes (37): POST(), runtime, GET(), runtime, GET(), ContinueInner(), LoginInner(), Tab (+29 more)

### Community 4 - "models.ts"
Cohesion: 0.11
Nodes (23): findRanges(), FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals() (+15 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @supabase/ssr, @supabase/supabase-js (+30 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "tools.ts"
Cohesion: 0.08
Nodes (27): clipsSummary(), dispatch(), ensureTrackId(), fetchTranscribeConfigured(), fmt(), mainVideo(), readTranscribeModelPref(), readTranscribePref() (+19 more)

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
Cohesion: 0.18
Nodes (18): maxDuration, POST(), runtime, anthropicParts(), asText(), callAnthropic(), callGemini(), callOpenAICompat() (+10 more)

### Community 13 - "MediaPanel.tsx"
Cohesion: 0.10
Nodes (29): Filmstrip(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, Waveform() (+21 more)

### Community 14 - "run"
Cohesion: 0.18
Nodes (18): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+10 more)

### Community 16 - "graph.integration.test.ts"
Cohesion: 0.29
Nodes (5): astream(), fmtDur(), probe(), vPackets(), vstream()

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.17
Nodes (20): CaptionMode, build_cues(), _ends_phrase(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), _phrase_blocks() (+12 more)

### Community 19 - "project.ts"
Cohesion: 0.19
Nodes (17): migrateClips(), migrateState(), audioMuted(), audioTrack(), captionLocked(), captionTrack(), clampHeight(), createVideoTrack() (+9 more)

### Community 20 - "canvasCoords.ts"
Cohesion: 0.29
Nodes (11): defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect, rotatePoint() (+3 more)

### Community 22 - "toast.ts"
Cohesion: 0.24
Nodes (12): ICONS, ToastHost(), dismissToast(), emit(), items, Listener, listeners, pushToast() (+4 more)

### Community 23 - "captionBurn.ts"
Cohesion: 0.30
Nodes (11): useEditor(), captionStyleToCss(), DEFAULT_CAPTION_STYLE, normalizeCaptionStyle(), CaptionLayout, captionLayoutForTarget(), captionYFraction(), materializeCaptions() (+3 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.13
Nodes (25): GET(), runtime, maxDuration, POST(), runtime, GET(), runtime, maxDuration (+17 more)

### Community 25 - "app/page.tsx"
Cohesion: 0.13
Nodes (42): SOURCE_COLORS, Timeline(), TYPE_ICON, LeftTab, TABS, ToolRail(), ContextMenu(), CtxItem (+34 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "subtitlesEdl.ts"
Cohesion: 0.21
Nodes (18): assembledWords(), CaptionBuildOpts, CaptionMode, collapseProgressiveForBurn(), edlToCues(), edlToCuesWithScript(), edlToSrt(), endsPhrase() (+10 more)

### Community 32 - "subtitles.ts"
Cohesion: 0.23
Nodes (14): buildCues(), CaptionMode, Cue, endsPhrase(), endsSentence(), formatCueText(), mapToEdited(), phraseBlocks() (+6 more)

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.22
Nodes (9): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+1 more)

### Community 34 - "HANDOFF"
Cohesion: 0.40
Nodes (4): Auth, HANDOFF, main (after merge), Next

### Community 35 - "chatStore.ts"
Cohesion: 0.32
Nodes (11): addConversation(), ChatItem, ChatStoreV2, Conversation, emptyConversation(), emptyStore(), isPlaceholderTitle(), migrateChatStore() (+3 more)

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
Cohesion: 0.20
Nodes (9): D-001 — עיבוד וידאו מקומי, לא בשרת, D-002 — ליבה משוכפלת web/local, D-003 — מפתחות בצד לקוח / env של המשתמש, D-004 — סוכן AI מאושר במסגרת v0.3.0, D-005 — Graphify כניווט ברירת מחדל לסוכנים, D-006 — Continuity דרך Git בלבד, D-007 — התנהגות סוכן אחרי בחירת סקריפט, D-008 — רצועות וידאו מרובות + סוכן דרך EditorApi (+1 more)

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

### Community 61 - "Clip"
Cohesion: 0.21
Nodes (24): ChatProps, Props, CORNERS, DragState, Handle, Props, Props, Props (+16 more)

### Community 62 - "ffmpeg.ts"
Cohesion: 0.10
Nodes (35): clipEnabled(), mediaById(), extOf(), extractAssembledAudio(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame() (+27 more)

### Community 63 - "dashboard/page.tsx"
Cohesion: 0.09
Nodes (48): DashboardPage(), DialogState, fmtDate(), ProjectCard(), userAvatarUrl(), userLabel(), ConfirmDialog(), NameDialog() (+40 more)

### Community 64 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.12
Nodes (15): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), Migration, `No API key found in request` / כתובת עם `/rest/v1/auth/...`, Package A — משתני שרת נוספים, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה (+7 more)

### Community 65 - "KeepInterval"
Cohesion: 0.21
Nodes (11): build_keep_intervals(), _merge_overlaps(), KeepInterval, בונה קטעים לשמירה מתוך המילים. שני מקורות לחיתוך, מטופלים באופן אחיד: *…, ממזג קטעים חופפים/נוגעים (יכול לקרות אם threshold < 2*padding)., קטע יחיד המכסה את כל הסרטון (כשלא מבצעים הסרת שתיקות)., מחשב את הקטעים שהוסרו (המשלים של keeps בתוך [0, duration])., removed_intervals() (+3 more)

### Community 67 - "Chat.tsx"
Cohesion: 0.15
Nodes (20): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+12 more)

### Community 68 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

### Community 69 - "agent/types.ts"
Cohesion: 0.29
Nodes (6): CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), AgentResponse, ChatMessage, ContentPart

### Community 70 - "chunking.ts"
Cohesion: 0.44
Nodes (7): DEFAULT_CHUNK_SEC, mergeWordChunks(), planChunkOffsets(), shiftWords(), wordsFromProviderPayload(), transcribeMediaFile(), TranscribeMediaOpts

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

### Community 81 - "ISSUES לפי עדיפות"
Cohesion: 0.33
Nodes (5): ISSUES לפי עדיפות, P0, P1, P2 (הבא), P3

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

### Community 96 - "clipFilter.ts"
Cohesion: 0.46
Nodes (5): deleteClipRange(), deleteClipsAt(), intersectClipsWithSpeech(), keepSourceRange(), snapSpeechToWords()

### Community 97 - "overlay.ts"
Cohesion: 0.22
Nodes (6): PreviewOverlays(), makeImageOverlay(), nextZ(), OverlayKind, overlayVisibleAt(), VisualTransform

### Community 98 - "InspectorPanel.tsx"
Cohesion: 0.07
Nodes (42): CaptionsPanel(), ClipInspector(), InspectorFocus, InspectorPanel(), KIND, num(), OverlayInspector(), SubInspector() (+34 more)

### Community 103 - "Hypescript — Brand Guidelines"
Cohesion: 0.13
Nodes (14): Accessibility, Clear space / Minimum size, Email, Hypescript — Brand Guidelines, Metadata / PWA / Social, Palette (נדגם מהלוגו), Theme, כלל מקור (+6 more)

### Community 104 - "assembleTranscript.ts"
Cohesion: 0.36
Nodes (7): assembledDuration(), AssembleOpts, assembleTranscript(), formatTranscriptLines(), WordsBySource, GAP_SOURCE, isSpeechWord()

### Community 105 - "ChatMarkdown.tsx"
Cohesion: 0.36
Nodes (4): ChatMarkdown(), contextualFileName(), MdPart, parseChatMarkdown()

### Community 106 - "ChatMediaCard.tsx"
Cohesion: 0.29
Nodes (6): BeatAudioPlayer(), ChatMediaCard(), fmt(), LABEL, MKind, Props

### Community 108 - "audio.ts"
Cohesion: 0.33
Nodes (6): analyzeAudio(), avgDb(), cache, EnergyProfile, findSilences(), fp()

## Knowledge Gaps
- **485 isolated node(s):** `track-edit.sh script`, `runtime`, `maxDuration`, `runtime`, `runtime` (+480 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Word` connect `models.ts` to `clipFilter.ts`, `subtitles.ts`, `Chat.tsx`, `chunking.ts`, `tools.ts`, `assembleTranscript.ts`, `app/page.tsx`, `Clip`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Clip` connect `Clip` to `clipFilter.ts`, `InspectorPanel.tsx`, `Chat.tsx`, `EditorPage`, `models.ts`, `tools.ts`, `assembleTranscript.ts`, `graph.integration.test.ts`, `project.ts`, `app/page.tsx`, `ffmpeg.ts`, `subtitlesEdl.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Sub` connect `Clip` to `EditorPage`, `InspectorPanel.tsx`, `Chat.tsx`, `tools.ts`, `project.ts`, `captionBurn.ts`, `app/page.tsx`, `ffmpeg.ts`, `subtitlesEdl.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `track-edit.sh script`, `runtime`, `maxDuration` to the rest of the system?**
  _485 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._
- **Should `settings/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0671602326811211 - nodes in this community are weakly interconnected._
- **Should `EditorPage` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._