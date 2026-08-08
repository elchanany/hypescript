# REFERENCE_UI_MAP — מיפוי ממשק ייחוס → מצב במוצר

> מיפוי דפוסי הממשק המקצועיים (CapCut Desktop / DaVinci Resolve / Cursor / Copilot) לרכיבי Hypescript.
> **הערה חשובה:** לא צורפו צילומי מסך לשיחה זו. המיפוי מבוסס על התיאורים המילוליים המפורטים בשני מסמכי המפרט + דפוסי-תעשייה מוכרים. כאשר יתקבלו צילומי מסך, יש להשלים כאן מיפוי-פר-צילום (id צילום, אזור, כל Control, hover/selected/disabled, הפעולה, הישות, ה-Command, הרכיב הקיים, הסטטוס, מה חסר, החבילה, בדיקת קבלה).
> אין להעתיק לוגו/שם/צבעים/נכסים/קוד קנייניים — ייחוס התנהגותי בלבד.

## מקרא סטטוס
`חסר` · `חלקי` · `קיים` · `Tested`

## אזור 1 — Top bar
| Control | פעולה / ישות | Command עתידי | רכיב קיים | סטטוס | חסר |
|---|---|---|---|---|---|
| לוגו מוצר | ניווט/מיתוג | — | `TopBar` | קיים | Breadcrump לפרויקט/Compound |
| בורר פרויקט + שם | החלפת/שינוי פרויקט | `RENAME_PROJECT` | `TopBar` | קיים | Breadcrumb, עריכה inline של השם |
| מצב שמירה | Saved/Saving/Offline/Failed/Conflict | — | `TopBar` (`.tb-save`) | חלקי | Offline/Failed/Conflict states |
| Undo / Redo | היסטוריה | `UNDO`/`REDO` | `TopBar`+`useEditor` | קיים | — |
| הגדרות Canvas | width/height/fps/bg | `UPDATE_PROJECT_CANVAS` | — | חסר | פאנל הגדרות פרויקט |
| Preview quality | איכות תצוגה | — | — | חסר | — |
| Jobs (Badge) | מרכז עבודות | — | — | חסר | Job Center |
| Agent toggle | פתיחת dock | — | `TopBar` (Bot) | קיים | — |
| Export (primary) | ייצוא | `EXPORT_PROJECT` | `TopBar` | קיים (native verified) | preset picker |
| Settings | הגדרות/ספקים | — | `TopBar`/`ToolRail` | קיים | פרופיל, ספקים |
| פרופיל משתמש | חשבון/ארגון | — | — | חסר | Auth (חבילה B) |

## אזור 2 — Tool rail (סרגל קטגוריות)
| קטגוריה | פאנל | סטטוס |
|---|---|---|
| Media | ✔ ספריית מדיה (grid/list, thumbnails) | קיים |
| Captions | ✔ פאנל כתוביות/סקריפט | קיים |
| Audio / Text / Effects / Transitions / Filters / Adjustment / Templates / Generate / Brand / Transcript / Review | — | חסר (לא מוצג עד שיש פאנל אמיתי) |

הכלל: קטגוריה ללא פאנל אמיתי **אינה מוצגת** (סעיף 8 במפרט).

## אזור 3 — Left content panel (Media)
| פרט | סטטוס | חסר |
|---|---|---|
| Import | קיים | Record |
| Grid/List toggle | קיים | Sort/Filter/Folders/Search |
| Asset card: thumbnail/שם/משך/סוג | קיים | Usage count, provider, proxy/missing/processing/error, license |
| Collections (Project/Org/Generated/Used/Unused/Missing/Recent/Favorites) | חסר | — |
| Drag ל-Timeline / Canvas | חסר | (add via +/dblclick קיים) |

## אזור 4 — Viewer / Canvas
| פרט | סטטוס | חסר |
|---|---|---|
| Preview ממורכז, רקע כהה | קיים | Canvas surround > וידאו |
| Controls: time/play/frame/vol/fullscreen | קיים | Fit/100%/aspect/safe-areas/canvas-zoom |
| Pause שומר Playhead, Space play/pause | קיים (Tested-ידני) | — |
| PreviewCompositor (שכבות overlay) | חסר | **חבילת Canvas (הבאה)** |
| Selection / Bounding box / drag / resize / rotate | חסר | **חבילת Canvas** |
| Project coordinates (לא CSS px) | חסר | **חבילת Canvas** |

## אזור 5 — Inspector
| מצב | סטטוס | חסר |
|---|---|---|
| ללא בחירה → פרויקט/אורך | קיים | Canvas settings, QA, suggestions |
| קליפ → מקור/עריכה(In/Out)/שמע(volume) | קיים | Tabs (Video/Audio/Speed/Animation/Adjust/AI), Transform, keyframes, mixed-state |
| Text/Caption/Transition inspectors | חסר | חבילות הבאות |

## אזור 6 — Timeline
| פרט | סטטוס | חסר |
|---|---|---|
| Ruler/Playhead/scroll/zoom(slider+/-) | קיים | zoom around pointer, Ctrl+wheel, pinch, fit-selection |
| Track headers (icon/name/lock/mute/height/reorder) | קיים | solo, collapse, add/delete track |
| Video clip: Filmstrip אמיתי | קיים | trim/speed/reverse-aware badges |
| Audio: Waveform אמיתי | קיים | gain/envelope/fade handles |
| Image: thumbnail | קיים | — |
| Caption: טקסט בתוך הבלוק | קיים | speaker/confidence/spelling |
| Drag: Ghost + Drop indicator | קיים | track highlight, insert/overwrite/reject, auto-scroll |
| Split/Trim | קיים | Ripple/Roll/Slip, Gap entity, ripple-delete |
| Transitions/Effects/Keyframes visuals | חסר | חבילות הבאות |

## אזור 7 — Agent dock (Cursor/Copilot-class)
| פרט | סטטוס | חסר |
|---|---|---|
| Docked, מכווץ סביבת עבודה, לא Overlay, לא מכסה Timeline | **קיים (חדש)** | — |
| Resizable + dock side (L/R) + persist | **קיים (חדש)** | collapse-to-rail, focus-mode |
| Modes: Ask/Plan/Act (אכיפה: Ask/Plan ללא כלים) | **קיים (חדש)** | Plan→checklist מובנה, approval cards |
| Slash `/` commands (עם disabled+reason) | **קיים (חדש)** | commands מבוססי-ספק כשיתחברו |
| `@` mentions על ישויות אמיתיות | **קיים (חדש)** | reference-chips לחיצים, org/@template |
| Context chips (playhead/selection/clips/captions) | **קיים (חדש)** | range chip |
| Tool activity rows (name/status/spinner/ok/err) | קיים | provider/model/progress/cost/cancel/retry/undo |
| Plan / approval / checkpoints / diff | חסר | חבילת CommandBus/Agent |

## אזור 8 — Context menus
| מקום | סטטוס |
|---|---|
| Clip/Gap (duplicate/split/disable/delete/close) | קיים, דינמי מה-Registry |
| Command menu (Ctrl/Cmd+K) מה-Registry | קיים |
| Track (lock/mute/height/remove-safe) | קיים, דינמי מה-Registry |
| Asset / Caption menus מלאים | חסר |
