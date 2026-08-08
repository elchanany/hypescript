# EDITOR_FEATURE_MATRIX

סטטוסים: `Not started` · `Model only` · `UI only` · `Preview only` · `Export only` · `Partial` · `Complete` · `Tested`.

**`Complete`** דורש: Model + Command + UI + Preview + Export + Undo/Redo + Tests + Agent parity (כשמתאים) + Permissions + Errors + Accessibility.

> נכון לענף `cursor/editor-shell-pkg1-505e`. משקף מצב אמיתי — לא כוונות.

## מעטפת עורך (Editor shell)
| Feature | Model | UI | Preview | Export | Undo | Tests | Agent | סטטוס |
|---|---|---|---|---|---|---|---|---|
| Editor shell / פאנלים | — | ✔ | — | — | — | — | — | Partial |
| Panel resize (left/inspector/timeline/dock) + persist + dbl-reset | ✔(localStorage) | ✔ | — | — | — | ✖ | — | Partial |
| Design tokens | ✔ | ✔ | — | — | — | — | — | Complete (tokens) |
| Media grid/list + thumbnails אמיתיים | ✔ | ✔ | — | — | — | ✔(thumb) | — | Partial |

## נגן / Canvas
| Feature | Model | UI | Preview | Export | Undo | Tests | Agent | סטטוס |
|---|---|---|---|---|---|---|---|---|
| Playback (play/pause/frame/seek) | — | ✔ | ✔ | n/a | — | — | ✖ | Partial |
| Caption overlay בנגן | ✔ | ✔ | ✔ | ✔(burn) | — | ✔ | — | Partial |
| Direct manipulation (select/box/drag/resize/rotate) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | Not started |
| Project coordinates / PreviewCompositor | ✖ | ✖ | ✖ | ✖ | — | ✖ | — | Not started |

## Timeline
| Feature | Model | UI | Preview | Export | Undo | Tests | Agent | סטטוס |
|---|---|---|---|---|---|---|---|---|
| Filmstrip (real) | ✔ | ✔ | n/a | — | — | ✔ | — | Partial |
| Waveform (real) | ✔ | ✔ | n/a | — | — | ✔ | — | Partial |
| Zoom (slider/+/-) | — | ✔ | — | — | — | ✖ | — | Partial |
| Zoom around pointer / Ctrl+wheel / pinch | ✖ | ✖ | — | — | — | ✖ | — | Not started |
| Split | ✔ | ✔ | ✔ | ✔ | ✔ | ✔(time) | ✔ | Partial |
| Trim (normal) | ✔ | ✔ | ✔ | ✔ | ✔ | ✖ | ✔ | Partial |
| Ripple / Roll / Slip | ✔ Ripple+LeaveGap+Roll+Slip | ✔ | — | Preview/Export | ✔ | ✖ | ✖ | Roll/Slip via CommandBus |
| Delete leaves Gap / Gap entity / Ripple-delete | ✖ | ✖ | — | — | — | ✖ | ✖ | Not started |
| Drag Ghost + Drop indicator | ✔ | ✔ | — | — | ✔ | ✖ | — | Partial |
| Clip color: contrast/saturation | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Complete (real MP4 browser QA passed) |
| Transitions / other effects / Keyframes visuals | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | Not started |

## Inspector
| Feature | סטטוס |
|---|---|
| Project (no selection) | Partial |
| Clip In/Out + volume | Partial |
| Transform / tabs / keyframes / mixed-state | Not started |

## אודיו / כתוביות
| Feature | Model | UI | Preview | Export | Undo | Tests | Agent | סטטוס |
|---|---|---|---|---|---|---|---|---|
| Clip volume | ✔ | ✔ | ✔(Web Audio gain) | ✔ | ✔ | ✔ | ✔ | Complete (browser QA passed) |
| Clip-edge linear fades | ✔ | ✔ | ✔(rAF Web Audio gain) | ✔(`afade`) | ✔ | ✔ | ✔ | Complete (browser + native render passed) |
| Envelope/range-volume/keyframes | ✖ | ✖ | ✖ | ✖ | — | ✖ | ✖ | Not started |
| Captions create/edit/timing/SRT | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Partial |
| Caption style/position/animation | ✖ | ✖ | ✖ | ✖ | — | ✖ | ✖ | Not started |

## Agent
| Feature | סטטוס |
|---|---|
| Docked panel (resizes workspace, not overlay) | Partial (חדש) |
| Ask/Plan/Act modes (enforced: no tools in ask/plan) | Partial (חדש) |
| Slash `/` commands (real + disabled-with-reason) | Partial (חדש) |
| `@` mentions מישויות אמיתיות | Partial (חדש) |
| Context chips | Partial (חדש) |
| Tool activity rows | Partial |
| Plan/approval/checkpoints/diff/reference-chips | Not started |
| CommandBus מרכזי + Query API + parity tests | Not started |

## ייצוא (verified)
| Feature | סטטוס |
|---|---|
| EDL native FFmpeg render + ffprobe join (20 cuts, drift=0, CFR 30/1) | **Tested** (אין לגעת ללא Regression) |
