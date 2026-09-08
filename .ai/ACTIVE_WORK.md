# ACTIVE_WORK.md

## Current task
Campaign / critical political short production capabilities for the hypescript agent (ElevenLabs + edit tools).

## Branch
`cursor/campaign-agent-capabilities-22aa`

## Status
- Implemented agent capability package so a detailed campaign brief can be executed in Act without false "missing tools" claims.
- Key additions: `campaign_critical` intent, Hebrew/campaign voice ranking, v3 direction tags, speaker-aware transcript/cuts, SFX API+tool, music ducking, freeze frame, cover export, SYSTEM_PROMPT playbook.
- Tests: 223 focused agent/intent/elevenlabs tests passing; `tsc` clean.

## Continuation point
After merge: live-key E2E of a full campaign short in the editor (narration segments + music duck + render + cover PNG).
