"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Undo2, Redo2, MessageCircle, Settings, Download, Loader2, Plus, Pencil, Trash2, Check, FolderOpen, LayoutGrid, LogIn, Moon, Sun, MessagesSquare, UserRound, LogOut, CreditCard, ShieldCheck, Command } from "@/components/icons";
import { IconButton, ContextMenu, CtxItem, useOutside } from "@/components/ui";
import BrandLogo from "@/components/BrandLogo";
import { ProjectMeta } from "@/lib/storage";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme/ThemeProvider";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { AspectRatioPicker } from "@/components/AspectRatioPicker";
import { CanvasSize } from "@/lib/editor/canvasCoords";

export default function TopBar({
  projectName, projects, projectId, saving,
  onSwitch, onNew, onRename, onDelete,
  canUndo, canRedo, onUndo, onRedo,
  chatOpen, onToggleChat, focusMode, onToggleFocusMode,
  canExport, rendering, renderProgress = 0, onExport,
  canvas, onChangeCanvas,
}: {
  projectName: string; projects: ProjectMeta[]; projectId: string | null; saving: boolean;
  onSwitch: (id: string) => void; onNew: () => void; onRename: () => void; onDelete: () => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  chatOpen: boolean; onToggleChat: () => void; focusMode: boolean; onToggleFocusMode: () => void;
  canExport: boolean; rendering: boolean; renderProgress?: number; onExport: () => void;
  canvas?: CanvasSize; onChangeCanvas?: (canvas: CanvasSize) => void;
}) {
  const { t } = useI18n();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [kbdOpen, setKbdOpen] = useState(false);
  const { configured: authOn, user, signOut } = useAuth();
  const { resolved, setMode } = useTheme();
  const [userOpen, setUserOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const userRef = useOutside<HTMLDivElement>(() => setUserOpen(false));
  const avatar = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined;
  const userName = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || t("nav.account")) as string;
  
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    fetch("/api/admin/access").then((r) => r.json()).then((body) => setIsAdmin(body.admin === true)).catch(() => setIsAdmin(false));
  }, [user?.id]);

  useEffect(() => {
    const handleGlobalKbd = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setKbdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKbd);
    return () => window.removeEventListener("keydown", handleGlobalKbd);
  }, []);

  const items: CtxItem[] = [
    ...projects.map((p) => ({ label: p.name, icon: p.id === projectId ? Check : FolderOpen, onClick: () => onSwitch(p.id) })),
    { sep: true, label: "" },
    { label: t("project.new"), icon: Plus, onClick: onNew },
    { label: t("project.rename"), icon: Pencil, onClick: onRename },
    { label: t("project.delete"), icon: Trash2, danger: true, onClick: onDelete },
  ];

  return (
    <div className="topbar2">
      <KeyboardShortcutsModal open={kbdOpen} onClose={() => setKbdOpen(false)} />
      <div className="tb-group tb-primary-slot" aria-label={`${t("nav.project")} · ${t("nav.account")}`}>
        {authOn && user && <div className={`tb-account-wrap${userOpen ? " is-open" : ""}`} ref={userRef}>
          <button className="tb-account" type="button" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen} aria-haspopup="menu" data-tip={`${t("account.profilePrivacy")} · ${t("nav.account")}`}>
            {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <UserRound size={16} />}
            <span>{userName.split(" ")[0]}</span><ChevronDown size={13} />
          </button>
          {userOpen && <div className="tb-account-menu" role="menu">
            <div className="tb-account-meta"><strong>{userName}</strong><span>{user.email}</span></div>
            <Link href="/account" role="menuitem"><CreditCard size={15} />{t("nav.account")}</Link>
            <Link href="/settings" role="menuitem"><Settings size={15} />{t("nav.settings")}</Link>
            {isAdmin && <Link href="/admin" role="menuitem"><ShieldCheck size={15} />{t("nav.admin")}</Link>}
            <button role="menuitem" onClick={async () => { await signOut(); window.location.href = "/welcome"; }}><LogOut size={15} />{t("nav.signOut")}</button>
          </div>}
        </div>}
        {authOn && !user && <Link href="/login" className="iconbtn tb-login" data-tip={t("nav.signIn")} aria-label={t("nav.signIn")}><LogIn size={16} strokeWidth={1.75} /></Link>}
        <button className="tb-project" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom + 4 }); }}>
          <FolderOpen size={15} strokeWidth={1.75} />
          <span className="pname">{projectName || t("nav.project")}</span>
          <ChevronDown size={15} strokeWidth={1.75} />
        </button>
        <span className={`tb-save ${saving ? "saving" : ""}`}><span className="dot" />{saving ? t("status.saving") : t("status.saved")}</span>
      </div>

      <div className="tb-spacer" />

      <div className="tb-group tb-action-slot">
        <Link href="/dashboard" className="tb-logo" title={`Hypescript — ${t("nav.dashboard")}`} aria-label="Hypescript">
          <BrandLogo variant="icon" size="sm" decorative priority />
        </Link>
        {canvas && onChangeCanvas && (
          <AspectRatioPicker currentCanvas={canvas} onChangeCanvas={onChangeCanvas} />
        )}
        <IconButton icon={Undo2} tip={`${t("editor.undo")} (Ctrl+Z)`} disabled={!canUndo} onClick={onUndo} />
        <IconButton icon={Redo2} tip={`${t("editor.redo")} (Ctrl+Shift+Z)`} disabled={!canRedo} onClick={onRedo} />
      </div>

      <div className="tb-group tb-utility-slot">
        <LanguageSwitcher compact />
        <IconButton icon={Command} tip={`${t("editor.shortcuts")} (Ctrl+K)`} onClick={() => setKbdOpen(true)} />
        <Link href="/dashboard" className="iconbtn" data-tip={t("nav.dashboard")} aria-label={t("nav.dashboard")}><LayoutGrid size={16} strokeWidth={1.75} /></Link>
        <IconButton icon={MessageCircle} tip={t("editor.openChat")} active={chatOpen && !focusMode} onClick={onToggleChat} />
        <button className={`tb-focus ${focusMode ? "on" : ""}`} onClick={onToggleFocusMode} data-tip={t("editor.chatMode")}>
          <MessagesSquare size={16} strokeWidth={1.75} />
          <span>{focusMode ? t("editor.backToEditor") : t("editor.chatMode")}</span>
        </button>
        <IconButton
          icon={resolved === "dark" ? Sun : Moon}
          tip={resolved === "dark" ? t("editor.light") : t("editor.dark")}
          onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
        />
        <Link href="/settings" className="iconbtn" data-tip={t("nav.settings")} aria-label={t("nav.settings")}><Settings size={16} strokeWidth={1.75} /></Link>
        <button className="btn primary tall" onClick={onExport} disabled={!canExport} data-tip={t("editor.export")}>
          {rendering ? <Loader2 size={16} strokeWidth={2} className="spin" /> : <Download size={16} strokeWidth={2} />}
          {rendering ? `${t("editor.rendering")} ${Math.max(0, Math.min(100, Math.round(renderProgress * 100)))}%` : t("editor.export")}
        </button>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </div>
  );
}
