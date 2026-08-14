"use client";

// Right-side Inspector. No selection -> project settings. Clip selected ->
// clip properties (video/audio). Sub selected -> caption properties.
// Overlay selected -> transform + text/image properties.
// Every edit flows through onUpdate / onUpdateOverlay / onUpdateSub -> useEditor -> History.
import { Clip, clipAudioFades, clipContrast, clipEnabled, clipFlipX, clipFlipY, clipOpacity, clipSaturation, clipVisualFades, clipVolume } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { CaptionBg, CaptionPosition, CaptionStyle, DEFAULT_CAPTION_STYLE } from "@/lib/editor/captionStyle";
import { formatTimecode } from "@/lib/editor/time";
import { SlidersHorizontal } from "@/components/icons";
import { Section, Toggle } from "@/components/ui";
import { CLIP_COLOR_PRESETS, matchingColorPreset } from "@/lib/editor/colorPresets";
import { AspectRatioPicker } from "@/components/AspectRatioPicker";

export type InspectorFocus = "project" | "video" | "audio" | "caption" | "overlay";

interface Props {
  width?: number;
  clip: Clip | null;
  overlay?: Overlay | null;
  sub?: Sub | null;
  focus?: InspectorFocus;
  assetName: string;
  assetKind: "video" | "image" | "audio";
  assetDuration: number;
  trackName: string;
  timelineStart: number;
  onUpdate: (patch: Partial<Clip>) => void;
  onConvertImageClipToOverlay?: () => void;
  onUpdateOverlay?: (patch: Partial<Overlay>) => void;
  onUpdateSub?: (patch: Partial<Sub>) => void;
  canvas?: CanvasSize;
  onChangeCanvas?: (canvas: CanvasSize) => void;
  captionStyle?: CaptionStyle;
  onCaptionStyle?: (patch: Partial<CaptionStyle>) => void;
  // project fallback
  projectName: string;
  mediaCount: number;
  sourceDuration: number;
  editedDuration: number;
}

const KIND = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;

function titleFor(focus: InspectorFocus): string {
  switch (focus) {
    case "video": return "מאפייני וידאו";
    case "audio": return "מאפייני שמע";
    case "caption": return "מאפייני כתובית";
    case "overlay": return "מאפייני שכבה";
    default: return "הגדרות פרויקט";
  }
}

export default function InspectorPanel(p: Props) {
  const { clip, overlay, sub } = p;
  const focus: InspectorFocus = p.focus
    || (overlay ? "overlay" : sub ? "caption" : clip ? (p.assetKind === "audio" ? "audio" : "video") : "project");
  const title = overlay
    ? (overlay.kind === "text" ? "מאפייני טקסט" : "מאפייני שכבה")
    : titleFor(focus);

  return (
    <aside className="inspector2" style={p.width ? { width: p.width } : undefined} data-tour="inspector">
      <div className="panel-header">
        <span className="title"><SlidersHorizontal size={15} strokeWidth={1.75} />{title}</span>
      </div>
      <div className="insp-scroll">
        {overlay ? (
          <OverlayInspector overlay={overlay} onUpdate={p.onUpdateOverlay!} assetName={p.assetName} canvas={p.canvas} />
        ) : sub ? (
          <SubInspector
            sub={sub}
            onUpdate={p.onUpdateSub!}
            captionStyle={p.captionStyle || DEFAULT_CAPTION_STYLE}
            onCaptionStyle={p.onCaptionStyle}
          />
        ) : !clip ? (
          <Section title="פרויקט">
            <div className="prop"><span className="k">שם</span><span className="v">{p.projectName || "—"}</span></div>
            <div className="prop"><span className="k">קבצי מקור</span><span className="v mono">{p.mediaCount}</span></div>
            <div className="prop"><span className="k">אורך מקור</span><span className="v mono">{formatTimecode(p.sourceDuration)}</span></div>
            <div className="prop"><span className="k">אורך ערוך</span><span className="v mono">{formatTimecode(p.editedDuration)}</span></div>
            {p.canvas && (
              <div className="prop" style={{ alignItems: "center" }}>
                <span className="k">פורמט ויחס מסך</span>
                <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
                  {p.onChangeCanvas ? (
                    <AspectRatioPicker currentCanvas={p.canvas} onChangeCanvas={p.onChangeCanvas} />
                  ) : (
                    <span className="mono">{p.canvas.width}×{p.canvas.height}</span>
                  )}
                </span>
              </div>
            )}
            {p.mediaCount === 0 && <div className="insp-empty" style={{ padding: "12px 0 0" }}>יש לבחור קטע בציר הזמן כדי לערוך את המאפיינים.</div>}
          </Section>
        ) : (
          <ClipInspector {...p} clip={clip} focus={focus} />
        )}
      </div>
    </aside>
  );
}

