"use client";

import { useRef, useState } from "react";
import { MediaAsset } from "@/lib/editor/model";
import { Film, Image as ImageIcon, Music, Plus, Trash2, Upload } from "lucide-react";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music } as const;
const KIND_LABEL = { video: "וידאו", image: "תמונה", audio: "שמע" } as const;
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
  const [menu, setMenu] = useState<{ x: number; y: number; asset: MediaAsset } | null>(null);

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
