# User-Reported Blockers

Every issue the product owner reported, tracked until **verified in the running product** —
not closed because "something similar" was changed.

**Status values:** `open` · `investigating` · `root-caused` · `fixed-unverified` · `verified` · `deferred-by-owner`

> Rule: `verified` means it was exercised in the real app (or by a real render/API call), not that
> a build passed. `deferred-by-owner` is only for the two things the owner explicitly postponed:
> full integration of providers with no keys yet, and marketing assets in languages other than Hebrew.

---

## P0 — Editor core (product is not usable without these)

| ID | Issue | Status | Root cause / notes |
|----|-------|--------|--------------------|
| B-36 | **Editor rendered a blank white page** (whole app dead) | **fixed, verified in browser** | `useEditor` returned an `addOverlay` that was never defined in the hook, so building its return object threw `ReferenceError` on every render and the entire EditorPage unmounted into the error boundary. A partial edit had been left in the working tree without ever running `tsc` (which does catch it — TS18004, confirmed with a probe). Before: `document.body` had 0 characters. After: editor root, top bar, tool rail and timeline all render. |
| B-01 | Drag a clip on the timeline → it moves, but **snaps back on release** | **verified in browser** | Root cause was B-02 (the vacated space collapsing). Verified live: a clip at `left: 0%` was dragged 30% of the lane and, after mouseup, stayed at `left: 23.09%` and remained selected. Reload-persistence not yet re-checked. |
| B-02 | **Free placement** — must be able to drop at any time (00:03.200), leave gaps, not forced adjacent | **fixed** | Root cause proven by probe: on the PRIMARY video track `moveClipAtTimeline` filtered the clip out instead of leaving a gap, so every later clip slid left (A[0-2] B[2-4] C[4-6] → moving B to 10s moved C from 4s to 2s). Now the vacated space becomes a gap on every track. 5 regression tests in `lib/editor/freePlacement.test.ts`. Needs browser confirmation. |
| B-03 | **Magnetic snapping** with vertical guide; snapped timestamps must be **exactly** equal | **fixed** | Snapping, guides and an Alt bypass already existed and the radius was already pixel-derived — but it was clamped with `Math.max(0.04, …)`, and 0.04s is longer than a frame at 30fps, so zooming in for frame-accurate work could not defeat the magnet. Now `snapToleranceSec()` (pure, 6 tests) with `SNAP_PIXELS = 10` and no seconds floor. |
| B-04 | **Audio-only files must not create a visual layer** (mp3 showing as video rectangle/thumbnail) | **verified (logic)** | Verified: both add paths route `kind === "audio"` to the audio track, and `usableClips` excludes audio from the visual set, so it cannot cover the video. Locked by `lib/render/audioOnly.test.ts` (4 tests). |
| B-05 | **Overlap is a feature** — multiple video/image/text/audio at the same time on different tracks | open | Timeline must not be a single linear sequence. |
| B-06 | **Z-order / layer reorder** consistent between Canvas, Timeline, Inspector and Export | open | UI numbering must not be inverted between Timeline and Canvas. |
| B-07 | **Select a layer behind another layer** on the canvas (Alt+Click cycling / layer picker) | open | |
| B-08 | **Playhead hard to drag** at some zoom levels | open | Needs bigger hit area than the 1px line + pointer capture. |
| B-09 | **Ruler ticks disappear** at low zoom | open | Needs adaptive tick density (frames → sec → 5s → 30s → 1m → 5m). |
| B-10 | Linked video/audio must **not** behave as multi-selection | open | Link ≠ selection; split/trim/move affect both only when Linked Selection is ON. |

## P1 — Interaction & UX

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| B-11 | Chat bubbles: user vs agent must point opposite directions, RTL correct, minimal (not childish) | open | |
| B-12 | Composer collisions — `+`, `@`, attach, stop, send overlap the text | open | Needs explicit left/right action zones and padding that accounts for button widths. |
| B-13 | Stop button overlaps composer while the agent works | open | |
| B-14 | **Steering queue** — send guidance while the agent works; queued items listed compactly with "push now" | partial | An inject-message path exists; the ordered, editable, per-item queue with statuses does not. |
| B-15 | Frame/screenshot attachments in chat are **cropped/clipped** | open | Must preserve aspect ratio, click to expand. |
| B-16 | Agent output media (image/audio/video) needs real previews + players + "add to timeline" | open | |
| B-17 | Upload progress widget is off to the side; should be centred under the player | open | |
| B-18 | Clear **back-to-projects** button in the editor | likely-fixed | TopBar now has two dashboard links; needs visual verification. |
| B-19 | App-level **z-index architecture** (dropdown behind preview, etc.) | open | Needs stacking tokens, not scattered z-index numbers. |

