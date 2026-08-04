# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth אופציונלי.

## Current State (verified)
ענף: `cursor/timeline-media-drag-ghost-e91a`
- גרירת קליפים/שכבות בטיימליין עם **כרטיס תצוגה מקדימה** (תמונה/פעימות) ליד העכבר
- גרירה מספריית מדיה לציר עם drag-image ויזואלי + קו drop
- `onDropMedia` מכניס קליפ באינדקס היעד (תמונה → overlay)

## Exact Next Steps
1. למזג ולרענן פריסה — לאמת גרירה מהמדיה + ghost בקליפ
2. EDL אודיו נפרד / רצועות וידאו מרובות — בהמשך

## Risks
- `setDragImage` דורש thumb מסונכרן; thumbs נטענים מראש לרשת
