# AGENT_UI_PARITY

עיקרון: *No feature is complete until it is controllable through both the UI and the AI agent using the same validated command* (כשהפעולה מתאימה סמנטית לסוכן).

**מצב נוכחי (אמת):** יש CommandBus קל (`commands.ts` + builtins). ה-UI קורא ל-`runCommand` לחלק מהפעולות; הסוכן מעביר split/trim/move/add + רצועות וידאו דרך אותו `EditorApi` (עדכון מיידי + Undo), עם נפילה למוטציה ישירה כשאין גשר. מודל: `clip.trackId` + כמה רצועות `video` (cutaway). עדיין חסרים schema/permissions מלאים לכל פעולת UI.

## מקרא
UI ✔/✖ · Agent ✔/✖ · Shared-core ✔ (אותה פונקציה טהורה) · Command (עתידי מזהה)

| יכולת | UI | Agent tool | Shared core | Command עתידי | Undo | הערות/פערים |
|---|---|---|---|---|---|---|
| רשימת מדיה | ✔ | `list_media` | ✔ | `LIST_MEDIA`(query) | n/a | |
| מידע וידאו | ✔(inspector) | `get_video_info` | ✔ | query API | n/a | |
| תמלול | ✔(analyze) | `transcribe_video` | ✔ | `TRANSCRIBE` | n/a | ספק Groq (מפתח) |
| חיתוך לפי סקריפט | ✔(analyze) | `keep_by_script` | ✔ `scriptToClips` | `KEEP_BY_SCRIPT` | ✔ | |
| הסרת קטעים | ✖ישיר | `remove_segments` | ✔ | `REMOVE_SEGMENTS` | ✔ | UI: דרך split+delete |
| הוספת קליפ | ✔(+/dblclick) | `add_clip` | ✔ `addClip` | `ADD_CLIP` | ✔ | |
| פיצול | ✔(S/toolbar) | `split_clip` | ✔ `splitClip` | `SPLIT_CLIP` | ✔ | |
| טרים | ✔(drag) | `trim_clip` | ✔ `trimClip` | `TRIM_CLIP` | ✔ | ripple/roll חסר |
| הזזה/סדר | ✔(drag) | `move_clip` | ✔ `moveClip` | `MOVE_CLIP` | ✔ | |
| מחיקה | ✔(Del/menu) | `delete_clip` | ✔ `removeClip` | `DELETE_CLIP` | ✔ | Gap semantics חסר |
| השבתת קליפ | ✔(menu/inspector) | ✔ `set_clip_enabled` | ✔ `clip.setEnabled` | `clip.setEnabled` | ✔ | UI+Agent דרך אותו CommandBus; fallback רק ללא EditorApi |
| עוצמת קליפ | ✔(inspector) | ✔ `set_clip_volume` | ✔ `clip.setVolume` | `clip.setVolume` | ✔ | UI+Agent דרך אותו CommandBus; clamp מרכזי 0..2 |
| ניתוח אודיו | ✖ | `analyze_audio` | ✔ | query | n/a | |
| הסרת שתיקות | ✖(UI) | `remove_silence` | ✔ | `REMOVE_SILENCE` | ✔ | UI חסר |
| צילום פריים | ✔(preview) | `capture_frame` | ✔ | — | n/a | |
| יצירת כתוביות | ✔ | `generate_subtitles` | ✔ `edlToSubs` | `CREATE_CAPTIONS` | ✔ | |
| עריכת כתובית | ✔ | `edit_subtitle` | ✔ | `UPDATE_CAPTION_TEXT` | ✔ | |
| תזמון/מחיקה/ניקוי כתוביות | ✔(חלקי) | `retime/delete/clear_subtitles` | ✔ | `UPDATE_CAPTION_TIMING`... | ✔ | |
| ייבוא/ייצוא SRT | ✔ | `import/export_srt` | ✔ | `IMPORT_SRT`/`EXPORT_SRT` | ✔ | |
| רינדור/ייצוא | ✔(Export) | `render_video` | ✔ `RenderBackend` | `EXPORT_PROJECT` | n/a | native verified |
| רצועות (rename/lock/mute/height/reorder) | ✔ | ✔ | ✔ `track.rename/setLocked/setMuted/setHeight/reorder` | `track.*` | ✔ | UI+Agent דרך אותו CommandBus; reorder מוגבל לרצועות מאותו סוג |
| רצועת וידאו נוספת / העברת קליפ | ✔(+) | ✔ `add_video_track` / `move_clip_to_track` | ✔ | `track.addVideo` / `clip.moveToTrack` | ✔ | cutaway בנגן+ייצוא |
| שינוי מצב סוכן Ask/Plan/Act | ✔(dock) | n/a | — | — | n/a | חדש |

## פערי Parity מיידיים (לחבילה הבאה)
1. **CommandBus + Command registry** עם `inputSchema/resultSchema/permissions/contexts/agentCallable` — מקור אחד ל-UI/Agent/palette/shortcut/context-menu.
2. **Query API** (`getSelection/getActiveClip/getSelectedRange/getVisibleElementsAtTime/...`) לסוכן.
3. הרחבת registry metadata (`inputSchema/resultSchema/permissions/contexts/agentCallable`) לכל פקודות הרצועה.
4. פעולות ידניות חסרות ב-UI: `remove_segments`/`remove_silence` (כפתורים/תפריט).
5. Message normalizer + idempotency + repair (DeepSeek reasoning) — בדיקות פר-ספק.
