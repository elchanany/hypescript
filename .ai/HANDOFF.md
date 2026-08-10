# Goal
Make automatic Hebrew promotional edits sound continuous and intentional — no repeated source time, no player/export stalls, no clipped words, tight breath/pause removal — and now brand-consistent visuals (logo, palette, writing guidelines) plus generated narration/image CTA assets applied by the agent without fabricating assets.

# Current State
- `main` @ f233969: manual render now auto-opens the chat dock and passes `exportResult` into Chat as `latestExport`, rendered as a pinned ChatMediaCard (page-owned state, survives dock close/reopen in-session).
- ChatMediaCard video is a custom player: play/pause (button + click video), seek slider, current/total time, mute toggle, fullscreen, error state; `controlsList=nodownload`; download uses `safeDownloadName` (.mp4 sanitized) plus a "פתח בחלון חדש" fallback anchor (target=_blank rel=noopener).
- page.tsx URL lifecycle split: abort cleanup is unmount-only; previous export blob URL revoked when replaced, current on unmount — no premature revocation.
- New pure helpers `web/lib/render/videoCard.ts` (formatTime, safeDownloadName) + 7 tests.
- Earlier CTA asset pipeline (persisted narration + GPT images) remains merged on main.
- Production Supabase auth key still broken; no cloud sync.

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