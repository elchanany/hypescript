"use client";

import { useEffect, useRef, useState } from "react";
import { MediaAsset } from "@/lib/editor/model";
import { Film, Image as ImageIcon, Music, Plus, Trash2, Upload, LayoutGrid, List } from "lucide-react";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music } as const;
const KIND_LABEL = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type View = "grid" | "list";

// Real thumbnail for a grid cell. Video -> first-frame captured via the shared cache
// (NO ffmpeg.wasm); image -> its object URL; audio -> a music glyph (no fake artwork).
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
    <div className="cell-thumb">
      {url ? <img src={url} alt="" draggable={false} />
        : asset.kind === "video" ? <span className="strip-loading cover" />
        : <Icon size={22} strokeWidth={1.5} />}
      {url && <span className="cell-kind"><Icon size={13} strokeWidth={2} /></span>}
      {asset.kind !== "image" && <span className="cell-dur">{fmtDur(asset.duration)}</span>}
    </div>
  );
}

export default function MediaPanel({
  media, mainId, onUpload, onAddClip, onRemove,
}: {
  media: MediaAsset[]; mainId?: string;
  onUpload: (files: FileList | File[] | null) => void;
  onAddClip: (asset: MediaAsset) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [menu, setMenu] = useState<{ x: number; y: number; asset: MediaAsset } | null>(null);

  useEffect(() => { const v = localStorage.getItem("hs_mediaview"); if (v === "list" || v === "grid") setView(v); }, []);
  const changeView = (v: View) => { setView(v); localStorage.setItem("hs_mediaview", v); };

  const menuItems = (a: MediaAsset): CtxItem[] => [
    { label: "הוסף לציר הזמן", icon: Plus, onClick: () => onAddClip(a) },
    { sep: true, label: "" },
    { label: "הסר קובץ", icon: Trash2, danger: true, onClick: () => onRemove(a.id) },
  ];

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

      <div className="panel-scroll"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onUpload(e.dataTransfer.files); }}>
        {media.length === 0 ? (
          <div className={`dropzone ${over ? "over" : ""}`} onClick={() => fileRef.current?.click()}>
            גרור לכאן קבצי וידאו, שמע או תמונה — או לחץ להעלאה
          </div>
        ) : view === "grid" ? (
          <div className="media-grid">
            {media.map((m) => (
              <div key={m.id}
                className={`media-cell ${m.id === mainId ? "main" : ""} ${m.id === sel ? "selected" : ""}`}
                onClick={() => setSel(m.id)}
                onDoubleClick={() => onAddClip(m)}
                onContextMenu={(e) => { e.preventDefault(); setSel(m.id); setMenu({ x: e.clientX, y: e.clientY, asset: m }); }}
                title={m.name}>
                <CellThumb asset={m} />
                {m.id === mainId && <span className="cell-badge">ראשי</span>}
                <div className="cell-actions">
                  <IconButton icon={Plus} tip="הוסף לציר" tipPos="down" onClick={(e) => { e.stopPropagation(); onAddClip(m); }} />
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
                  className={`media-item ${m.id === mainId ? "main" : ""} ${m.id === sel ? "selected" : ""}`}
                  onClick={() => setSel(m.id)}
                  onDoubleClick={() => onAddClip(m)}
                  onContextMenu={(e) => { e.preventDefault(); setSel(m.id); setMenu({ x: e.clientX, y: e.clientY, asset: m }); }}
                  title={m.name}>
                  <div className="media-thumb"><Icon size={16} strokeWidth={1.5} /></div>
                  <div className="media-meta">
                    <span className="media-name">{m.name}</span>
                    <span className="media-sub"><span className="tag">{KIND_LABEL[m.kind]}</span><span className="dur">{fmtDur(m.duration)}</span></span>
                  </div>
                  {m.id === mainId && <span className="media-badge">ראשי</span>}
                  <div className="media-actions">
                    <IconButton icon={Plus} tip="הוסף לציר" tipPos="left" onClick={(e) => { e.stopPropagation(); onAddClip(m); }} />
                    <IconButton icon={Trash2} tip="הסר" tipPos="left" danger onClick={(e) => { e.stopPropagation(); onRemove(m.id); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.asset)} onClose={() => setMenu(null)} />}
    </>
  );
}
