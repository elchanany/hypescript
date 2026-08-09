# Goal
Make automatic Hebrew promotional edits sound continuous and intentional: no repeated source time, no player/export stalls, no clipped words, and tight breath/pause removal.

# Current State
- `main` contains the earlier overlay safety, mixed-media, caption, brand-kit and composited-frame packages.
- The current gapless-cut package adds hybrid word+waveform cutting, mandatory cut QA, exact render source endpoints, and a double-buffered preview player.
- Auth/Supabase remains outside this task and the local Browser session cannot enter the editor without a valid session.

# Active Files
- `web/lib/editor/clipFilter.ts`: hybrid quiet-valley placement, spoken-word edge protection, source-overlap/clipped-word audit.
- `web/lib/agent/tools.ts`: aggressive tight defaults and fail-closed QA after `remove_silence`.
- `web/components/VideoPreview.tsx`: preloads the next clip in a second media element and checks boundaries every animation frame.
- `web/lib/render/graph.ts`: trims at the requested half-open source end instead of extending to the rounded CFR end.
- `local/hypescript/editing.py`, `media.py`, `cli.py`, `gui.py`: Python parity.

# Verification
- Web full suite: 47 files / 300 tests passed.
- Local Python: 9 tests passed.
- Production build passed after the preview-player rewrite.
- Native FFmpeg 20-cut content test: duration delta 0, audio drift 0, 312/312 frames, max video gap 0.0333s; every join remained audible and switched to the next source tone.
- Local Browser reached the login page only; authenticated live-media playback is not claimed.

# Exact Next Steps
1. With the user's real lecture project/session, rerun `remove_silence(within_existing=true,pacing="tight")`; old saved EDL values are not retroactively repaired until the operation is rerun.
2. Perform listening acceptance on the real lecture around every jump cut; automated proof covers timing/content invariants but not human acoustic taste.
3. Resume the approved local-first organization/brand kit package afterward.
