# GAP_MAP — מצב אמת מול חזון "CapCut מקצועי + סוכן AI"

מבוסס על הרפרנס שסופק (CapCut) + הקוד בפועל. קטגוריות סטטוס לפי בקשת המשתמש:
`OK` קיים ועובד · `PARTIAL` חלקי · `UI` רק UI · `MODEL` רק מודל · `!PREVIEW` לא מחובר ל-Preview · `!EXPORT` לא מחובר ל-Export · `!AGENT` לא נשלט ע"י הסוכן · `MISSING` לא קיים.

**"מושלם"** = Data model + Command + UI + Manual interaction + Preview + Export + Undo/Redo + Error handling + Tests + Agent parity.

## 1. Editor shell
| פריט | סטטוס | פער |
|---|---|---|
| מבנה shell (top/tool-rail/left/preview/inspector/timeline) | OK | — |
| פאנלים resizable + persist + dbl-reset | OK | — |
| Agent dock (מעוגן, מכווץ workspace) | OK | — |
| קטגוריות tool-rail | PARTIAL | Media+Text+Captions; חסרות Audio/Effects/… (לא מוצגות עד פאנל אמיתי) |
| Top bar: breadcrumb/preview-quality/jobs/profile | PARTIAL | חסר |

## 2. Canvas / Direct manipulation
| פריט | סטטוס | פער |
|---|---|---|
| Preview (וידאו יחיד) | OK | — |
| Caption overlay בנגן | PARTIAL | טקסט בלבד |
| PreviewCompositor (image/logo/text) | OK | stickers חסר; Preview+Export |
| Clip opacity | OK | UI+Agent דרך clip.setOpacity; Preview+FFmpeg זהים מול שחור; alpha בין רצועות/PiP שייך ל-Effects עתידי |
| Project coordinates | OK | — |
| בחירה/Bounding box/drag/resize/rotate | OK | — |
| Inspector transform sync | OK | — |
| Snapping/guides/safe-areas | PARTIAL | קנבס: snap למרכז + שולי 10% (Alt מבטל); טיימליין: מגנט חוצה-רצועות עם קו+תווית יעד, שני קצות קליפ, M להפעלה ו-Alt לשחרור; safe-area guides קבועים עדיין חסרים |

## 3. Timeline
| פריט | סטטוס | פער |
|---|---|---|
| Ruler/playhead/scroll/zoom(slider) | OK | — |
| Filmstrip/Waveform אמיתיים | OK | — |
| Track headers (lock/mute/height/reorder) | PARTIAL | solo/collapse/add/delete חסר |
| Split/Trim/Move | OK | — |
| Ghost+Drop indicator | OK | — |
| Zoom around pointer / Ctrl+wheel | OK | — |
| Gap entity / Delete-leaves-gap / Ripple-delete | OK | Preview+Export (lavfi black); Roll/Slip ✅ (כפתורים + מקלדת) |
| Transitions/Effects/Keyframes visuals | MISSING | — |
| Overlay/Text tracks | OK | בחירה + trim/move בציר |
| Magnetic cross-track placement | OK | קצוות מחושבים בנפרד לכל רצועה; גרירת קליפ/מדיה נצמדת להתחלה/סוף מעל ומתחת ושומרת timeline_start מדויק |

## 4. Text / Captions / Images / Logos / Overlays
| פריט | סטטוס | פער |
|---|---|---|
| כתוביות: create/edit/timing/SRT | OK | script-as-ground-truth + Hebrew soft-orphan balancing ב-web/local; pause/punctuation נשמרים |
| כתוביות: style/position/animation/scope | PARTIAL | style+position+bg + burn-in בייצוא; animation חסר |
| Text element (add/edit/style) | PARTIAL | style מלא/אנימציה חסרים |
| Image/Logo overlay | OK | — |
| Logo placement/resize/stack/round/fade | OK | פעולות נפרדות מתמונה מלאה; UI+Agent+Preview+Export |
| Multi-overlay identity/protection | OK | stable ID + expected-source guard + locked overlays; add אטומי |
| PNG alpha + safe bounds/aspect | OK | ללא checkerboard ב-Preview; יחס טבעי ו-clamp משותף |
| Source/speaker/dedication popup cards | OK | שלושה presets אמיתיים עם טקסט רב-שורי, מסגרת ורקע |
| Stickers/Shapes | MISSING | — |

## 5. Agent workspace
| פריט | סטטוס | פער |
|---|---|---|
| Docked panel + Ask/Plan/Act (enforced) | OK | — |
| Slash `/` + `@mentions` + context chips | OK | — |
| Newly imported media mentions | OK | `@media:<id>` יציב + כפתור @ בכל כרטיס מדיה |
| Tool activity rows | PARTIAL | provider + exact retry + duration + token usage + checkpoint restore אטומי לכל כלי mutating + "בטל"; rate-card כספי חסר |
| DeepSeek tool_calls protocol | OK | normalize.ts |
| Plan checklist / approval cards / checkpoints | OK | Plan מחזיר checklist; אישור מפורש מעביר ל-Act ומבצע את אותה תוכנית; בקשת שינוי נשארת ללא כלים; checkpoint+restore אטומי לכל כלי mutating |
| CommandBus + Query API | PARTIAL | פעולות UI וכלי agent יחידניים וב־bulk עוברים דרך פקודות מאומתות, כולל clip/subtitle replace אטומי; File probe/object-URL נשאר גבול I/O; נותר Query API עשיר יותר |
| רצועות וידאו מרובות + כלי סוכן | OK | trackId + cutaway flatten בנגן/ייצוא; add_video_track / move_clip_to_track |
| אימות ויזואלי (capture_frame) | OK | ברירת מחדל = פריים גולמי מהמקור (מהיר); `timeline=true` = פריים מורכב שקול לייצוא (opt-in); SYSTEM_PROMPT מגביל לאימות שינוי משמעותי בלי צילומים מיותרים |
| כלי overlays / enable / volume / leave_gap | OK | — |

