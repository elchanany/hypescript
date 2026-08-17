# Goal
Ship the cloud SaaS path with an honest marketing landing page, card-backed Lemon Squeezy trial, hard server-side quotas and clear upgrade UX, while preserving the verified editor/render pipeline.

# Current State
- 2026-08-17: Vercel Production Cloud Build Fixed & Deployed (Live Ready)
  1. Identified & resolved build failure: `TEXT_PRESETS` value import in `web/app/page.tsx` was missing (imported as type only).
  2. Fixed `web/lib/creative/effects.ts` and `web/lib/creative/catalog.test.ts` to pass 100% of test suites.
  3. Verified all 74 Vitest test files / 614 tests pass and Next.js isolated production build (49/49 static pages generated).
  4. Deployed and verified on Vercel CLI: deployment `https://hypescript-2794odcua-elchanan-ys-projects.vercel.app` is **● Ready** (Production).
- 2026-08-17: Cross-Device Cloud Sync, Chat Persistence & Complete Purge
  1. Full AI Chat Store Cloud Sync (`Chat.tsx`, `client.ts`): the conversation store is continuously synchronized to `cloud_projects.editor_state.chatStore` in Supabase upon every update, eliminating lost chat history across devices.
  2. Cloud-First Project Hydration (`page.tsx`, `create.ts`): removed stale local cache checks (`if (!raw)`). Cloud projects always fetch the latest state from Supabase, preventing stale local state from overriding remote edits.
  3. Cross-Device Cloud Media Resolution (`page.tsx`, `client.ts`): cloud media with `cloudAssetId` automatically generates signed download URLs (`/api/cloud/assets/[id]/download`) from Cloudflare R2 on remote devices.
  4. Total Purge & Data Reset (`dashboard/page.tsx`, `storage.ts`, `client.ts`): added `purgeAllLocalData()` and `deleteAllCloudProjects()` functions with a one-click dashboard reset dialog.
  5. Default Cloud Policy (`types.ts`, `create.ts`): all new projects default to `dataMode: "cloud"` and R2 storage backend.
  6. Multi-agent isolated build verified clean (`Compiled successfully`, exit code 0).
- 2026-08-15: Video Player Pro Upgrade, Stable Transport Dimensions, TopBar Cleanup & Spacious ChatGPT Chat Focus Mode
  1. Pro Video Player Upgrades (`VideoPreview.tsx`, `globals.css`): continuous draggable Scrubber progress bar, 15s forward/backward skip buttons (`RotateCcw`/`RotateCw`), speed toggle button (`0.5x`, `1x`, `1.25x`, `1.5x`, `2x`), stable audio meter (`.audio-eq-bars` fixed 24x16px with `.is-idle` / `.is-playing` states eliminating bar resizing jitter), and integrated Aspect Ratio picker in the player HUD.
  2. Cleaned TopBar (`TopBar.tsx`, `globals.css`): brand logo pinned permanently to the far top-left (`tb-logo` first element in `topbar2`), removed Aspect Ratio picker and Language selector from the main editor topbar (Aspect Ratio lives in player HUD, Language in `/settings`).
  3. Spacious ChatGPT Chat Focus Mode (`Chat.tsx`, `globals.css`): expanded chat container (`.chat-gpt-container`) to `980px` max-width with outer screen-edge scrollbar, eliminated the double/inner scrollbar on `textarea` in `.chat-compose`, and synchronized **hypescript AI** robot branding (`Bot`).
  4. CapCut-style 2D Free-Drag Engine (`Timeline.tsx`, `globals.css`): smooth 2D tracking across time and tracks, fixed 2D ghost card with thumbnail/waveform, duration and target track badge (`🧲`), active lane highlighting and landing box (`.tl-drop-box`).
  5. Infinite Dynamic Track Creation on Drag/Drop (`Timeline.tsx`, `page.tsx`): removed arbitrary track limits; dragging downward dynamically spawns a new video track (`__new_track__`).
  6. Truly Infinite Grid Across Viewport & Zoom (`Timeline.tsx`, `globals.css`): `visibleTotal = total / zoom` at `zoom < 1` and `min-width: 100%`, ensuring grid lines and ruler ticks stretch seamlessly across the entire screen.
