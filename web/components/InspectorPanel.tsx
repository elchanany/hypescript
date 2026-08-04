"use client";

// Contextual Inspector — focus driven by Active Selection only (never hover).
// Project settings when nothing selected. Only connected properties are shown.

import { Clip, clipEnabled, clipVolume } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { formatTimecode } from "@/lib/editor/time";
import { FitMode, VideoTransform } from "@/lib/editor/videoTransform";
import { SlidersHorizontal } from "lucide-react";
import { Section, Toggle } from "@/components/ui";
import type { InspectorFocus } from "@/lib/editor/selection";

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
  onUpdateOverlay?: (patch: Partial<Overlay>) => void;
  onUpdateSub?: (patch: Partial<Sub>) => void;
  canvas?: CanvasSize;
  videoTransform?: VideoTransform | null;
  onVideoTransform?: (patch: Partial<VideoTransform>) => void;
  onFitMode?: (mode: FitMode) => void;
  avLinked?: boolean;
  onDetachAudio?: () => void;
  onRelinkAudio?: () => void;
  // project fallback
  projectName: string;
  mediaCount: number;
  sourceDuration: number;
  editedDuration: number;
}

const KIND = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;

function titleFor(focus: InspectorFocus, overlay?: Overlay | null): string {
  switch (focus) {
    case "video": return "מאפייני וידאו";
    case "audio": return "מאפייני שמע";
    case "caption": return "מאפייני כתובית";
    case "text": return "מאפייני טקסט";
    case "image": return "מאפייני תמונה";
    case "gap": return "מאפייני רווח";
    case "track": return "מאפייני רצועה";
    case "asset": return "פרטי מדיה";
    default:
      if (overlay?.kind === "text") return "מאפייני טקסט";
      if (overlay) return "מאפייני תמונה";
      return "הגדרות פרויקט";
  }
}

