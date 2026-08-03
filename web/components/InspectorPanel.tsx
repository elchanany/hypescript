"use client";

// Right-side Inspector. No clip selected -> project settings. Clip selected ->
// properties that actually drive the engine (source in/out, enabled, volume).
// Every edit flows through onUpdate -> useEditor -> History and affects render/preview.
import { Clip, clipEnabled, clipVolume } from "@/lib/editor/model";
import { formatTimecode } from "@/lib/editor/time";
import { SlidersHorizontal } from "lucide-react";
import { Section, Toggle } from "@/components/ui";

interface Props {
  width?: number;
  clip: Clip | null;
  assetName: string;
  assetKind: "video" | "image" | "audio";
  assetDuration: number;
  trackName: string;
  timelineStart: number;
  onUpdate: (patch: Partial<Clip>) => void;
  // project fallback
  projectName: string;
  mediaCount: number;
  sourceDuration: number;
  editedDuration: number;
}

const KIND = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;

export default function InspectorPanel(p: Props) {
  const { clip } = p;

  return (
    <aside className="inspector2" style={p.width ? { width: p.width } : undefined}>
      <div className="panel-header">
        <span className="title"><SlidersHorizontal size={15} strokeWidth={1.75} />{clip ? "מאפייני קטע" : "הגדרות פרויקט"}</span>
      </div>
      <div className="insp-scroll">
        {!clip ? (
          <Section title="פרויקט">
            <div className="prop"><span className="k">שם</span><span className="v">{p.projectName || "—"}</span></div>
            <div className="prop"><span className="k">קבצי מקור</span><span className="v mono">{p.mediaCount}</span></div>
            <div className="prop"><span className="k">אורך מקור</span><span className="v mono">{formatTimecode(p.sourceDuration)}</span></div>
            <div className="prop"><span className="k">אורך ערוך</span><span className="v mono">{formatTimecode(p.editedDuration)}</span></div>
            {p.mediaCount === 0 && <div className="insp-empty" style={{ padding: "12px 0 0" }}>בחר קטע בציר הזמן כדי לערוך את מאפייניו.</div>}
          </Section>
        ) : (
          <ClipInspector {...p} clip={clip} />
        )}
      </div>
    </aside>
  );
}

function ClipInspector(p: Props & { clip: Clip }) {
  const { clip, assetDuration } = p;
  const dur = Math.max(0, clip.end - clip.start);
  const setIn = (v: number) => p.onUpdate({ start: Math.max(0, Math.min(v, clip.end - 0.05)) });
  const setOut = (v: number) => p.onUpdate({ end: Math.min(assetDuration || v, Math.max(v, clip.start + 0.05)) });

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

      <Section title="עריכה">
        <div className="prop"><span className="k">מיקום בציר</span><span className="v mono">{formatTimecode(p.timelineStart)}</span></div>
        <div className="prop-input"><span className="k">In (שנ')</span>
          <input type="number" step={0.05} min={0} max={clip.end} value={+clip.start.toFixed(3)} onChange={(e) => setIn(+e.target.value)} /></div>
        <div className="prop-input"><span className="k">Out (שנ')</span>
          <input type="number" step={0.05} min={clip.start} max={assetDuration || undefined} value={+clip.end.toFixed(3)} onChange={(e) => setOut(+e.target.value)} /></div>
        <div className="prop"><span className="k">משך</span><span className="v mono">{dur.toFixed(2)}s</span></div>
      </Section>

      {p.assetKind !== "image" && (
        <Section title="שמע">
          <div className="prop"><span className="k">עוצמה</span><span className="v mono">{Math.round(clipVolume(clip) * 100)}%</span></div>
          <input type="range" min={0} max={2} step={0.05} value={clipVolume(clip)} onChange={(e) => p.onUpdate({ volume: +e.target.value })} style={{ width: "100%", marginTop: 4 }} />
        </Section>
      )}
    </>
  );
}
