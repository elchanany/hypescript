# Goal
Make automatic Hebrew promotional edits sound continuous and intentional — no repeated source time, no player/export stalls, no clipped words, tight breath/pause removal — and now brand-consistent visuals (logo, palette, writing guidelines) applied by the agent without fabricating assets.

# Current State
- `main` @ 7ab67e7 contains the local organization/brand kit package: `/settings/brand` stores org/name, tagline, writing guidelines, a normalized color picker palette, and logo/reference images in IndexedDB (local-only), with safe object URL cleanup and an active kit selectable across projects.
- Agent `get_brand_kit` returns a binary-free summary only; `use_brand_asset` imports the Blob through the explicit browser-only `EditorApi.addMediaAsset` boundary (not JSON CommandBus), then `logo_overlay` reuses the existing safe `overlay.addImage` path; `reference_media` imports only. Missing assets are never fabricated; duplicate imports are avoided.
- No cloud sync or new service; the production Supabase auth key is still broken.

# Active Files
- `web/app/settings/brand/page.tsx`: brand kit UI (org/name, tagline, guidelines, palette, images, active kit).
- `web/lib/brand/kit.ts`, `assets.ts`, `previews.ts`: IndexedDB persistence, binary-free summaries, safe object URL lifecycle.
- `web/lib/agent/tools.ts`: `get_brand_kit` + `use_brand_asset` tools and SYSTEM_PROMPT brand rules.
- `web/lib/agent/runtime.ts`, `web/lib/editor/commands.ts`: `addMediaAsset` browser I/O boundary.

# Changes Made
- Local-only organization/brand kits in IndexedDB with a normalized color picker palette and safe object URL cleanup.
- Agent brand tools: binary-free summary read; Blob import via explicit `EditorApi.addMediaAsset`; logo overlay via the existing safe `overlay.addImage`; reference import only; no fabrication; no duplicate import.

# Failed Attempts
- On primary, a later `next build` invocation reached Next build start but timed out after 20m due environment/process contention — that primary invocation did NOT pass. The production build DID pass in the rebased isolated worktree including `/settings/brand`.

# Tests and Verification
- Web: 50 files / 342 tests pass; `tsc` clean.
- Native render integration still `durationDelta=0` / `audioDrift=0`.
- Graphify: 1806 nodes / 4082 edges.
- `npm audit`: 8 existing vulnerabilities (3 moderate, 4 high, 1 critical); no audit fix was applied.

# Open Risks
- Brand UI and `use_brand_asset` are not yet browser E2E tested with real media; composited capture is not yet manually verified.
- Production auth key still broken; no cloud sync.
- 8 npm audit vulnerabilities remain (no fix applied).

# Exact Next Steps
1. Browser E2E the brand UI / `use_brand_asset` and composited capture with real media.
2. Complete the high-level CTA workflow (narration + image + popup) using existing generated media/audio/overlay boundaries and brand context, without fabricating assets.