export default function InspectorPanel(p: Props) {
  const { clip, overlay, sub } = p;
  const focus: InspectorFocus = p.focus
    || (overlay ? (overlay.kind === "text" ? "text" : "image") : sub ? "caption" : clip ? (p.assetKind === "audio" || p.focus === "audio" ? "audio" : "video") : "project");
  const title = titleFor(focus, overlay);

  return (
    <aside className="inspector2" style={p.width ? { width: p.width } : undefined}>
      <div className="panel-header">
        <span className="title"><SlidersHorizontal size={15} strokeWidth={1.75} />{title}</span>
      </div>
      <div className="insp-scroll">
        {overlay ? (
          <OverlayInspector overlay={overlay} onUpdate={p.onUpdateOverlay!} assetName={p.assetName} canvas={p.canvas} />
        ) : sub ? (
          <SubInspector sub={sub} onUpdate={p.onUpdateSub!} canvas={p.canvas} />
        ) : focus === "gap" && clip ? (
          <GapInspector clip={clip} timelineStart={p.timelineStart} />
        ) : !clip ? (
          <Section title="פרויקט">
            <div className="prop"><span className="k">שם</span><span className="v">{p.projectName || "—"}</span></div>
            <div className="prop"><span className="k">קבצי מקור</span><span className="v mono">{p.mediaCount}</span></div>
            <div className="prop"><span className="k">אורך מקור</span><span className="v mono">{formatTimecode(p.sourceDuration)}</span></div>
            <div className="prop"><span className="k">אורך ערוך</span><span className="v mono">{formatTimecode(p.editedDuration)}</span></div>
            {p.canvas && (
              <div className="prop"><span className="k">קנבס פרויקט</span><span className="v mono">{p.canvas.width}×{p.canvas.height}</span></div>
            )}
            <div className="insp-empty" style={{ padding: "12px 0 0" }}>
              בחר קטע, כתובית או שכבה כדי לערוך מאפיינים. זום התצוגה אינו משנה את גודל האלמנט בפלט.
            </div>
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

function GapInspector({ clip, timelineStart }: { clip: Clip; timelineStart: number }) {
  return (
    <Section title="רווח">
      <div className="prop"><span className="k">מיקום</span><span className="v mono">{formatTimecode(timelineStart)}</span></div>
      <div className="prop"><span className="k">משך</span><span className="v mono">{(clip.end - clip.start).toFixed(2)}s</span></div>
      <div className="insp-empty" style={{ paddingTop: 8 }}>מחק רווח (Delete) או סגור ריפל מהתפריט.</div>
    </Section>
  );
}

function SubInspector({ sub, onUpdate, canvas }: { sub: Sub; onUpdate: (patch: Partial<Sub>) => void; canvas?: CanvasSize }) {
  const dur = Math.max(0, sub.end - sub.start);
  const cw = canvas?.width || 1920;
  const ch = canvas?.height || 1080;
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
      </Section>
      <Section title="מיקום על הקנבס">
        <div className="prop-input"><span className="k">X</span>
          <input type="number" step={1} value={num(sub.x ?? cw / 2, 1)}
            onChange={(e) => onUpdate({ x: +e.target.value })} /></div>
        <div className="prop-input"><span className="k">Y</span>
          <input type="number" step={1} value={num(sub.y ?? ch * 0.88, 1)}
            onChange={(e) => onUpdate({ y: +e.target.value })} /></div>
        <div className="prop-input"><span className="k">רוחב</span>
          <input type="number" step={1} min={40} value={num(sub.w ?? cw * 0.84, 1)}
            onChange={(e) => onUpdate({ w: Math.max(40, +e.target.value) })} /></div>
        <div className="prop-input"><span className="k">Scale</span>
          <input type="number" step={0.05} min={0.2} max={4} value={num(sub.scale ?? 1, 2)}
            onChange={(e) => onUpdate({ scale: Math.max(0.2, Math.min(4, +e.target.value)) })} /></div>
        <div className="prop-input"><span className="k">סיבוב°</span>
          <input type="number" step={1} value={num(sub.rotation ?? 0, 1)}
            onChange={(e) => onUpdate({ rotation: +e.target.value })} /></div>
      </Section>
    </>
  );
}

function OverlayInspector({ overlay, onUpdate, assetName, canvas }: {
  overlay: Overlay; onUpdate: (patch: Partial<Overlay>) => void; assetName: string; canvas?: CanvasSize;
}) {
  const t = overlay.transform;
  const setT = (patch: Partial<Overlay["transform"]>) => onUpdate({ transform: { ...t, ...patch } });
  const cw = canvas?.width || 1920;
  const ch = canvas?.height || 1080;

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
  const { clip, assetDuration, focus, videoTransform } = p;
  const dur = Math.max(0, clip.end - clip.start);
  const setIn = (v: number) => p.onUpdate({ start: Math.max(0, Math.min(v, clip.end - 0.05)) });
  const setOut = (v: number) => p.onUpdate({ end: Math.min(assetDuration || v, Math.max(v, clip.start + 0.05)) });
  const showAudio = p.assetKind !== "image";
  const audioFirst = focus === "audio";
  const showVideoTransform = focus === "video" && videoTransform && p.onVideoTransform;

  const audioSection = showAudio && (
    <Section title="שמע">
      <div className="prop"><span className="k">עוצמה</span><span className="v mono">{Math.round(clipVolume(clip) * 100)}%</span></div>
      <input type="range" min={0} max={2} step={0.05} value={clipVolume(clip)} onChange={(e) => p.onUpdate({ volume: +e.target.value })} style={{ width: "100%", marginTop: 4 }} />
      <div className="prop"><span className="k">A/V</span>
        <span className="v">{p.avLinked !== false ? "מקושר" : "מנותק"}</span>
      </div>
      {p.avLinked !== false && p.onDetachAudio && (
        <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 6 }} onClick={p.onDetachAudio}>נתק אודיו</button>
      )}
      {p.avLinked === false && p.onRelinkAudio && (
        <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 6 }} onClick={p.onRelinkAudio}>קשר מחדש</button>
      )}
    </Section>
  );

  return (
    <>
      <Section title="מקור">
        <div className="prop"><span className="k">קובץ</span><span className="v" title={p.assetName}>{p.assetName}</span></div>
        <div className="prop"><span className="k">סוג</span><span className="v">{KIND[p.assetKind]}</span></div>
        <div className="prop"><span className="k">רצועה</span><span className="v">{p.trackName}</span></div>
        <div className="prop">
          <span className="k">פעיל</span>
          <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
            <Toggle checked={clipEnabled(clip)} onChange={(v) => p.onUpdate({ enabled: v })} tip="נכלל בייצוא ובנגן" />
          </span>
        </div>
      </Section>

      {audioFirst && audioSection}

      <Section title="עריכה">
        <div className="prop"><span className="k">מיקום בציר</span><span className="v mono">{formatTimecode(p.timelineStart)}</span></div>
        <div className="prop-input"><span className="k">In (שנ')</span>
          <input type="number" step={0.05} min={0} max={clip.end} value={+clip.start.toFixed(3)} onChange={(e) => setIn(+e.target.value)} /></div>
        <div className="prop-input"><span className="k">Out (שנ')</span>
          <input type="number" step={0.05} min={clip.start} max={assetDuration || undefined} value={+clip.end.toFixed(3)} onChange={(e) => setOut(+e.target.value)} /></div>
        <div className="prop"><span className="k">משך</span><span className="v mono">{dur.toFixed(2)}s</span></div>
      </Section>

      {showVideoTransform && videoTransform && (
        <Section title="וידאו על הקנבס">
          <div className="prop"><span className="k">מצב</span>
            <span className="v" style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(["fit", "fill", "original", "custom"] as FitMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn ghost ${videoTransform.fitMode === m ? "on" : ""}`}
                  style={{ padding: "2px 8px", fontSize: 11 }}
                  onClick={() => p.onFitMode?.(m)}
                >
                  {m === "fit" ? "Fit" : m === "fill" ? "Fill" : m === "original" ? "מקור" : "חופשי"}
                </button>
              ))}
            </span>
          </div>
          <div className="prop-input"><span className="k">X</span>
            <input type="number" step={1} value={num(videoTransform.x, 1)}
              onChange={(e) => p.onVideoTransform?.({ x: +e.target.value, fitMode: "custom" })} /></div>
          <div className="prop-input"><span className="k">Y</span>
            <input type="number" step={1} value={num(videoTransform.y, 1)}
              onChange={(e) => p.onVideoTransform?.({ y: +e.target.value, fitMode: "custom" })} /></div>
          <div className="prop-input"><span className="k">רוחב</span>
            <input type="number" step={1} min={8} value={num(videoTransform.w, 1)}
              onChange={(e) => p.onVideoTransform?.({ w: Math.max(8, +e.target.value), fitMode: "custom" })} /></div>
          <div className="prop-input"><span className="k">גובה</span>
            <input type="number" step={1} min={8} value={num(videoTransform.h, 1)}
              onChange={(e) => p.onVideoTransform?.({ h: Math.max(8, +e.target.value), fitMode: "custom" })} /></div>
          <div className="prop-input"><span className="k">סיבוב°</span>
            <input type="number" step={1} value={num(videoTransform.rotation, 1)}
              onChange={(e) => p.onVideoTransform?.({ rotation: +e.target.value, fitMode: "custom" })} /></div>
          <div className="prop"><span className="k">שקיפות</span><span className="v mono">{Math.round(videoTransform.opacity * 100)}%</span></div>
          <input type="range" min={0} max={1} step={0.01} value={videoTransform.opacity}
            onChange={(e) => p.onVideoTransform?.({ opacity: Math.max(0, Math.min(1, +e.target.value)) })}
            style={{ width: "100%", marginTop: 4 }} />
          <div className="prop">
            <span className="k">יחס קבוע</span>
            <span className="v" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Toggle checked={videoTransform.uniformScale} onChange={(v) => p.onVideoTransform?.({ uniformScale: v })} />
            </span>
          </div>
        </Section>
      )}

      {!audioFirst && audioSection}
    </>
  );
}
