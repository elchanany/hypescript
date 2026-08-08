# Graph Report - hipescript  (2026-08-08)

## Corpus Check
- 226 files · ~421,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1592 nodes · 3295 edges · 108 communities (90 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b55d2e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- captionBurn.ts
- commands.ts
- graph.ts
- Timeline.tsx
- tools.ts
- dependencies
- HypescriptGUI
- ffmpeg.ts
- transcription.py
- compilerOptions
- editing.py
- media.py
- 20260804170000_pkg_a_foundation.sql
- model.ts
- run
- assembleTranscript.ts
- overlay.ts
- What You Must Do When Invoked
- subtitles.py
- VideoPreview.tsx
- subtitlesEdl.ts
- History
- providers.ts
- settings/page.tsx
- transcribe/route.ts
- thumbnails.ts
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- app/page.tsx
- ChatMessage
- AGENTS.md — נקודת הכניסה לכל סוכן
- HANDOFF
- BrandLogo.tsx
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
- uid
- subtitles.ts
- providers/policy.ts
- מדריך התחברות (Supabase) — צעד־אחר־צעד
- KeepInterval
- AGENTS.md
- collapseTools.ts
- REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר
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
- config.ts
- runtime.ts
- loopGuard.test.ts
- canvasCoords.ts
- Chat.tsx
- models.ts
- Hypescript — Brand Guidelines
- ChatMarkdown.tsx
- ChatMediaCard.tsx
- elevenlabs/normalize.ts
- project.ts
- BrowserRenderBackend
- graph.integration.test.ts

## God Nodes (most connected - your core abstractions)
1. `Clip` - 37 edges
2. `EditorApi` - 29 edges
3. `HypescriptGUI` - 27 edges
4. `Chat()` - 27 edges
5. `Overlay` - 27 edges
6. `uid()` - 26 edges
7. `clipDur()` - 24 edges
8. `Sub` - 24 edges
9. `run()` - 23 edges
10. `isGapClip()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `DragState` --references--> `Overlay`  [EXTRACTED]
  web/components/PreviewOverlays.tsx → web/lib/editor/overlay.ts
- `TopBar()` --calls--> `useAuth()`  [EXTRACTED]
  web/components/TopBar.tsx → web/lib/auth/useAuth.ts
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts
- `assembledDuration()` --indirect_call--> `clipEnabled()`  [INFERRED]
  web/lib/editor/assembleTranscript.ts → web/lib/editor/model.ts

## Import Cycles
- None detected.

## Communities (108 total, 18 thin omitted)

### Community 0 - "captionBurn.ts"
Cohesion: 0.30
Nodes (11): captionStyleToCss(), DEFAULT_CAPTION_STYLE, normalizeCaptionStyle(), CaptionLayout, captionLayoutForTarget(), captionYFraction(), materializeCaptions(), renderCaptionPng() (+3 more)

### Community 1 - "commands.ts"
Cohesion: 0.06
Nodes (33): download(), EditorPage(), kindOf(), probeDuration(), AGENT_COMMANDS, bool, ensureBuiltinCommands(), CommandContext (+25 more)

### Community 2 - "graph.ts"
Cohesion: 0.12
Nodes (19): mediaById(), aChain(), buildConcatGraph(), ext(), RenderGraph, RenderGraphOpts, renderSegments(), toExecArgs() (+11 more)

### Community 3 - "Timeline.tsx"
Cohesion: 0.10
Nodes (49): SOURCE_COLORS, Timeline(), TYPE_ICON, TimelineToolbar(), IconButton(), assembledToSource(), clipDur(), totalDur() (+41 more)

### Community 4 - "tools.ts"
Cohesion: 0.06
Nodes (30): clipsSummary(), dispatch(), fetchTranscribeConfigured(), fmt(), mainVideo(), MODE_PROMPTS, readTranscribeModelPref(), readTranscribePref() (+22 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (38): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @supabase/ssr, @supabase/supabase-js (+30 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "ffmpeg.ts"
Cohesion: 0.34
Nodes (13): extOf(), extractAssembledAudio(), extractAudio(), extractAudioChunks(), extractAudioSegment(), extractFrame(), ffQueue, getFFmpeg() (+5 more)

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

### Community 12 - "20260804170000_pkg_a_foundation.sql"
Cohesion: 0.14
Nodes (20): auth.users, public.handle_new_user, public.protect_system_owner, public.protect_system_owner_role, on_auth_user_created, public.audit_logs, public.credit_accounts, public.has_permission() (+12 more)

### Community 13 - "model.ts"
Cohesion: 0.17
Nodes (15): ClipInspector(), InspectorFocus, InspectorPanel(), KIND, num(), OverlayInspector(), SubInspector(), titleFor() (+7 more)

### Community 14 - "run"
Cohesion: 0.18
Nodes (18): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+10 more)

### Community 15 - "assembleTranscript.ts"
Cohesion: 0.33
Nodes (8): assembledDuration(), AssembleOpts, assembleTranscript(), formatTranscriptLines(), WordsBySource, assembledStart(), GAP_SOURCE, isSpeechWord()

### Community 16 - "overlay.ts"
Cohesion: 0.20
Nodes (7): CORNERS, DragState, Handle, PreviewOverlays(), OverlayKind, overlayVisibleAt(), VisualTransform

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.17
Nodes (20): CaptionMode, build_cues(), _ends_phrase(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), _phrase_blocks() (+12 more)

### Community 19 - "VideoPreview.tsx"
Cohesion: 0.20
Nodes (21): ChatProps, Props, Props, Props, Props, VideoPreview, EditorSnapshot, CanvasSize (+13 more)

### Community 20 - "subtitlesEdl.ts"
Cohesion: 0.19
Nodes (20): assembledWords(), CaptionBuildOpts, CaptionMode, collapseProgressiveForBurn(), edlToCues(), edlToCuesWithScript(), edlToSrt(), edlToSubs() (+12 more)

### Community 22 - "providers.ts"
Cohesion: 0.14
Nodes (24): maxDuration, POST(), runtime, anthropicParts(), asText(), callAnthropic(), callGemini(), callOpenAICompat() (+16 more)

### Community 23 - "settings/page.tsx"
Cohesion: 0.16
Nodes (22): SettingsPage(), GROQ_KEY, OPENAI_KEY, PROVIDER_PREF, TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF, ApiConfigShape, flattenApiConfig() (+14 more)

### Community 24 - "transcribe/route.ts"
Cohesion: 0.14
Nodes (24): GET(), runtime, maxDuration, POST(), runtime, GET(), runtime, maxDuration (+16 more)

### Community 25 - "thumbnails.ts"
Cohesion: 0.10
Nodes (29): Filmstrip(), CellThumb(), fmtDur(), KIND_ICON, KIND_LABEL, MediaPanel(), View, Waveform() (+21 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "app/page.tsx"
Cohesion: 0.06
Nodes (67): DashboardPage(), DialogState, fmtDate(), fmtRelativeHe(), ProjectCard(), userAvatarUrl(), userLabel(), COMMAND_ICONS (+59 more)

### Community 32 - "ChatMessage"
Cohesion: 0.33
Nodes (5): Conversation, CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), ChatMessage

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.22
Nodes (9): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+1 more)

### Community 34 - "HANDOFF"
Cohesion: 0.33
Nodes (5): Also on main, Auth, HANDOFF, Next, User action

### Community 35 - "BrandLogo.tsx"
Cohesion: 0.07
Nodes (36): metadata, viewport, OnboardingPage(), Step, BrandLogo(), Props, ChunkReload(), isChunkError() (+28 more)

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

### Community 61 - "uid"
Cohesion: 0.27
Nodes (10): deleteClipRange(), deleteClipsAt(), intersectClipsWithSpeech(), keepSourceRange(), snapSpeechToWords(), uid(), makeImageOverlay(), makeTextOverlay() (+2 more)

### Community 62 - "subtitles.ts"
Cohesion: 0.23
Nodes (14): buildCues(), CaptionMode, Cue, endsPhrase(), endsSentence(), formatCueText(), mapToEdited(), phraseBlocks() (+6 more)

### Community 63 - "providers/policy.ts"
Cohesion: 0.36
Nodes (7): empty(), ensureProviderBillingApproval(), getProviderApprovals(), isProviderBillingApproved(), parseProviderApprovals(), PROVIDER_APPROVALS_KEY, setProviderBillingApproval()

### Community 64 - "מדריך התחברות (Supabase) — צעד־אחר־צעד"
Cohesion: 0.12
Nodes (15): 4א — Google Cloud Console, 4ב — Redirect אחרי התחברות (ב־Supabase), Migration, `No API key found in request` / כתובת עם `/rest/v1/auth/...`, Package A — משתני שרת נוספים, הרצה מקומית (אופציונלי), מדריך התחברות (Supabase) — צעד־אחר־צעד, מה קורה במוצר אחרי זה (+7 more)

### Community 65 - "KeepInterval"
Cohesion: 0.21
Nodes (11): build_keep_intervals(), _merge_overlaps(), KeepInterval, בונה קטעים לשמירה מתוך המילים. שני מקורות לחיתוך, מטופלים באופן אחיד: *…, ממזג קטעים חופפים/נוגעים (יכול לקרות אם threshold < 2*padding)., קטע יחיד המכסה את כל הסרטון (כשלא מבצעים הסרת שתיקות)., מחשב את הקטעים שהוסרו (המשלים של keeps בתוך [0, duration])., removed_intervals() (+3 more)

### Community 67 - "collapseTools.ts"
Cohesion: 0.36
Nodes (6): collapseConsecutiveTools(), CollapsedToolView, CollapsibleTool, mergeToolState(), toolGroupSummary(), toolGroupTitle()

### Community 68 - "REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר"
Cohesion: 0.18
Nodes (10): REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר, אזור 1 — Top bar, אזור 2 — Tool rail (סרגל קטגוריות), אזור 3 — Left content panel (Media), אזור 4 — Viewer / Canvas, אזור 5 — Inspector, אזור 6 — Timeline, אזור 7 — Agent dock (Cursor/Copilot-class) (+2 more)

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

### Community 96 - "config.ts"
Cohesion: 0.09
Nodes (36): POST(), runtime, GET(), runtime, GET(), ContinueInner(), LoginInner(), Tab (+28 more)

### Community 98 - "runtime.ts"
Cohesion: 0.16
Nodes (13): SlashCmd, AgentEvents, AgentRunner, formatLlmError(), formatToolError(), isChunkLoadError(), LOOP_GUARDS, MUTATING_TOOLS (+5 more)

### Community 100 - "canvasCoords.ts"
Cohesion: 0.29
Nodes (11): defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect, rotatePoint() (+3 more)

### Community 101 - "Chat.tsx"
Cohesion: 0.14
Nodes (27): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+19 more)

### Community 102 - "models.ts"
Cohesion: 0.13
Nodes (20): FINALS, getOpcodes(), lcsMatches(), normalizeHebrew(), Op, scriptKeepMask(), buildKeepIntervals(), DEFAULT_FILLERS (+12 more)

### Community 103 - "Hypescript — Brand Guidelines"
Cohesion: 0.13
Nodes (14): Accessibility, Clear space / Minimum size, Email, Hypescript — Brand Guidelines, Metadata / PWA / Social, Palette (נדגם מהלוגו), Theme, כלל מקור (+6 more)

### Community 105 - "ChatMarkdown.tsx"
Cohesion: 0.36
Nodes (4): ChatMarkdown(), contextualFileName(), MdPart, parseChatMarkdown()

### Community 106 - "ChatMediaCard.tsx"
Cohesion: 0.29
Nodes (6): BeatAudioPlayer(), ChatMediaCard(), fmt(), LABEL, MKind, Props

### Community 108 - "elevenlabs/normalize.ts"
Cohesion: 0.21
Nodes (10): ElevenLabsSttRaw, ElevenLabsWordRaw, mapTokenType(), normalizeElevenLabsStt(), DEFAULT_TRANSCRIBE_PREF, defaultModelFor(), resolveTranscribeProvider(), TranscribeConfigured (+2 more)

### Community 109 - "project.ts"
Cohesion: 0.16
Nodes (18): Updater, useEditor(), createHistory(), migrateClips(), migrateState(), audioMuted(), audioTrack(), captionLocked() (+10 more)

### Community 113 - "graph.integration.test.ts"
Cohesion: 0.29
Nodes (5): astream(), fmtDur(), probe(), vPackets(), vstream()

## Knowledge Gaps
- **503 isolated node(s):** `Current task`, `Branch`, `Latest commit`, `Status`, `Exact continuation point` (+498 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EditorApi` connect `commands.ts` to `runtime.ts`, `tools.ts`, `Chat.tsx`, `VideoPreview.tsx`, `app/page.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Overlay` connect `VideoPreview.tsx` to `commands.ts`, `graph.ts`, `Timeline.tsx`, `tools.ts`, `Chat.tsx`, `ffmpeg.ts`, `project.ts`, `model.ts`, `overlay.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `AgentRunner` connect `runtime.ts` to `ChatMessage`, `Chat.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `Current task`, `Branch`, `Latest commit` to the rest of the system?**
  _503 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056107539450613676 - nodes in this community are weakly interconnected._
- **Should `graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12473118279569892 - nodes in this community are weakly interconnected._
- **Should `Timeline.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09672131147540984 - nodes in this community are weakly interconnected._