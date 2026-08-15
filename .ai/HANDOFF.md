# Goal
Ship the cloud SaaS path with an honest marketing landing page, card-backed Lemon Squeezy trial, hard server-side quotas and clear upgrade UX, while preserving the verified editor/render pipeline.

# Current State
- 2026-08-15: CapCut-style 2D Drag Engine, Infinite Dynamic Tracks & Extended Viewport Grid implemented and verified.
  1. CapCut-style 2D Free-Drag Engine (`Timeline.tsx`, `globals.css`): smooth 2D tracking across time and tracks, fixed 2D ghost card with thumbnail/waveform, duration and target track badge (`🧲`), active lane highlighting and landing box (`.tl-drop-box`).
  2. Infinite Dynamic Track Creation on Drag/Drop (`Timeline.tsx`, `page.tsx`): removed arbitrary 8-track limits and manual add button; dragging downward or dropping media automatically spawns a new video track dynamically on-the-fly (`__new_track__`).
  3. Truly Infinite Grid Across Viewport & Zoom (`Timeline.tsx`, `globals.css`): `visibleTotal = total / zoom` at `zoom < 1` and `min-width: 100%`, ensuring grid lines and ruler ticks stretch seamlessly across the entire screen without black cutoffs.
  4. Global floating tooltips rendered through top-level portal (`z-index: 999999`) preventing tooltip clipping.
  5. Inline Composer tags/mentions (`[⏱️ ...]`, `[@media:...]`) inserted cleanly inside prompt text and parsed into structured references.
  6. Direct Aspect Ratio switcher (9:16 TikTok/Reels, 16:9 YouTube, 1:1 Instagram, 4:5, 4:3, 21:9) in TopBar and Inspector, plus horizontal/vertical mirroring controls.
  7. AI Agent full tool awareness (`set_aspect_ratio`, `add_track`, `set_clip_flip`).
- Full verification: 72 Vitest files / 554 tests passing (100% green), Next.js isolated multi-agent build (`agent-build.mjs`) passing with 45/45 static pages and clean TypeScript validation.

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
