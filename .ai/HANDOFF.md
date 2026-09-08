# Goal
Enable the hypescript agent to produce end-to-end critical/political campaign shorts (narration, music, SFX, ducking, speaker-aware cuts, cover) without falsely claiming tools are missing.

## 2026-09-08 — campaign agent production capabilities
- Root causes from failed campaign-video session: Hebrew voice search returned empty → agent assumed no TTS; PLAN mode blocked generation tools → agent claimed tools missing; `social_promo` forced upbeat/karaoke; transcript hid speaker labels; no duck/freeze/sfx/cover tools; SYSTEM_PROMPT lacked ElevenLabs v3 direction guidance.
- Fixes: `campaign_critical` goal; voice filter + hebrew empty-search fallback; narration emotion/direction tags; speaker labels + `speaker=` on keep/find; `generate_sfx`, `duck_under_speech`, `freeze_frame`, `export_cover`; SYSTEM_PROMPT campaign + ElevenLabs playbook; docs matrix aligned.
- Verification: `tsc --noEmit` clean; 24 test files / 223 tests green (agent/intent/elevenlabs/duck/speakers).

# Current State
- Branch `cursor/campaign-agent-capabilities-22aa` ready for PR into `main`.
- Live E2E with real ElevenLabs/OpenAI keys still pending (requires cloud auth + keys).

# Exact Next Steps
1. Merge PR after review.
2. Live browser E2E: upload interview clip → campaign brief → narration + music + duck → render + cover.
3. Optionally wire stock B-roll search (Pexels) if product wants non-AI B-roll.
