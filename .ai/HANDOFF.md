# Goal
Ship the cloud SaaS path with an honest marketing landing page, card-backed Lemon Squeezy trial, hard server-side quotas and clear upgrade UX, while preserving the verified editor/render pipeline.

# Current State
- 2026-08-11: main has an uncommitted billing/landing package ready for final Git handoff. The live Supabase project now contains a private `trial` entitlement (5 projects, 1GB, 20 render minutes, concurrency 1), trial tracking columns and the target-plan index.
- Lemon production configuration is verified as Test Mode with one product and four exact Creator/Pro month/year variants. The application now fails closed until every paid variant has a one-month trial configured; the Lemon dashboard session still requires the user to sign in before that external setting can be changed.
- `/welcome` is now a full Hebrew marketing page with product story, before/after, use cases, pricing, FAQ and explicit trial disclosures. `/account` shows trial state, usage pressure and upgrade prompts; onboarding preserves the selected paid plan.
- Checkout refuses duplicate active/trial subscriptions and only grants one trial per account. Signed webhooks map trial access to the limited DB plan, retain the intended Creator/Pro target plan, and unlock full quotas only after the trial ends and Lemon reports paid access.
- Verification for this package: 56 files / 395 tests pass, `tsc` clean, isolated production build passes, and local browser QA renders `/welcome` successfully.
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

# 2026-08-11 — persistent workspace + creative catalog foundation

- Restored visible panel/timeline resize handles with pointer, keyboard and double-click reset behavior; saved sizes remain in the existing localStorage keys.
- The default split gives the timeline more room and keeps the composed canvas contained inside the visible preview without document scrolling.
- Chat history is now a named conversation manager with create/rename/delete/select, while provider/model selection has a clear header control.
- Text templates are generic creator patterns rather than lesson-specific copy. Effects and transition tabs apply real clip looks and visual fades shared by Preview and Export.
- Next catalog expansion must follow `docs/CREATIVE_LIBRARY_ARCHITECTURE.md` and preserve Preview/Export parity and asset licensing.
