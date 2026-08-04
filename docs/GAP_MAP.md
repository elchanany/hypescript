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
| Project coordinates | OK | — |
| בחירה/Bounding box/drag/resize/rotate | OK | — |
| Inspector transform sync | OK | — |
| Snapping/guides/safe-areas | PARTIAL | snap למרכז + שולי 10% בגרירה (Alt מבטל); guides ויזואליים חסרים |

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

## 4. Text / Captions / Images / Logos / Overlays
| פריט | סטטוס | פער |
|---|---|---|
| כתוביות: create/edit/timing/SRT | OK | — |
| כתוביות: style/position/animation/scope | PARTIAL | style+position+bg + burn-in בייצוא; animation חסר |
| Text element (add/edit/style) | PARTIAL | style מלא/אנימציה חסרים |
| Image/Logo overlay | OK | — |
| Stickers/Shapes | MISSING | — |

## 5. Agent workspace
| פריט | סטטוס | פער |
|---|---|---|
| Docked panel + Ask/Plan/Act (enforced) | OK | — |
| Slash `/` + `@mentions` + context chips | OK | — |
| Tool activity rows | PARTIAL | provider label + Retry prompt + "בטל" קיימים; cost/checkpoints/retry מלא חסרים |
| DeepSeek tool_calls protocol | OK | normalize.ts |
| Plan checklist / approval cards / checkpoints | MISSING | — |
| CommandBus + Query API | PARTIAL | registry + builtins + queryProject; לא כל ה-UI עובר דרכו עדיין |
| כלי overlays / enable / volume / leave_gap | OK | — |

## 6. Project / Auth / Dashboard
| פריט | סטטוס | פער |
|---|---|---|
| פרויקטים מקומיים (IndexedDB) | OK | — |
| Login / Google OAuth / session | PARTIAL | קוד מוכן; דורש מפתחות Supabase מהמשתמש (`SETUP_AUTH.md`). בלי מפתחות — לא נשבר |
| Dashboard / project cards | OK | `/dashboard` על פרויקטים מקומיים |
| Organizations / roles / RLS | MISSING | — |

## 7. Providers
| פריט | סטטוס | פער |
|---|---|---|
| LLM proxy | OK | — |
| תמלול Groq (proxy) | PARTIAL | מפתח client-side |
| Provider Registry + policies + Zero-cost | PARTIAL | Registry בסיסי + missing-key status; policies/health-check/Zero-cost חסרים |
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
- **AG-2**: להעביר יותר פעולות UI דרך CommandBus + parity tests
- **AG-4**: PARTIAL — Tool activity בסיסי (provider label, Retry prompt, "בטל"); cost/checkpoints/retry מלא חסרים
- **PR-1**: PARTIAL — Provider Registry בסיסי וכנה; policies/health-check/Zero-cost חסרים
- **AU-1**: Auth/Dashboard — **רק אחרי אישור מפורש** (Supabase = שירות חדש)

### P3
- Templates / Effects / Transitions / Filters (רק עם Preview+Export)
- Organizations / Brand / Usage / Credits