## 6. Project / Auth / Dashboard
| פריט | סטטוס | פער |
|---|---|---|
| פרויקטים מקומיים (IndexedDB) | OK | — |
| Login / Google OAuth / session | PARTIAL | קוד מוכן; דורש מפתחות Supabase מהמשתמש (`SETUP_AUTH.md`). בלי מפתחות — לא נשבר |
| Dashboard / project cards | OK | `/dashboard` על פרויקטים מקומיים |
| Export Center | OK | אחוז, זמן שחלף, ETA מדוד, ביטול אמיתי, retry, נגן וקובץ הורדה שנשאר עד סגירה |
| Organizations / roles / RLS | MISSING | — |

## 7. Providers
| פריט | סטטוס | פער |
|---|---|---|
| LLM proxy | OK | — |
| תמלול Groq (proxy) | PARTIAL | מפתח client-side |
| Provider Registry + policies + Zero-cost | PARTIAL | Registry + configured-unverified + billing-risk classification; LLM/STT/TTS נחסמים עד אישור מפורש מקומי לפי ספק; live health-check ומדיניות server/roles חסרים |
| Image/Video/Voice/Music/Storage/Search | MISSING | — |

## 8–9. Templates / Effects / Usage / Admin
| הכל | MISSING | אין להציג בלי Preview+Export אמיתי / דורש אישור |

---

# ISSUES לפי עדיפות

### P0
- **AG-1**: DeepSeek tool_calls ✅

### P1
- **CV-1…CV-7** ✅ · **TL-1** ✅ · **TX-1** PARTIAL (style+burn-in ✅; animation חסר)

### P2 (הבא)
- **AG-2**: OK — פעולות UI וכלי agent יחידניים וב־bulk דרך CommandBus; Query API כולל active clip/source/gap/overlays/captions; generated media חוזר כ-ToolOutcome עם text ל-LLM ו-Blob client-only לכרטיס המדיה פעם אחת
- **AG-4**: PARTIAL — Tool activity כולל provider, duration, exact retry, token usage, checkpoint restore ו"בטל"; Plan checklist + approval-to-Act הושלמו; נותר rate-card כספי מאומת
- **PR-1**: PARTIAL — Provider Registry מפריד configured/verified ומסווג billing risk; LLM/STT/TTS fail-closed עד אישור ספק מפורש; live health-check + server/roles policy חסרים
- **AU-1**: Auth/Dashboard — **רק אחרי אישור מפורש** (Supabase = שירות חדש)

### P3
- Filters: PARTIAL — contrast+saturation presets, bounded fade-to/from-black and horizontal/vertical flip have Inspector/Undo/CommandBus/Agent/Preview/Export; brightness and generic keyframes are missing
- Audio: clip volume and bounded linear clip-edge fades have Model/Inspector/Undo/CommandBus/Agent/Preview(Web Audio)/Export parity; envelopes/range-volume/keyframes remain
- Templates / Effects / Transitions (רק עם Preview+Export)
- Organizations / Brand: אושר כחבילה מקומית (לוגו, בוחר צבעים, קווים מנחים לכתיבה, תמונות רפרנס) לבחירה בין פרויקטים וחשיפה בטוחה לסוכן; IndexedDB מקומי בשלב ראשון, סנכרון ענן אחרי auth תקין — Usage / Credits חסרים
- Semantic timeline evidence: FOUNDATION OK — per-time-span speech, provider `audio_event`, explicit edit gaps ו-measured RMS/dBFS energy קיימים; `remove_silence` משלב חותמות-מילה להגנת דיבור עם עמקי RMS למיקום חיתוך במצב tight ‏(0.14s/0.025s), מסיר audio_event מפורש ומהססים נפוצים ומריץ QA ללא overlap/מילה חתוכה. local שומר parity. אין להסיק סוג אירוע מהיעדר תמלול או מ-dB בלבד
# 2026-08-08 closed gaps

- CLOSED: image-only/audio-only Preview and mixed-media continuation.
- CLOSED: image placement on the primary video lane via drag/plus; logo placement remains an explicit overlay action.
- CLOSED: dedicated audio-track Preview + Export mix with per-clip volume/audio fades.
- CLOSED: direct on-canvas caption select/edit/vertical move; overlapping cues are stacked and warned.
- CLOSED: custom context menu on blank editor/Preview surfaces and caption cues.
- CLOSED: broad button tooltip coverage, including controls mounted after initial render.
- CLOSED: UI + Agent real opening source-popup preset with Preview/Export parity.
- CLOSED: Agent exact-time media placement and downloadable render/SRT/image/audio artifacts in chat.
- CLOSED: top-bar export no longer auto-discards its Blob; a persistent Export Center shows progress, elapsed/remaining time, cancellation, retry, preview and download.
- CLOSED: magnetic snapping stays enabled by default without the confusing persistent “מגנט חכם / Alt לשחרור” toolbar control.

# 2026-08-09 closed gaps

- CLOSED: export-parity composited timeline frame capture for agent visual verification — `capture_frame(timeline=true)`, opt-in; raw source capture remains the fast default.