## P2 — Platform / SaaS

| ID | Issue | Status | Root cause / notes |
|----|-------|--------|--------------------|
| B-20 | **ElevenLabs "not working"** → inaccurate transcription | **root-caused** | Key is **valid**; Hebrew STT verified working (scribe_v1 + scribe_v2, HTTP 200, `heb` @ p=1.0, word timestamps). The account is **free tier at 7,249/10,000 chars (72%)**. On exhaustion the route silently falls back to Groq with `quality: reduced` — that is the "inaccurate transcription". **Owner action required: upgrade the ElevenLabs plan.** |
| B-21 | No way to tell a working provider from a configured-but-broken one | **fixed-unverified** | Added live probes (`lib/providers/probe.server.ts`), `unhealthy` status, admin endpoint `/api/providers/health`, and CLI `node scripts/check-providers.mjs`. Verified locally against the live ElevenLabs API. |
| B-22 | **413 Request Entity Too Large** | **root-caused (partially)** | **Not** media upload: uploads use presigned URLs straight to R2 (`api/cloud/uploads`), limit 5 GB. **Not** transcription: audio is chunked to 120 s ≈ 0.72 MB, well under the 4.5 MB Vercel body cap. Remaining suspect: `/api/agent` — JSON bodies carrying base64 images/screenshots exceed the 4.5 MB serverless body limit. Fix direction: send attachments via presigned R2 upload and pass a URL, never inline base64. |
| B-23 | Cloud must be the **default**: files in cloud, cross-device login, edits/chats saved, **fast cloud render** | investigating | Audit in progress → `docs/CLOUD_SAAS_AUDIT.md`. R2 + Supabase + CLOUD_RENDER_URL are all configured in production. |
| B-24 | Lemon Squeezy still in **test mode**; real subscriptions must work | investigating | Store/products/keys exist. Owner confirms the store was approved. Needs test→live switch verification. |
| B-25 | Brand Kit must sync to the **cloud**, not local-only | investigating | Part of B-23 audit. |
| B-26 | BYOK explained gently for non-technical users; upsell not an error message | open | |
| B-27 | Error reporting to admin, friendly error text instead of raw HTTP codes | open | |
| B-28 | Email system (transactional + lifecycle + unsubscribe + branded RTL) | open | |
| B-29 | Full Hebrew localisation incl. landing assets, correct gender/plural forms | open | i18n system exists; coverage unverified. |

## P3 — Agent brain

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| B-30 | **Ask / Plan / Act** modes must genuinely change behaviour; Ask blocked from tools **at system level**; **Plan is the default** | investigating | Assigned. |
| B-31 | **Conversation titles** auto-generated like ChatGPT | investigating | Assigned. |
| B-32 | **Cross-conversation short-term memory**, summary of last 5 chats, **cached** (no repeated summarisation) | investigating | Assigned. |
| B-33 | Agent must know every tool/provider it has and choose intelligently (generate vs. import from stock) | open | Stock providers already configured: Pexels, Pixabay, Unsplash, Freesound. |
| B-34 | Agent **self-QA**: render the frame at time T, look at its own work, fix visual problems | open | |
| B-35 | Agent must never silently overwrite a manual user edit (`protectedFromAutomation`) | open | |

## Creative library — measured inventory

Real counts, obtained by importing the modules (not by grepping):

| Category | Count | Source |
|---|---|---|
| Video effects | **85** | internal |
| Filters / looks | **65** | internal (FFmpeg-backed) |
| Transitions | **57** | **every FFmpeg `xfade`** minus `squeezev` (segfaults FFmpeg 8.0.1) |
| Clip animations (in/out/combo) | **70** | internal |
| Text animations | 20 | internal |
| Text templates | 50 | internal |
| Caption styles | 23 | internal |
| Shapes | 16 | internal |
| Fonts (curated) | 27 | internal — **being expanded** |
| Motion assets | 9 | internal |
| Stickers (starter) | 12 | internal |
| Icons (curated) | 19 | internal — **being expanded** |

**Keyless expansion verified available (no API key, no cost):**
- **Google Fonts** — `fonts.google.com/metadata/fonts` returns **1,942 families, 62 with the Hebrew subset**.
- **Iconify** — `api.iconify.design/collections` returns **236 sets ≈ 334,395 icons**; licenses vary per set
  (MIT 106, CC BY 4.0 52, Apache 2.0 31, OFL 13, CC BY-SA 4.0 6) and must be tracked per set.
- **GIPHY** genuinely needs a free key (`GIPHY_API_KEY`, not configured) — must show an honest
  "not configured" state, never a fake "connected".
