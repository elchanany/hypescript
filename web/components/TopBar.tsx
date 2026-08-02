"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Undo2, Redo2, Bot, Settings, Download, Loader2, Plus, Pencil, Trash2, Check, FolderOpen } from "lucide-react";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";
import { ProjectMeta } from "@/lib/storage";

export default function TopBar({
  projectName, projects, projectId, saving,
  onSwitch, onNew, onRename, onDelete,
  canUndo, canRedo, onUndo, onRedo,
  chatOpen, onToggleChat,
  canExport, rendering, onExport,
}: {
  projectName: string; projects: ProjectMeta[]; projectId: string | null; saving: boolean;
  onSwitch: (id: string) => void; onNew: () => void; onRename: () => void; onDelete: () => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  chatOpen: boolean; onToggleChat: () => void;
  canExport: boolean; rendering: boolean; onExport: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const items: CtxItem[] = [
    ...projects.map((p) => ({ label: p.name, icon: p.id === projectId ? Check : FolderOpen, onClick: () => onSwitch(p.id) })),
    { sep: true, label: "" },
    { label: "פרויקט חדש", icon: Plus, onClick: onNew },
    { label: "שנה שם", icon: Pencil, onClick: onRename },
    { label: "מחק פרויקט", icon: Trash2, danger: true, onClick: onDelete },
  ];

  return (
    <div className="topbar2">
      <div className="tb-group tb-brand">
        <span className="tb-logo" style={{ fontWeight: 700, fontSize: 12 }}>hs</span>
        <button className="tb-project" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom + 4 }); }}>
          <span className="pname">{projectName || "פרויקט"}</span>
          <ChevronDown size={15} strokeWidth={1.75} />
        </button>
        <span className={`tb-save ${saving ? "saving" : ""}`}><span className="dot" />{saving ? "שומר…" : "נשמר"}</span>
      </div>

      <div className="tb-spacer" />

      <div className="tb-group">
        <IconButton icon={Undo2} tip="בטל (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} />
        <IconButton icon={Redo2} tip="בצע מחדש (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo} />
      </div>

      <div className="tb-spacer" />

      <div className="tb-group">
        <IconButton icon={Bot} tip="סוכן AI" active={chatOpen} onClick={onToggleChat} />
        <Link href="/settings" className="iconbtn" data-tip="הגדרות" aria-label="הגדרות"><Settings size={16} strokeWidth={1.75} /></Link>
        <button className="btn primary tall" onClick={onExport} disabled={!canExport || rendering} data-tip="ייצוא הווידאו הערוך">
          {rendering ? <Loader2 size={16} strokeWidth={2} className="spin" /> : <Download size={16} strokeWidth={2} />}
          {rendering ? "מרנדר…" : "ייצוא"}
        </button>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </div>
  );
}
