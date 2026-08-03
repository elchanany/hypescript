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
| קטגוריות tool-rail | PARTIAL | רק Media+Captions; חסרות Audio/Text/Effects/Transitions/Filters/Adjustment/Templates/Generate/Brand (לא מוצגות עד שיש פאנל אמיתי — נכון, אך חסר תוכן) |
| Top bar: breadcrumb/preview-quality/jobs/profile | PARTIAL | חסר |

## 2. Canvas / Direct manipulation  ← **הפער הקריטי**
| פריט | סטטוס | פער |
|---|---|---|
| Preview (וידאו יחיד) | OK | — |
| Caption overlay בנגן | PARTIAL (!EXPORT partial) | טקסט בלבד |
| PreviewCompositor (שכבות: image/logo/text/sticker) | MISSING | הליבה של "עורך אמיתי" |
| Project coordinates (לא CSS px) | MISSING | — |
| בחירה/Bounding box/drag/resize/rotate | MISSING | — |
| Inspector transform sync | MISSING | — |
| Snapping/guides/safe-areas | MISSING | — |

## 3. Timeline
| פריט | סטטוס | פער |
|---|---|---|
| Ruler/playhead/scroll/zoom(slider) | OK | — |
| Filmstrip/Waveform אמיתיים | OK | — |
| Track headers (lock/mute/height/reorder) | PARTIAL | solo/collapse/add/delete חסר |
| Split/Trim/Move | OK | — |
| Ghost+Drop indicator | OK | — |
| Zoom around pointer / Ctrl+wheel / pinch | MISSING | — |
| Gap entity / Delete-leaves-gap / Ripple-delete / Roll / Slip | MISSING | סמנטיקת עריכה מקצועית |
| Transitions/Effects/Keyframes visuals | MISSING | — |
| Overlay/Text tracks | MISSING | תלוי ב-#2 |

## 4. Text / Captions / Images / Logos / Overlays
| פריט | סטטוס | פער |
|---|---|---|
| כתוביות: create/edit/timing/SRT | OK | — |
| כתוביות: style/position/animation/scope | MISSING | — |
| Text element (add/edit/style) | MISSING | — |
| Image/Logo overlay | MISSING | תלוי ב-#2 |
| Stickers/Shapes | MISSING | — |

## 5. Agent workspace
| פריט | סטטוס | פער |
|---|---|---|
| Docked panel + Ask/Plan/Act (enforced) | OK | — |
| Slash `/` + `@mentions` + context chips | OK | — |
| Tool activity rows | PARTIAL | provider/model/progress/cost/cancel/retry/undo חסר |
| **DeepSeek tool_calls protocol** | **BROKEN (P0)** | `400: assistant tool_calls must be followed by tool messages` — נראה ברפרנס. **נדרש normalizer/repair.** |
| Plan checklist / approval cards / checkpoints / diff | MISSING | — |
| Reference chips לחיצים | MISSING | — |
| CommandBus מרכזי + Query API + parity tests | MISSING | עמוד השדרה ל-parity |

## 6. Project / Auth / Dashboard
| פריט | סטטוס | פער |
|---|---|---|
| פרויקטים מקומיים (IndexedDB) + מעבר/יצירה/שם/מחיקה | OK | — |
| Login / Google OAuth / session | MISSING | — |
| Dashboard / project cards / wizard | MISSING | — |
| Organizations / roles / RLS | MISSING | — |

## 7. Providers
| פריט | סטטוס | פער |
|---|---|---|
| LLM proxy (deepseek/openai/anthropic/gemini, env) | OK | — |
| תמלול Groq (proxy) | PARTIAL | מפתח client-side (פער אבטחה) |
| Provider Registry + policies + Zero-cost + health-check | MISSING | — |
| Image/Video/Voice/Music/Storage/Search | MISSING | — |

## 8. Templates / Effects / Transitions / Filters / Adjustment
| הכל | MISSING | אין להציג ללא Preview+Export אמיתי |

## 9. Usage / Credits / Admin
| הכל | MISSING | — |

---

# ISSUES לפי עדיפות

### P0 — באגים חוסמים
- **AG-1**: DeepSeek `tool_calls` 400 — normalizer/repair שמבטיח tool result לכל tool_call_id, מוחק orphans, מתקן היסטוריה שמורה. *(מטופל בסבב זה)*

### P1 — ליבת עורך (הסדר שנקבע)
- **CV-1**: מודל overlays (`VisualElement`+`VisualTransform`) + schemaVersion 2→3 + migration.
- **CV-2**: מתמטיקת קואורדינטות פרויקט↔viewport + hit-test + matrices (+unit tests).
- **CV-3**: PreviewCompositor — image/logo/text מעל הווידאו לפי זמן+transform.
- **CV-4**: Direct manipulation — select/bbox/corner-resize/rotate/drag, commit יחיד ל-Undo.
- **CV-5**: Inspector Transform (X/Y/scale/rotation/opacity) sync דו-כיווני.
- **CV-6**: Timeline — overlay/text track + ייצוג הישויות.
- **CV-7**: Export parity — overlay (FFmpeg `overlay`/drawtext) בלי לשבור מנוע ה-EDL הנבדק.
- **TL-1**: Gap entity + Delete-leaves-gap + Ripple-delete + zoom-around-pointer + Ctrl/pinch.
- **TX-1**: Text element מלא (add/edit/style) + Caption style/position.

### P2 — סוכן/פלטפורמה
- **AG-2**: CommandBus מרכזי + Command registry + Query API → parity אמיתי UI/Agent.
- **AG-3**: כלים חסרים לסוכן (disable_clip/set_clip_volume/track ops/overlay ops).
- **AG-4**: Tool activity מלא (provider/model/progress/cancel/retry/undo) + approval + checkpoints.
- **PR-1**: Provider Registry + policies + Zero-cost + health-check + missing-key UI.
- **AU-1**: Supabase Auth (Google) + Dashboard + project wizard + RLS.

### P3 — הרחבות
- Templates / Effects / Transitions / Filters / Adjustment (רק עם Preview+Export).
- Organizations / Brand kit / Usage / Credits / Admin.
