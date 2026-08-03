# AGENT_UI_PARITY

עיקרון: *No feature is complete until it is controllable through both the UI and the AI agent using the same validated command* (כשהפעולה מתאימה סמנטית לסוכן).

**מצב נוכחי (אמת):** אין עדיין CommandBus מרכזי. ה-UI משנה state דרך `useEditor` (History), והסוכן משנה state דרך כלים ב-`lib/agent/tools.ts` הפועלים על אותו מודל EDL (`clips`/`subs`). הלוגיקה מנותבת לפונקציות טהורות משותפות ב-`lib/editor/model.ts` (split/trim/move/remove) ו-`subtitlesEdl.ts` — כך שיש **שיתוף מנוע**, אך לא רישום Command אחיד עם schema/permissions/validation. איחוד ל-CommandBus הוא חבילת "CommandBus & Agent parity" (Package C/5).

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
| השבתת קליפ | ✔(menu/inspector) | ✖ | ✔ `enabled` | `DISABLE_CLIP` | ✔ | להוסיף כלי-סוכן |
| עוצמת קליפ | ✔(inspector) | ✖ | ✔ `volume` | `SET_CLIP_VOLUME` | ✔ | להוסיף כלי-סוכן |
| ניתוח אודיו | ✖ | `analyze_audio` | ✔ | query | n/a | |
| הסרת שתיקות | ✖(UI) | `remove_silence` | ✔ | `REMOVE_SILENCE` | ✔ | UI חסר |
| צילום פריים | ✔(preview) | `capture_frame` | ✔ | — | n/a | |
| יצירת כתוביות | ✔ | `generate_subtitles` | ✔ `edlToSubs` | `CREATE_CAPTIONS` | ✔ | |
| עריכת כתובית | ✔ | `edit_subtitle` | ✔ | `UPDATE_CAPTION_TEXT` | ✔ | |
| תזמון/מחיקה/ניקוי כתוביות | ✔(חלקי) | `retime/delete/clear_subtitles` | ✔ | `UPDATE_CAPTION_TIMING`... | ✔ | |
| ייבוא/ייצוא SRT | ✔ | `import/export_srt` | ✔ | `IMPORT_SRT`/`EXPORT_SRT` | ✔ | |
| רינדור/ייצוא | ✔(Export) | `render_video` | ✔ `RenderBackend` | `EXPORT_PROJECT` | n/a | native verified |
| רצועות (rename/lock/mute/height/reorder) | ✔ | ✖ | ✔ `useEditor` | `*_TRACK` | ✔ | להוסיף כלי-סוכן |
| שינוי מצב סוכן Ask/Plan/Act | ✔(dock) | n/a | — | — | n/a | חדש |

## פערי Parity מיידיים (לחבילה הבאה)
1. **CommandBus + Command registry** עם `inputSchema/resultSchema/permissions/contexts/agentCallable` — מקור אחד ל-UI/Agent/palette/shortcut/context-menu.
2. **Query API** (`getSelection/getActiveClip/getSelectedRange/getVisibleElementsAtTime/...`) לסוכן.
3. כלים חסרים לסוכן: `disable_clip`, `set_clip_volume`, פעולות רצועה.
4. פעולות ידניות חסרות ב-UI: `remove_segments`/`remove_silence` (כפתורים/תפריט).
5. Message normalizer + idempotency + repair (DeepSeek reasoning) — בדיקות פר-ספק.
