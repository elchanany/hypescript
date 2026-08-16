"use client";

import { useEffect, useRef, useState } from "react";
import { MediaAsset } from "@/lib/editor/model";
import { buildDragPreviewEl, MEDIA_DRAG_MIME, releaseDragPreviewEl } from "@/lib/editor/mediaDrag";
import { AtSign, Film, Image as ImageIcon, Layers, Music, Pencil, Plus, Trash2, Upload, LayoutGrid, List, RefreshCw, TriangleAlert } from "@/components/icons";
import { IconButton } from "@/components/ui";
import { UploadProgressCard } from "@/components/LoadingState";
import type { TransferProgress } from "@/lib/ui/progress";

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music } as const;
const KIND_LABEL = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type View = "grid" | "list";

function CellThumb({ asset }: { asset: MediaAsset }) {
  const [url, setUrl] = useState<string | null>(asset.kind === "image" ? asset.url : null);
  useEffect(() => {
    if (asset.kind !== "video") { setUrl(asset.kind === "image" ? asset.url : null); return; }
    let cancelled = false;
    setUrl(null);
    (async () => {
      try {
        const { getThumbnail } = await import("@/lib/media/thumbnails");
        const u = await getThumbnail(asset.file, Math.min(1, asset.duration * 0.1), 90);
        if (!cancelled) setUrl(u);
      } catch { /* falls back to the kind glyph */ }
    })();
    return () => { cancelled = true; };
  }, [asset]);

  const Icon = KIND_ICON[asset.kind];
  return (
    <div className={`cell-thumb kind-${asset.kind}`}>
      {asset.missing ? <div className="cell-missing"><TriangleAlert size={24} /><span>קובץ חסר</span></div>
        : url ? <img src={url} alt="" draggable={false} />
        : asset.kind === "video" ? <span className="strip-loading cover" />
        : <Icon size={22} strokeWidth={1.5} />}
      {url && <span className="cell-kind"><Icon size={13} strokeWidth={2} /></span>}
      {asset.kind !== "image" && <span className="cell-dur">{fmtDur(asset.duration)}</span>}
    </div>
  );
}