- Full verification: 73 Vitest test suites / 591 tests passing (100% green), Next.js isolated multi-agent production build (`agent-build.mjs --name=chat-player-polish`) compiling cleanly with 45/45 static pages.

# Active Files
- `web/app/page.tsx`: render auto-opens chat, passes `latestExport`; URL lifecycle split (revoke previous on replace, current on unmount).
- `web/components/Chat.tsx`: `latestExport` prop, pinned export card at the end of the message list (after the thinking indicator).
- `web/components/ChatMediaCard.tsx`: custom video player (play/pause, seek, time, mute, fullscreen, error), `controlsList=nodownload`, safe download + "פתח בחלון חדש" anchors.
- `web/lib/render/videoCard.ts` + `videoCard.test.ts`: `formatTime`, `safeDownloadName` helpers + 7 tests.
- `web/app/globals.css`: pinned-export and vplayer styles.

# Changes Made
- Manual render result now appears in the chat dock as a pinned video card instead of only in the export dialog.
- Video cards use a custom player with full transport controls and a safe download name; agent artifact cards unchanged.
- Blob URL lifecycle fixed: previous export URL revoked only when replaced, current revoked on unmount.

# Failed Attempts
- No live browser E2E of the pinned player yet; primary-workspace production build could not run because `.next` is locked by a running dev process (verified on an identical patched worktree instead).

# Tests and Verification
- 54 files / 388 tests pass; `tsc` clean.
- Production build passed in a temp worktree (primary `.next` locked by a running dev process).
- Graphify: 1978 nodes / 4420 edges.
- `npm audit`: 8 existing vulnerabilities remain (no fix applied).

# Open Risks
- Pinned card is session-only: blob URL dies on full page reload (output items were always session-only).
- Primary-workspace build remains blocked by a locked `.next` while a dev process runs (environment, not code).
- Production Supabase auth key still broken; cloud org sync blocked.
- 8 npm audit vulnerabilities remain.

# Exact Next Steps
1. Browser E2E the pinned export player (play/seek/mute/fullscreen/download) with a real render.
2. Fix the production Supabase key before any cloud org sync.

# 2026-08-11 — persistent workspace + creative catalog foundation

- Restored visible panel/timeline resize handles with pointer, keyboard and double-click reset behavior; saved sizes remain in the existing localStorage keys.
- The default split gives the timeline more room and keeps the composed canvas contained inside the visible preview without document scrolling.
- Chat history is now a named conversation manager with create/rename/delete/select, while provider/model selection has a clear header control.
- Text templates are generic creator patterns rather than lesson-specific copy. Effects and transition tabs apply real clip looks and visual fades shared by Preview and Export.
- Next catalog expansion must follow `docs/CREATIVE_LIBRARY_ARCHITECTURE.md` and preserve Preview/Export parity and asset licensing.

# 2026-08-11 — complete AI video editor rebrand

- Replaced the generic play ribbon with a compact H built from timeline rails and an integrated playhead; the horizontal lockup explicitly says `AI VIDEO EDITOR`.
- `BrandLogo` remains the single UI entry point. Canonical SVGs now feed editor, landing, auth, dashboard, account, onboarding, settings and legal surfaces.
- Regenerated favicon PNG/ICO, Apple/PWA/maskable icons, raster lockups, Open Graph/Twitter cards and subscription product artwork. Landing metadata now names the product as a Hebrew AI video editor.
- Raster derivatives are reproducible with `scripts/generate-brand-assets.py`; canonical SVG geometry stays sharp down to 16px.
