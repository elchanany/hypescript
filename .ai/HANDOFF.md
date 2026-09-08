# Goal
Agent can execute an end-to-end critical/political campaign short (Hook → narration → music duck → SFX/freeze/cover → render) without false “missing tools” claims.

## Verified state (2026-09-08)
- Branch: `cursor/campaign-agent-capabilities-22aa` @ `f72dba3` (feature `d1abfdd` + continuity)
- PR: https://github.com/elchanany/hypescript/pull/35 (draft → `main`)
- Re-verify this turn: `npx tsc --noEmit` clean; 24 files / 223 tests green (agent + intent + elevenlabs + duck + speakers).
- Graphify: `graphify update . --force` → 4003 nodes / 9050 edges / 222 communities.

## What landed
- Intent `campaign_critical` (portrait, cinematic, phrase, narration).
- Voices: campaign ranking + empty-`hebrew` search fallback; Hebrew = `eleven_v3` + `language_code=he`.
- Narration direction tags (`emotion` / `direction_tag`).
- Speaker labels in transcript; `speaker=` on `keep_by_script` / `find_in_transcript`.
- New tools: `generate_sfx`, `duck_under_speech`, `freeze_frame`, `export_cover`.
- SYSTEM_PROMPT campaign + ElevenLabs playbook; GAP_MAP / provider matrix aligned.

## Open
- Live-key browser E2E (cloud auth + ElevenLabs/OpenAI) not run.
- Stock B-roll search still out of scope.

## Next
1. Review/merge PR #35.
2. Live E2E: interview clip → campaign brief → narration segments + music duck → render + cover.
