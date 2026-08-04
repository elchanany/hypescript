# Graph Report - workspace  (2026-08-04)

## Corpus Check
- 152 files · ~93,288 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 901 nodes · 1898 edges · 61 communities (48 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f26cd7b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- agent/types.ts
- app/page.tsx
- ffmpeg.ts
- time.ts
- tools.ts
- package.json
- HypescriptGUI
- model.ts
- transcription.py
- compilerOptions
- editing.py
- media.py
- providers.ts
- thumbnails.ts
- run
- Clip
- overlay.ts
- What You Must Do When Invoked
- subtitles.py
- project.ts
- canvasCoords.ts
- History
- RenderBackend.ts
- layout.tsx
- transcribe/route.ts
- graph.ts
- end-of-turn-maintenance.sh
- track-edit.sh
- next.config.js
- What You Must Do When Invoked
- Chat.tsx
- health.ts
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
- overlayBurn.integration.test.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native AGENTS.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- keys.ts
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .agents/skills/graphify/references/extraction-spec.md
- graphify
- .claude/skills/graphify/references/extraction-spec.md
- handoff.md

## God Nodes (most connected - your core abstractions)
1. `EditorPage()` - 47 edges
2. `Clip` - 37 edges
3. `Overlay` - 31 edges
4. `HypescriptGUI` - 27 edges
5. `MediaAsset` - 24 edges
6. `run()` - 23 edges
7. `Chat()` - 23 edges
8. `CanvasSize` - 22 edges
9. `uid()` - 22 edges
10. `EditorApi` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Config` --uses--> `KeepInterval`  [INFERRED]
  local/hypescript/cli.py → local/hypescript/models.py
- `parseFillers()` --indirect_call--> `normalizeHebrew()`  [INFERRED]
  web/lib/editing.ts → web/lib/align.ts
- `write_cut_log()` --calls--> `kept_duration()`  [EXTRACTED]
  local/hypescript/cli.py → local/hypescript/editing.py
- `run()` --calls--> `build_keep_intervals()`  [EXTRACTED]
  local/hypescript/cli.py → local/hypescript/editing.py
- `run()` --calls--> `filler_mask()`  [EXTRACTED]
  local/hypescript/cli.py → local/hypescript/editing.py

## Import Cycles
- None detected.

## Communities (61 total, 13 thin omitted)

### Community 0 - "agent/types.ts"
Cohesion: 0.12
Nodes (18): SlashCmd, Conversation, CANCELLED_RESULT, isToolHistoryValid(), repairToolMessages(), AgentEvents, AgentRunner, MODE_PROMPTS (+10 more)

### Community 1 - "app/page.tsx"
Cohesion: 0.06
Nodes (46): download(), EditorPage(), kindOf(), probeDuration(), CaptionsPanel(), CellThumb(), fmtDur(), KIND_ICON (+38 more)

### Community 2 - "ffmpeg.ts"
Cohesion: 0.15
Nodes (21): extOf(), extractAudio(), extractFrame(), ffQueue, getFFmpeg(), LogFn, renderEDL(), runExclusive() (+13 more)

### Community 3 - "time.ts"
Cohesion: 0.17
Nodes (19): InspectorPanel(), TimelineToolbar(), clampTime(), clampZoom(), formatQuoteTime(), formatTimecode(), MS, msToSec() (+11 more)

### Community 4 - "tools.ts"
Cohesion: 0.05
Nodes (59): clipsSummary(), findRanges(), fmt(), mainVideo(), Reporter, ToolMeta, TOOLS, transcriptOf() (+51 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (34): @ffmpeg/ffmpeg, @ffmpeg/util, lucide-react, next, react, react-dom, @types/node, @types/react (+26 more)

### Community 6 - "HypescriptGUI"
Cohesion: 0.11
Nodes (7): Frame, build_command(), HypescriptGUI, main(), ממשק משתמש גרפי קליל ל-hypescript (Tkinter, בלי תלויות נוספות). ה-GUI הוא…, בונה את רשימת הארגומנטים ל-``python -m hypescript`` מתוך ערכי הטופס., Tk

### Community 7 - "model.ts"
Cohesion: 0.18
Nodes (21): SOURCE_COLORS, Timeline(), TYPE_ICON, IconButton(), ensureBuiltinCommands(), registerCommand(), assembledToSource(), clipDur() (+13 more)

### Community 8 - "transcription.py"
Cohesion: 0.12
Nodes (25): מבני נתונים משותפים לכל שלבי ה-pipeline. חשוב: שני מנועי התמלול (מקומי וענן)…, מילה בודדת עם חותמות זמן (בשניות, על ציר הזמן המקורי של הווידאו)., קטע דיבור (משפט/שורה) כפי שהחזיר מנוע התמלול, מכיל את המילים שלו., כל המילים מכל הקטעים, ממוינות לפי זמן התחלה., Segment, Transcript, Word, _cloud_payload_to_transcript() (+17 more)

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
Cohesion: 0.15
Nodes (21): maxDuration, POST(), runtime, GET(), runtime, anthropicParts(), asText(), callAnthropic() (+13 more)

### Community 13 - "thumbnails.ts"
Cohesion: 0.16
Nodes (19): Filmstrip(), Waveform(), cache, filmstripCount(), fp(), getSource(), getThumbnail(), seek() (+11 more)

### Community 14 - "run"
Cohesion: 0.18
Nodes (17): ArgumentParser, build_parser(), Config, config_from_args(), _fmt(), main(), _print_summary(), KeepInterval (+9 more)

### Community 15 - "Clip"
Cohesion: 0.21
Nodes (20): ChatProps, Props, CORNERS, DragState, Handle, PreviewOverlays(), Props, Props (+12 more)

### Community 16 - "overlay.ts"
Cohesion: 0.29
Nodes (4): makeImageOverlay(), nextZ(), OverlayKind, VisualTransform

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "subtitles.py"
Cohesion: 0.19
Nodes (13): build_cues(), _ends_sentence(), _format_cue_text(), format_timestamp(), map_to_edited(), KeepInterval, Word, יצירת קובץ SRT מסונכרן, על ציר-הזמן של הסרטון *הערוך* (אחרי החיתוכים). נקודה… (+5 more)

### Community 19 - "project.ts"
Cohesion: 0.24
Nodes (12): Updater, useEditor(), migrateState(), captionLocked(), captionTrack(), DEFAULT_CANVAS, defaultTracks(), normalizeCanvas() (+4 more)

### Community 20 - "canvasCoords.ts"
Cohesion: 0.14
Nodes (17): defaultCanvasFor(), displayRect(), getViewportScale(), hitTestRect(), Point, projectToViewport(), Rect, rotatePoint() (+9 more)

### Community 22 - "RenderBackend.ts"
Cohesion: 0.20
Nodes (5): browserBackend, BrowserRenderBackend, ExecutionMode, RenderBackend, RenderCapabilities

### Community 23 - "layout.tsx"
Cohesion: 0.47
Nodes (3): metadata, ChunkReload(), isChunkError()

### Community 24 - "transcribe/route.ts"
Cohesion: 0.40
Nodes (3): maxDuration, PROVIDERS, runtime

### Community 25 - "graph.ts"
Cohesion: 0.19
Nodes (14): ClipInspector(), KIND, num(), OverlayInspector(), clipEnabled(), clipVolume(), mediaById(), aChain() (+6 more)

### Community 30 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 31 - "Chat.tsx"
Cohesion: 0.18
Nodes (22): Chat(), fmtTc(), Item, KIND_ICON, MODES, now(), SLASH, TOOL_ICON (+14 more)

### Community 32 - "health.ts"
Cohesion: 0.26
Nodes (14): SettingsPage(), ApiConfigShape, flattenApiConfig(), getProviderStatus(), getProviderStatuses(), isProviderConfigured(), LLM_PROVIDERS, PROVIDER_BY_ID (+6 more)

### Community 33 - "AGENTS.md — נקודת הכניסה לכל סוכן"
Cohesion: 0.15
Nodes (10): AGENTS.md — נקודת הכניסה לכל סוכן, Continuity (חובה לפני עבודה מהותית), graphify, השלב הנוכחי, לפני שנוגעים בקוד, מבנה הפרויקט (שתי אפליקציות), מה בטווח עכשיו / מה לא, מה זה hypescript (+2 more)

### Community 34 - "HANDOFF"
Cohesion: 0.18
Nodes (10): Active Files, Changes Made, Current State, Exact Next Steps, Failed Attempts, Git State, Goal, HANDOFF (+2 more)

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

### Community 52 - "keys.ts"
Cohesion: 0.50
Nodes (3): GROQ_KEY, OPENAI_KEY, PROVIDER_PREF

## Knowledge Gaps
- **234 isolated node(s):** `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)`, `Step 1 - Ensure graphify is installed`, `Step 2 - Detect files` (+229 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Clip` connect `Clip` to `app/page.tsx`, `ffmpeg.ts`, `graph.integration.test.ts`, `tools.ts`, `model.ts`, `overlayBurn.integration.test.ts`, `project.ts`, `canvasCoords.ts`, `RenderBackend.ts`, `graph.ts`, `Chat.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `MediaAsset` connect `Clip` to `app/page.tsx`, `ffmpeg.ts`, `graph.integration.test.ts`, `tools.ts`, `model.ts`, `overlayBurn.integration.test.ts`, `canvasCoords.ts`, `RenderBackend.ts`, `graph.ts`, `Chat.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Overlay` connect `Clip` to `app/page.tsx`, `ffmpeg.ts`, `tools.ts`, `model.ts`, `overlay.ts`, `project.ts`, `canvasCoords.ts`, `RenderBackend.ts`, `graph.ts`, `Chat.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)` to the rest of the system?**
  _234 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `agent/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05868544600938967 - nodes in this community are weakly interconnected._
- **Should `ffmpeg.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._