export default function MediaPanel({
  media, mainId, uploadProgress, onUpload, onAddClip, onAddOverlay, onMention, onRename, onRemove, onRelink, onAssetMenu,
}: {
  media: MediaAsset[]; mainId?: string;
  uploadProgress?: TransferProgress | null;
  onUpload: (files: FileList | File[] | null) => void;
  onAddClip: (asset: MediaAsset) => void;
  onAddOverlay: (asset: MediaAsset) => void;
  onMention: (asset: MediaAsset) => void;
  onRename: (asset: MediaAsset) => void;
  onRemove: (id: string) => void;
  onRelink: (id: string, file: File) => void;
  onAssetMenu?: (id: string, x: number, y: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const relinkRef = useRef<HTMLInputElement>(null);
  const relinkId = useRef<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [view, setView] = useState<View>("grid");
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const thumbCache = useRef<Map<string, string>>(new Map());

  useEffect(() => { const v = localStorage.getItem("hs_mediaview"); if (v === "list" || v === "grid") setView(v); }, []);
  const changeView = (v: View) => { setView(v); localStorage.setItem("hs_mediaview", v); };

  const startMediaDrag = (e: React.DragEvent, m: MediaAsset) => {
    e.dataTransfer.setData(MEDIA_DRAG_MIME, m.id);
    e.dataTransfer.effectAllowed = "copy";
    const thumbUrl = m.kind === "image" ? m.url : (thumbCache.current.get(m.id) || null);
    releaseDragPreviewEl(dragPreviewRef.current);
    const preview = buildDragPreviewEl({
      name: m.name.replace(/\.[^.]+$/, "") || m.name,
      dur: m.duration,
      kind: m.kind,
      thumbUrl,
    });
    dragPreviewRef.current = preview;
    try {
      e.dataTransfer.setDragImage(preview, 28, 28);
    } catch { /* חלק מהדפדפנים */ }
    // אם אין תמונה עדיין — נטען לרקע לגרירות הבאות
    if (!thumbUrl && m.kind === "video") {
      void import("@/lib/media/thumbnails").then(({ getThumbnail }) =>
        getThumbnail(m.file, Math.min(1, m.duration * 0.1), 90)
          .then((u) => thumbCache.current.set(m.id, u))
          .catch(() => {}),
      );
    }
  };

  const endMediaDrag = () => {
    releaseDragPreviewEl(dragPreviewRef.current);
    dragPreviewRef.current = null;
  };

  // טעינת תמונות מראש לרשת — כדי ש-setDragImage יהיה מיידי
  useEffect(() => {
    media.filter((m) => m.kind === "video").slice(0, 12).forEach((m) => {
      if (thumbCache.current.has(m.id)) return;
      void import("@/lib/media/thumbnails").then(({ getThumbnail }) =>
        getThumbnail(m.file, Math.min(1, m.duration * 0.1), 90)
          .then((u) => thumbCache.current.set(m.id, u))
          .catch(() => {}),
      );
    });
  }, [media]);

  return (
    <>
      <div className="panel-header">
        <span className="title"><Film size={15} strokeWidth={1.75} />מדיה</span>
        <div className="actions">
          <IconButton icon={view === "grid" ? List : LayoutGrid}
            tip={view === "grid" ? "תצוגת רשימה" : "תצוגת רשת"}
            onClick={() => changeView(view === "grid" ? "list" : "grid")} />
          <IconButton icon={Upload} tip="העלה קבצים" onClick={() => fileRef.current?.click()} />
        </div>
      </div>
      <input ref={fileRef} type="file" accept="video/*,image/*,audio/*" multiple hidden
        onChange={(e) => { onUpload(e.target.files); e.currentTarget.value = ""; }} />
      <input ref={relinkRef} type="file" accept="video/*,image/*,audio/*" hidden
        onChange={(e) => { const file = e.target.files?.[0]; const id = relinkId.current; if (file && id) onRelink(id, file); e.currentTarget.value = ""; relinkId.current = null; }} />

      {uploadProgress && <UploadProgressCard value={uploadProgress} compact />}

      <div className="panel-scroll"
        onDragOver={(e) => {
          // העלאת קבצים מהמערכת — לא גרירת מדיה פנימית
          if (Array.from(e.dataTransfer.types).includes(MEDIA_DRAG_MIME)) return;
          e.preventDefault(); setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (Array.from(e.dataTransfer.types).includes(MEDIA_DRAG_MIME)) return;
          e.preventDefault(); setOver(false); onUpload(e.dataTransfer.files);
        }}>
        {media.length === 0 ? (
          <div className={`dropzone ${over ? "over" : ""}`} onClick={() => fileRef.current?.click()}>
            גרור לכאן קבצי וידאו, שמע או תמונה — או לחץ להעלאה
          </div>
        ) : view === "grid" ? (
          <div className="media-grid">
            {media.map((m) => (
              <div key={m.id}
                className={`media-cell ${m.id === mainId ? "main" : ""} ${m.id === sel ? "selected" : ""} ${m.missing ? "missing" : ""}`}
                draggable={!m.missing}
                onDragStart={(e) => startMediaDrag(e, m)}
                onDragEnd={endMediaDrag}
                onClick={() => setSel(m.id)}
                onDoubleClick={() => { if (!m.missing) m.kind === "image" ? onAddOverlay(m) : onAddClip(m); }}
                onContextMenu={(e) => { e.preventDefault(); setSel(m.id); onAssetMenu?.(m.id, e.clientX, e.clientY); }}
                title={`${m.name} — גרור לציר הזמן`}>
                <CellThumb asset={m} />
                {m.id === mainId && <span className="cell-badge">ראשי</span>}
                <div className="cell-actions">
                  {m.missing && <IconButton icon={RefreshCw} tip="אתר מחדש את הקובץ" tipPos="down" onClick={(e) => { e.stopPropagation(); relinkId.current = m.id; relinkRef.current?.click(); }} />}
                  {m.kind === "image" && !m.missing && <IconButton icon={Layers} tip="הוסף כלוגו / שכבה מעל הווידאו" tipPos="down" onClick={(e) => { e.stopPropagation(); onAddOverlay(m); }} />}
                  {!m.missing && <IconButton icon={Plus} tip={m.kind === "image" ? "הוסף כתמונה מלאה ברצועה" : "הוסף לציר"} tipPos="down" onClick={(e) => { e.stopPropagation(); onAddClip(m); }} />}
                  <IconButton icon={AtSign} tip="אזכר קובץ זה לסוכן" tipPos="down" onClick={(e) => { e.stopPropagation(); onMention(m); }} />
                  <IconButton icon={Pencil} tip="שנה שם" tipPos="down" onClick={(e) => { e.stopPropagation(); onRename(m); }} />
                  <IconButton icon={Trash2} tip="הסר" tipPos="down" danger onClick={(e) => { e.stopPropagation(); onRemove(m.id); }} />
                </div>
                <span className="cell-name">{m.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="media-list">
            {media.map((m) => {
              const Icon = KIND_ICON[m.kind];
              return (
                <div key={m.id}
                  className={`media-item ${m.id === mainId ? "main" : ""} ${m.id === sel ? "selected" : ""} ${m.missing ? "missing" : ""}`}
                  draggable={!m.missing}
                  onDragStart={(e) => startMediaDrag(e, m)}
                  onDragEnd={endMediaDrag}
                  onClick={() => setSel(m.id)}
                  onDoubleClick={() => { if (!m.missing) m.kind === "image" ? onAddOverlay(m) : onAddClip(m); }}
                  onContextMenu={(e) => { e.preventDefault(); setSel(m.id); onAssetMenu?.(m.id, e.clientX, e.clientY); }}
                  title={`${m.name} — גרור לציר הזמן`}>
                  <div className="media-thumb"><Icon size={16} strokeWidth={1.5} /></div>
                  <div className="media-meta">
                    <span className="media-name">{m.name}</span>
                    <span className="media-sub"><span className="tag">{KIND_LABEL[m.kind]}</span><span className="dur">{fmtDur(m.duration)}</span></span>
                  </div>
                  {m.id === mainId && <span className="media-badge">ראשי</span>}
                  <div className="media-actions">
                    {m.missing && <IconButton icon={RefreshCw} tip="אתר מחדש את הקובץ" tipPos="left" onClick={(e) => { e.stopPropagation(); relinkId.current = m.id; relinkRef.current?.click(); }} />}
                    {m.kind === "image" && !m.missing && <IconButton icon={Layers} tip="הוסף כלוגו / שכבה מעל הווידאו" tipPos="left" onClick={(e) => { e.stopPropagation(); onAddOverlay(m); }} />}
                    {!m.missing && <IconButton icon={Plus} tip={m.kind === "image" ? "הוסף כתמונה מלאה ברצועה" : "הוסף לציר"} tipPos="left" onClick={(e) => { e.stopPropagation(); onAddClip(m); }} />}
                    <IconButton icon={AtSign} tip="אזכר קובץ זה לסוכן" tipPos="left" onClick={(e) => { e.stopPropagation(); onMention(m); }} />
                    <IconButton icon={Pencil} tip="שנה שם" tipPos="left" onClick={(e) => { e.stopPropagation(); onRename(m); }} />
                    <IconButton icon={Trash2} tip="הסר" tipPos="left" danger onClick={(e) => { e.stopPropagation(); onRemove(m.id); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </>
  );
}
