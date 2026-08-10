# Goal
Make automatic Hebrew promotional edits sound continuous and intentional — no repeated source time, no player/export stalls, no clipped words, tight breath/pause removal — and now brand-consistent visuals (logo, palette, writing guidelines) plus generated narration/image CTA assets applied by the agent without fabricating assets.

# Current State
- `main` @ f368261 adds the CTA asset pipeline. `generate_narration` persists generated ElevenLabs audio into project media via `EditorApi.addMediaAsset`, returns a stable `@media:<id>` and exact `add_clip` guidance (timeline_start = end of timeline, audio track name).
- New `openai-image` provider (kind `image`) reuses `OPENAI_API_KEY` with a distinct fail-closed billing approval. `/api/openai/images` validates allowlisted gpt-image-1 parameters, calls official `images/generations` with `output_format=png` (no unsupported `response_format`), decodes `b64_json`. No live key call was made.
- `generate_image` optionally appends a bounded binary-free brand brief (org/tagline/colors/guidelines only — never blobs/URLs/IDs), explicitly never fabricates a logo, registers the PNG into project media and returns `@media` + artifact.
- CTA system flow keeps new CTA text out of `keep_by_script`, uses brand assets first, exact audio/image/card span, composited verification.
- Production Supabase auth key still broken; no cloud sync.

# Active Files
- `web/lib/agent/tools.ts`: `registerMediaAsset`, `formatNarrationResult`, `generate_image`, `buildImageBrandBrief`/`buildImagePrompt`, CTA SYSTEM_PROMPT rules.
- `web/lib/openai/images.ts` + `web/app/api/openai/images/route.ts`: pure validation/payload/decode helpers and the server route.
- `web/lib/providers/registry.ts`/`types.ts`/`health.ts`, `web/app/api/config/route.ts`, `web/app/settings/page.tsx`: `openai-image` provider + billing approval UI.
- `web/lib/agent/runtime.ts`: `generate_image` added to mutating tools.

# Changes Made
- Narration media now persists through the browser media boundary (no duplicate import, no array mutation) and returns stable `@media:<id>` + exact `add_clip` CTA guidance.
- OpenAI GPT Image provider added separately with per-capability billing approval; route validates allowlisted params, uses official API, PNG output, b64 decode, secret-redacted Hebrew errors.
- `generate_image` brand brief is bounded text-only; never fabricates logo; registers PNG and returns `@media` + artifact.

# Failed Attempts
- No live OpenAI/ElevenLabs key call was made; acoustic quality is not claimed proven without real media.

# Tests and Verification
- Narration branch: 51 files / 351 tests + tsc/build pass. Image branch: 53 files / 381 tests + tsc/build pass (verified on main).
- Native integrations still `durationDelta=0` / `audioDrift=0`.
- Graphify: 1851 nodes / 4186 edges.
- `npm audit`: 8 existing vulnerabilities remain (no fix applied).

# Open Risks
- Live browser E2E with a real lecture + ElevenLabs/OpenAI keys not yet done; composited capture/brand UI not manually verified.
- Production Supabase auth key still broken; cloud org sync blocked.
- 8 npm audit vulnerabilities remain.

# Exact Next Steps
1. Browser E2E the CTA flow (narration + image + popup) and composited capture with real media and live keys.
2. Fix the production Supabase key before any cloud org sync.