function num(v: number, digits = 1) {
  return Number.isFinite(v) ? +v.toFixed(digits) : 0;
}

function SubInspector({ sub, onUpdate, captionStyle, onCaptionStyle }: {
  sub: Sub;
  onUpdate: (patch: Partial<Sub>) => void;
  captionStyle: CaptionStyle;
  onCaptionStyle?: (patch: Partial<CaptionStyle>) => void;
}) {
  const dur = Math.max(0, sub.end - sub.start);
  const st = captionStyle;
  return (
    <>
      <Section title="תוכן">
        <div className="prop-input" style={{ alignItems: "flex-start" }}><span className="k">טקסט</span>
          <textarea rows={4} value={sub.text} dir="rtl"
            onChange={(e) => onUpdate({ text: e.target.value })}
            style={{ flex: 1, resize: "vertical", minHeight: 72 }} /></div>
      </Section>
      <Section title="תזמון בציר">
        <div className="prop-input"><span className="k">התחלה</span>
          <input type="number" step={0.05} min={0} value={num(sub.start, 3)}
            onChange={(e) => onUpdate({ start: Math.max(0, Math.min(+e.target.value, sub.end - 0.05)) })} /></div>
        <div className="prop-input"><span className="k">סיום</span>
          <input type="number" step={0.05} min={0} value={num(sub.end, 3)}
            onChange={(e) => onUpdate({ end: Math.max(+e.target.value, sub.start + 0.05) })} /></div>
        <div className="prop"><span className="k">משך</span><span className="v mono">{dur.toFixed(2)}s</span></div>
        <div className="prop"><span className="k">מיקום</span><span className="v mono">{formatTimecode(sub.start)}</span></div>
      </Section>
      {onCaptionStyle && (
        <Section title="עיצוב כתוביות (פרויקט)">
          <div className="prop"><span className="k">גודל</span><span className="v mono">{st.fontSize.toFixed(1)}</span></div>
          <input type="range" min={2} max={12} step={0.1} value={st.fontSize}
            onChange={(e) => onCaptionStyle({ fontSize: +e.target.value })} style={{ width: "100%" }} />
          <div className="prop-input"><span className="k">צבע</span>
            <input type="color" value={st.color} onChange={(e) => onCaptionStyle({ color: e.target.value })}
              style={{ flex: 1, height: 28, padding: 0 }} /></div>
          <div className="prop-input"><span className="k">מיקום</span>
            <select value={st.position} onChange={(e) => onCaptionStyle({ position: e.target.value as CaptionPosition })}
              style={{ flex: 1 }}>
              <option value="bottom">למטה</option>
              <option value="center">מרכז</option>
              <option value="top">למעלה</option>
            </select></div>
          <div className="prop-input"><span className="k">רקע</span>
            <select value={st.bg} onChange={(e) => onCaptionStyle({ bg: e.target.value as CaptionBg })} style={{ flex: 1 }}>
              <option value="soft">רך</option>
              <option value="box">קופסה</option>
              <option value="none">ללא</option>
            </select></div>
          <div className="prop">
            <span className="k">מודגש</span>
            <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Toggle checked={st.bold} onChange={(v) => onCaptionStyle({ bold: v })} />
            </span>
          </div>
        </Section>
      )}
    </>
  );
}

