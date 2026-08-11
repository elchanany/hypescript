"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Undo2, Redo2, MessageCircle, Settings, Download, Loader2, Plus, Pencil, Trash2, Check, FolderOpen, LayoutGrid, LogIn, Moon, Sun, MessagesSquare, UserRound, LogOut, CreditCard } from "lucide-react";
import { IconButton, ContextMenu, CtxItem, useOutside } from "@/components/ui";
import BrandLogo from "@/components/BrandLogo";
import { ProjectMeta } from "@/lib/storage";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function TopBar({
  projectName, projects, projectId, saving,
  onSwitch, onNew, onRename, onDelete,
  canUndo, canRedo, onUndo, onRedo,
  chatOpen, onToggleChat, focusMode, onToggleFocusMode,
  canExport, rendering, renderProgress = 0, onExport,
}: {
  projectName: string; projects: ProjectMeta[]; projectId: string | null; saving: boolean;
  onSwitch: (id: string) => void; onNew: () => void; onRename: () => void; onDelete: () => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  chatOpen: boolean; onToggleChat: () => void; focusMode: boolean; onToggleFocusMode: () => void;
  canExport: boolean; rendering: boolean; renderProgress?: number; onExport: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const { configured: authOn, user, signOut } = useAuth();
  const { resolved, setMode } = useTheme();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useOutside<HTMLDivElement>(() => setUserOpen(false));
  const avatar = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined;
  const userName = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "חשבון") as string;

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
        <Link href="/dashboard" className="tb-logo" title="Hypescript — לוח פרויקטים" aria-label="Hypescript">
          <BrandLogo variant="icon" size="sm" decorative priority />
        </Link>
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
        <Link href="/dashboard" className="iconbtn" data-tip="לוח פרויקטים" aria-label="לוח פרויקטים"><LayoutGrid size={16} strokeWidth={1.75} /></Link>
        <IconButton icon={MessageCircle} tip="פתח שיחה לצד העורך" active={chatOpen && !focusMode} onClick={onToggleChat} />
        <button className={`tb-focus ${focusMode ? "on" : ""}`} onClick={onToggleFocusMode} data-tip="מצב שיחה — וידאו ושיחה בלבד">
          <MessagesSquare size={16} strokeWidth={1.75} />
          <span>{focusMode ? "חזרה לעורך" : "מצב שיחה"}</span>
        </button>
        <IconButton
          icon={resolved === "dark" ? Sun : Moon}
          tip={resolved === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
          onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
        />
        <Link href="/settings" className="iconbtn" data-tip="הגדרות" aria-label="הגדרות"><Settings size={16} strokeWidth={1.75} /></Link>
        {authOn && !user && (
          <Link href="/login" className="iconbtn" data-tip="התחברות" aria-label="התחברות"><LogIn size={16} strokeWidth={1.75} /></Link>
        )}
        {authOn && user && <div className="tb-account-wrap" ref={userRef}>
          <button className="tb-account" type="button" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen} aria-haspopup="menu">
            {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <UserRound size={16} />}
            <span>{userName.split(" ")[0]}</span><ChevronDown size={13} />
          </button>
          {userOpen && <div className="tb-account-menu" role="menu">
            <div className="tb-account-meta"><strong>{userName}</strong><span>{user.email}</span></div>
            <Link href="/account" role="menuitem"><CreditCard size={15} />חשבון ומנוי</Link>
            <Link href="/settings" role="menuitem"><Settings size={15} />הגדרות</Link>
            <button role="menuitem" onClick={async () => { await signOut(); window.location.href = "/welcome"; }}><LogOut size={15} />התנתקות</button>
          </div>}
        </div>}
        <button className="btn primary tall" onClick={onExport} disabled={!canExport} data-tip={rendering ? "פתח את מצב הייצוא" : "ייצוא הווידאו הערוך"}>
          {rendering ? <Loader2 size={16} strokeWidth={2} className="spin" /> : <Download size={16} strokeWidth={2} />}
          {rendering ? `מרנדר ${Math.max(0, Math.min(100, Math.round(renderProgress * 100)))}%` : "ייצוא"}
        </button>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </div>
  );
}
