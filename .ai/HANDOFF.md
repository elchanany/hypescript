# HANDOFF

## Goal
תיקון תמלול תקוע + בהירות צ'אט/ספק + כלי גודל וידאו לסוכן.

## Current State
- Branch: `cursor/agent-timeouts-chat-ux-505e`
- **Timeout לכל כלי** ב-runtime (כולל AbortSignal ב-Stop) + הודעת שגיאה עם שלב אחרון.
- תמלול: timeout על חילוץ אודיו + על כל chunk ל-API; סיבת שגיאה בעברית עם שם הספק.
- כרטיסי כלי מציגים **ספק השירות** (ElevenLabs/Groq) ולא את ספק ה-LLM.
- הודעות צ'אט עם תווית **אתה** / **סוכן · DeepSeek**.
- כלי חדש `set_video_transform` (רוחב/גובה/scale/Fit) + wiring ל-`videoTransform` בעורך.

## Exact Next Steps
1. Commit/push + PR.
2. Smoke: שלח תמלול ובטל / המתן לtimeout; שנה גודל וידאו דרך הסוכן.