function OverlayInspector({ overlay, onUpdate, assetName, canvas }: {
  overlay: Overlay; onUpdate: (patch: Partial<Overlay>) => void; assetName: string; canvas?: CanvasSize;
  onChangeCanvas?: (canvas: CanvasSize) => void;
}) {
  const t = overlay.transform;
  const setT = (patch: Partial<Overlay["transform"]>) => onUpdate({ transform: { ...t, ...patch } });
  const cw = canvas?.width || 1920;
  const ch = canvas?.height || 1080;
  const placeLogo = (side: "left" | "right") => {
    const ratio = t.w / Math.max(1, t.h);
    let w = cw * 0.16;
    let h = w / ratio;
    if (h > ch * 0.22) { h = ch * 0.22; w = h * ratio; }
    const padX = cw * 0.035, padY = ch * 0.045;
    onUpdate({ transform: { ...t, w, h, x: side === "left" ? padX + w / 2 : cw - padX - w / 2, y: padY + h / 2, rotation: 0 } });
  };

  return (
    <>
      <Section title="מקור">
        <div className="prop"><span className="k">סוג</span><span className="v">{overlay.kind === "text" ? "טקסט" : "תמונה"}</span></div>
        {overlay.kind === "image" && <div className="prop"><span className="k">קובץ</span><span className="v" title={assetName}>{assetName || "—"}</span></div>}
        <div className="prop">
          <span className="k">נעול</span>
          <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
            <Toggle checked={!!overlay.locked} onChange={(v) => onUpdate({ locked: v })} tip="מנע שינוי בתצוגה" />
          </span>
        </div>
        <div className="prop">
          <span className="k">מוסתר</span>
          <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
            <Toggle checked={!!overlay.hidden} onChange={(v) => onUpdate({ hidden: v })} tip="לא מוצג בתצוגה" />
          </span>
        </div>
      </Section>

      <Section title="זמן בציר">
        <div className="prop-input"><span className="k">התחלה</span>
          <input type="number" step={0.05} min={0} value={num(overlay.start, 3)}
            onChange={(e) => onUpdate({ start: Math.max(0, Math.min(+e.target.value, overlay.end - 0.05)) })} /></div>
        <div className="prop-input"><span className="k">סיום</span>
          <input type="number" step={0.05} min={0} value={num(overlay.end, 3)}
            onChange={(e) => onUpdate({ end: Math.max(+e.target.value, overlay.start + 0.05) })} /></div>
        <div className="prop"><span className="k">משך</span><span className="v mono">{(overlay.end - overlay.start).toFixed(2)}s</span></div>
      </Section>

      <Section title="טרנספורם">
        <div className="prop-input"><span className="k">X</span>
          <input type="number" step={1} value={num(t.x, 1)} onChange={(e) => setT({ x: +e.target.value })} /></div>
        <div className="prop-input"><span className="k">Y</span>
          <input type="number" step={1} value={num(t.y, 1)} onChange={(e) => setT({ y: +e.target.value })} /></div>
        <div className="prop-input"><span className="k">רוחב</span>
          <input type="number" step={1} min={8} max={cw * 2} value={num(t.w, 1)} onChange={(e) => setT({ w: Math.max(8, +e.target.value) })} /></div>
        <div className="prop-input"><span className="k">גובה</span>
          <input type="number" step={1} min={8} max={ch * 2} value={num(t.h, 1)} onChange={(e) => setT({ h: Math.max(8, +e.target.value) })} /></div>
        <div className="prop-input"><span className="k">סיבוב°</span>
          <input type="number" step={1} value={num(t.rotation, 1)} onChange={(e) => setT({ rotation: +e.target.value })} /></div>
        <div className="prop"><span className="k">שקיפות</span><span className="v mono">{Math.round(t.opacity * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={t.opacity}
          onChange={(e) => setT({ opacity: Math.max(0, Math.min(1, +e.target.value)) })}
          style={{ width: "100%", marginTop: 4 }} />
        {overlay.kind === "image" && <>
          <div className="prop"><span className="k">מיקום לוגו מהיר</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button type="button" className="btn sm" onClick={() => placeLogo("left")} data-tip="הקטן והצב בפינה שמאלית עליונה">↖ שמאל עליון</button>
            <button type="button" className="btn sm" onClick={() => placeLogo("right")} data-tip="הקטן והצב בפינה ימנית עליונה">ימין עליון ↗</button>
          </div>
        </>}
      </Section>

      <Section title="מראה וסדר שכבות">
        <div className="prop"><span className="k">עיגול פינות</span><span className="v mono">{Math.round(overlay.borderRadius || 0)}px</span></div>
        <input type="range" min={0} max={Math.max(1, Math.min(t.w, t.h) / 2)} step={1} value={Math.min(overlay.borderRadius || 0, Math.min(t.w, t.h) / 2)}
          onChange={(e) => onUpdate({ borderRadius: +e.target.value })} style={{ width: "100%" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
          <button type="button" className="btn sm" onClick={() => onUpdate({ borderRadius: 0 })}>ללא עיגול</button>
          <button type="button" className="btn sm" onClick={() => onUpdate({ borderRadius: Math.min(t.w, t.h) / 2 })}>עגול מלא</button>
        </div>
        <div className="prop"><span className="k">סדר שכבה</span><span className="v mono">{overlay.zIndex}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button type="button" className="btn sm" onClick={() => onUpdate({ zIndex: Math.max(0, overlay.zIndex - 1) })}>שלח אחורה</button>
          <button type="button" className="btn sm" onClick={() => onUpdate({ zIndex: overlay.zIndex + 1 })}>הבא קדימה</button>
        </div>
        <div className="prop-input" style={{ marginTop: 8 }}><span className="k">Fade in (שנ׳)</span>
          <input type="number" min={0} max={(overlay.end - overlay.start) / 2} step={0.05} value={num(overlay.fadeIn || 0, 2)}
            onChange={(e) => onUpdate({ fadeIn: Math.max(0, Math.min((overlay.end - overlay.start) / 2, +e.target.value)) })} /></div>
        <div className="prop-input"><span className="k">Fade out (שנ׳)</span>
          <input type="number" min={0} max={(overlay.end - overlay.start) / 2} step={0.05} value={num(overlay.fadeOut || 0, 2)}
            onChange={(e) => onUpdate({ fadeOut: Math.max(0, Math.min((overlay.end - overlay.start) / 2, +e.target.value)) })} /></div>
        {overlay.kind === "text" && <div className="prop-input" style={{ marginTop: 8 }}><span className="k">רקע</span>
          <input type="text" value={overlay.background || "transparent"} onChange={(e) => onUpdate({ background: e.target.value })} placeholder="rgba(8,12,20,.82)" /></div>}
        {overlay.kind === "text" && <>
          <div className="prop-input"><span className="k">צבע מסגרת</span>
            <input type="color" value={overlay.borderColor?.startsWith("#") ? overlay.borderColor : "#ffffff"} onChange={(e) => onUpdate({ borderColor: e.target.value })} /></div>
          <div className="prop-input"><span className="k">עובי מסגרת</span>
            <input type="number" min={0} max={40} step={1} value={overlay.borderWidth || 0} onChange={(e) => onUpdate({ borderWidth: Math.max(0, +e.target.value) })} /></div>
        </>}
      </Section>

      {overlay.kind === "text" && (
        <Section title="טקסט">
          <div className="prop-input" style={{ alignItems: "flex-start" }}><span className="k">תוכן</span>
            <textarea rows={3} value={overlay.text || ""} dir="rtl"
              onChange={(e) => onUpdate({ text: e.target.value })}
              style={{ flex: 1, resize: "vertical", minHeight: 56 }} /></div>
          <div className="prop-input"><span className="k">גודל</span>
            <input type="number" step={1} min={8} max={400} value={overlay.fontSize || 48}
              onChange={(e) => onUpdate({ fontSize: Math.max(8, +e.target.value) })} /></div>
          <div className="prop-input"><span className="k">צבע</span>
            <input type="color" value={overlay.color || "#ffffff"}
              onChange={(e) => onUpdate({ color: e.target.value })} style={{ flex: 1, height: 28, padding: 0 }} /></div>
          <div className="prop">
            <span className="k">מודגש</span>
            <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Toggle checked={!!overlay.bold} onChange={(v) => onUpdate({ bold: v })} />
            </span>
          </div>
        </Section>
      )}
    </>
  );
}

function ClipInspector(p: Props & { clip: Clip; focus: InspectorFocus }) {
  const { clip, assetDuration, focus } = p;
  const dur = Math.max(0, clip.end - clip.start);
  const setIn = (v: number) => p.onUpdate({ start: Math.max(0, Math.min(v, clip.end - 0.05)) });
  const setOut = (v: number) => p.onUpdate({ end: Math.min(assetDuration || v, Math.max(v, clip.start + 0.05)) });
  const showAudio = p.assetKind !== "image";
  const audioFirst = focus === "audio";

  const audioSection = showAudio && (
    <Section title="שמע">
      <div className="prop"><span className="k">עוצמה</span><span className="v mono">{Math.round(clipVolume(clip) * 100)}%</span></div>
      <input type="range" min={0} max={2} step={0.05} value={clipVolume(clip)} onChange={(e) => p.onUpdate({ volume: +e.target.value })} style={{ width: "100%", marginTop: 4 }} />
      <div className="prop-input"><label className="k" htmlFor={`fade-in-${clip.id}`}>Fade in (שנ׳)</label>
        <input id={`fade-in-${clip.id}`} type="number" min={0} max={dur} step={0.05} value={+clipAudioFades(clip).fadeIn.toFixed(2)}
          onChange={(e) => p.onUpdate({ fadeIn: +e.target.value })} /></div>
      <div className="prop-input"><label className="k" htmlFor={`fade-out-${clip.id}`}>Fade out (שנ׳)</label>
        <input id={`fade-out-${clip.id}`} type="number" min={0} max={dur} step={0.05} value={+clipAudioFades(clip).fadeOut.toFixed(2)}
          onChange={(e) => p.onUpdate({ fadeOut: +e.target.value })} /></div>
    </Section>
  );

  const visualSection = p.assetKind !== "audio" && (
    <Section title="תצוגה והיפוך (Mirroring)">
      <div className="prop"><span className="k">שקיפות</span><span className="v mono">{Math.round(clipOpacity(clip) * 100)}%</span></div>
      <input type="range" min={0} max={1} step={0.01} value={clipOpacity(clip)}
        onChange={(e) => p.onUpdate({ opacity: Math.max(0, Math.min(1, +e.target.value)) })}
        style={{ width: "100%", marginTop: 4 }} />
      <div className="prop-input"><label className="k" htmlFor={`color-preset-${clip.id}`}>Preset</label>
        <select id={`color-preset-${clip.id}`} value={matchingColorPreset(clipContrast(clip), clipSaturation(clip))}
          onChange={(e) => {
            const preset = CLIP_COLOR_PRESETS.find((item) => item.id === e.target.value);
            if (preset) p.onUpdate({ contrast: preset.contrast, saturation: preset.saturation });
          }} style={{ flex: 1 }}>
          <option value="custom" disabled>מותאם אישית</option>
          {CLIP_COLOR_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.labelHe}</option>)}
        </select>
      </div>
      <div className="prop"><span className="k">ניגודיות</span><span className="v mono">{Math.round(clipContrast(clip) * 100)}%</span></div>
      <input type="range" min={0.5} max={2} step={0.05} value={clipContrast(clip)}
        onChange={(e) => p.onUpdate({ contrast: +e.target.value })} style={{ width: "100%", marginTop: 4 }} />
      <div className="prop"><span className="k">רוויה</span><span className="v mono">{Math.round(clipSaturation(clip) * 100)}%</span></div>
      <input type="range" min={0} max={3} step={0.05} value={clipSaturation(clip)}
        onChange={(e) => p.onUpdate({ saturation: +e.target.value })} style={{ width: "100%", marginTop: 4 }} />
      <button type="button" className="btn sm" onClick={() => p.onUpdate({ contrast: 1, saturation: 1 })}>איפוס צבע</button>
      <div className="prop-input"><label className="k" htmlFor={`visual-fade-in-${clip.id}`}>Fade in חזותי (שנ׳)</label>
        <input id={`visual-fade-in-${clip.id}`} type="number" min={0} max={dur} step={0.05} value={+clipVisualFades(clip).fadeIn.toFixed(2)}
          onChange={(e) => p.onUpdate({ visualFadeIn: +e.target.value })} /></div>
      <div className="prop-input"><label className="k" htmlFor={`visual-fade-out-${clip.id}`}>Fade out חזותי (שנ׳)</label>
        <input id={`visual-fade-out-${clip.id}`} type="number" min={0} max={dur} step={0.05} value={+clipVisualFades(clip).fadeOut.toFixed(2)}
          onChange={(e) => p.onUpdate({ visualFadeOut: +e.target.value })} /></div>
      
      <div className="prop" style={{ marginTop: 8 }}><span className="k">היפוך מראה (Mirror)</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button
          type="button"
          className={`btn sm ${clipFlipX(clip) ? "primary" : ""}`}
          onClick={() => p.onUpdate({ flipX: !clipFlipX(clip) })}
          data-tip="היפוך אופקי ימין-שמאל (מראה)"
        >
          ↔ היפוך אופקי {clipFlipX(clip) ? "✓" : ""}
        </button>
        <button
          type="button"
          className={`btn sm ${clipFlipY(clip) ? "primary" : ""}`}
          onClick={() => p.onUpdate({ flipY: !clipFlipY(clip) })}
          data-tip="היפוך אנכי מעלה-מטה"
        >
          ↕ היפוך אנכי {clipFlipY(clip) ? "✓" : ""}
        </button>
      </div>
    </Section>
  );

  return (
    <>
      <Section title="מקור">
        <div className="prop"><span className="k">קובץ</span><span className="v" title={p.assetName}>{p.assetName}</span></div>
        <div className="prop"><span className="k">סוג</span><span className="v">{KIND[p.assetKind]}</span></div>
        <div className="prop"><span className="k">רצועה</span><span className="v">{p.trackName}</span></div>
        {p.assetKind === "image" && p.onConvertImageClipToOverlay &&
          <button type="button" className="btn primary sm" onClick={p.onConvertImageClipToOverlay} data-tip="הסר את קליפ התמונה מהרצועה והפוך אותו ללוגו קטן מעל הסרטון">הפוך ללוגו קטן מעל הווידאו</button>}
        <div className="prop">
          <span className="k">פעיל</span>
          <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
            <Toggle checked={clipEnabled(clip)} onChange={(v) => p.onUpdate({ enabled: v })} tip="נכלל בייצוא ובנגן" />
          </span>
        </div>
      </Section>

      {audioFirst && audioSection}
      {!audioFirst && visualSection}

      <Section title="עריכה">
        <div className="prop"><span className="k">מיקום בציר</span><span className="v mono">{formatTimecode(p.timelineStart)}</span></div>
        <div className="prop-input"><span className="k">In (שנ')</span>
          <input type="number" step={0.05} min={0} max={clip.end} value={+clip.start.toFixed(3)} onChange={(e) => setIn(+e.target.value)} /></div>
        <div className="prop-input"><span className="k">Out (שנ')</span>
          <input type="number" step={0.05} min={clip.start} max={assetDuration || undefined} value={+clip.end.toFixed(3)} onChange={(e) => setOut(+e.target.value)} /></div>
        <div className="prop"><span className="k">משך</span><span className="v mono">{dur.toFixed(2)}s</span></div>
      </Section>

      {audioFirst && visualSection}
      {!audioFirst && audioSection}
    </>
  );
}
