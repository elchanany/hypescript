"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen, Plus, LogIn, LogOut, Settings, Film,
  Pencil, Trash2, MoreHorizontal, UserRound,
} from "lucide-react";
import {
  createProject, deleteProject, listProjects, ProjectMeta,
  renameProject, setCurrentProject,
} from "@/lib/storage";
import { useAuth } from "@/lib/auth/useAuth";
import { ConfirmDialog, NameDialog } from "@/components/Modal";
import BrandLogo from "@/components/BrandLogo";
import { toast } from "@/lib/ui/toast";
import { getProjectCoverUrl } from "@/lib/projects/preview";
import { useOutside } from "@/components/ui";

function fmtDate(ms: number) {
  try {
    return new Date(ms).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
  } catch { return ""; }
}

function userLabel(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return "";
  const meta = user.user_metadata || {};
  const name = (meta.full_name || meta.name || meta.preferred_username) as string | undefined;
  return name || user.email || "משתמש";
}

function userAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  const meta = user?.user_metadata || {};
  const url = (meta.avatar_url || meta.picture) as string | undefined;
  return url || null;
}

function ProjectCard({
  project, onOpen, onRename, onDelete,
}: {
  project: ProjectMeta;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [cover, setCover] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useOutside<HTMLDivElement>(() => setMenu(false));

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    (async () => {
      const url = await getProjectCoverUrl(project.id);
      if (!alive) {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      if (url?.startsWith("blob:")) objectUrl = url;
      setCover(url);
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [project.id, project.updatedAt]);

  return (
    <article className="dash-card">
      <button type="button" className="dash-card-cover" onClick={onOpen} aria-label={`פתח ${project.name}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" />
        ) : (
          <span className="dash-card-ph"><FolderOpen size={28} strokeWidth={1.4} /></span>
        )}
      </button>
      <div className="dash-card-body">
        <button type="button" className="dash-card-title" onClick={onOpen}>{project.name}</button>
        <div className="dash-card-row">
          <span className="dash-card-meta">{fmtDate(project.updatedAt)}</span>
          <div className="dash-card-actions" ref={menuRef}>
            <button
              type="button"
              className="dash-icon-btn"
              aria-label="פעולות"
              aria-expanded={menu}
              onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
            >
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <div className="dash-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenu(false); onOpen(); }}>
                  <Film size={14} />פתח בעורך
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); onRename(); }}>
                  <Pencil size={14} />שנה שם
                </button>
                <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); onDelete(); }}>
                  <Trash2 size={14} />מחק
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "rename"; id: string; name: string }
  | { kind: "delete"; id: string; name: string };

export default function DashboardPage() {
  const { configured, loading, user, signOut, signInWithGoogle, error: authError } = useAuth();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<DialogState>({ kind: "none" });
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useOutside<HTMLDivElement>(() => setUserOpen(false));
  const welcomed = useRef(false);

  const refresh = async () => setProjects(await listProjects());

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (authError) toast.error("שגיאת התחברות", authError);
  }, [authError]);

  useEffect(() => {
    if (loading || !user || welcomed.current) return;
    const flag = sessionStorage.getItem("hs_just_logged_in");
    if (flag) {
      sessionStorage.removeItem("hs_just_logged_in");
      toast.success("התחברת בהצלחה", userLabel(user));
      welcomed.current = true;
    }
  }, [loading, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "1") {
      toast.error("ההתחברות נכשלה", "נסה שוב או בדוק את הגדרות Google ב-Supabase.");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const openProject = async (id: string) => {
    await setCurrentProject(id);
    window.location.href = "/";
  };

  const onCreate = async (name: string) => {
    setDlg({ kind: "none" });
    setBusy(true);
    try {
      const id = await createProject(name || "פרויקט");
      toast.success("הפרויקט נוצר", name);
      await openProject(id);
    } catch (e) {
      toast.error("יצירת הפרויקט נכשלה", e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };

  const onRename = async (name: string) => {
    if (dlg.kind !== "rename") return;
    const id = dlg.id;
    setDlg({ kind: "none" });
    try {
      await renameProject(id, name);
      await refresh();
      toast.success("השם עודכן", name);
    } catch (e) {
      toast.error("שינוי השם נכשל", e instanceof Error ? e.message : undefined);
    }
  };

  const onDelete = async () => {
    if (dlg.kind !== "delete") return;
    const { id, name } = dlg;
    setDlg({ kind: "none" });
    try {
      await deleteProject(id);
      await refresh();
      toast.success("הפרויקט נמחק", name);
    } catch (e) {
      toast.error("המחיקה נכשלה", e instanceof Error ? e.message : undefined);
    }
  };

  const avatar = userAvatarUrl(user);
  const label = userLabel(user);

  return (
    <div className="dash-root">
      <header className="dash-top">
        <Link href="/dashboard" className="dash-brand dash-brand-link" aria-label="Hypescript">
          <BrandLogo variant="horizontal" size="sm" theme="auto" priority decorative />
        </Link>
        <nav className="dash-nav">
          <Link href="/" className="dash-link"><Film size={16} />עורך</Link>
          <Link href="/settings" className="dash-link"><Settings size={16} />הגדרות</Link>
          {configured && !loading && (
            user ? (
              <div className="dash-user-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className="dash-user"
                  aria-expanded={userOpen}
                  onClick={() => setUserOpen((v) => !v)}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="dash-avatar-img" src={avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="dash-avatar">{label[0]?.toUpperCase() || "?"}</span>
                  )}
                  <span className="dash-email">{label}</span>
                </button>
                {userOpen && (
                  <div className="dash-menu dash-user-menu" role="menu">
                    <div className="dash-user-meta">
                      <UserRound size={14} />
                      <div>
                        <div className="dash-user-name">{label}</div>
                        {user.email && <div className="dash-user-mail">{user.email}</div>}
                      </div>
                    </div>
                    <Link href="/settings" role="menuitem" onClick={() => setUserOpen(false)}>
                      <Settings size={14} />הגדרות
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setUserOpen(false);
                        await signOut();
                        toast.info("התנתקת");
                      }}
                    >
                      <LogOut size={14} />התנתק
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className="btn secondary tall" onClick={() => signInWithGoogle()}>
                <LogIn size={15} />התחבר
              </button>
            )
          )}
        </nav>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>הפרויקטים שלי</h1>
            <p>
              {user
                ? `שלום ${label.split(" ")[0]} — הפרויקטים נשמרים מקומית במחשב שלך. הווידאו לא עולה לענן.`
                : "נשמרים מקומית במחשב שלך (IndexedDB). הווידאו לא עולה לענן."}
            </p>
          </div>
          <button
            type="button"
            className="btn primary tall"
            onClick={() => setDlg({ kind: "create" })}
            disabled={busy}
          >
            <Plus size={16} />פרויקט חדש
          </button>
        </div>

        {configured && !loading && !user && (
          <div className="dash-banner">
            אפשר לעבוד בלי התחברות. להתחברות עם Google (סנכרון זהות בלבד) —{" "}
            <button type="button" className="linkish" onClick={() => signInWithGoogle()}>לחץ כאן</button>.
          </div>
        )}

        {projects.length === 0 ? (
          <div className="dash-empty">
            <FolderOpen size={40} strokeWidth={1.25} />
            <p>אין פרויקטים עדיין.</p>
            <button type="button" className="btn primary tall" onClick={() => setDlg({ kind: "create" })}>
              צור את הראשון
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => openProject(p.id)}
                onRename={() => setDlg({ kind: "rename", id: p.id, name: p.name })}
                onDelete={() => setDlg({ kind: "delete", id: p.id, name: p.name })}
              />
            ))}
          </div>
        )}
      </main>

      <NameDialog
        open={dlg.kind === "create"}
        title="פרויקט חדש"
        label="שם הפרויקט"
        initial={`פרויקט ${projects.length + 1}`}
        confirmLabel="צור ופתח"
        onClose={() => setDlg({ kind: "none" })}
        onSubmit={onCreate}
      />
      <NameDialog
        open={dlg.kind === "rename"}
        title="שינוי שם"
        label="שם הפרויקט"
        initial={dlg.kind === "rename" ? dlg.name : ""}
        confirmLabel="שמור"
        onClose={() => setDlg({ kind: "none" })}
        onSubmit={onRename}
      />
      <ConfirmDialog
        open={dlg.kind === "delete"}
        title="מחיקת פרויקט"
        message={dlg.kind === "delete"
          ? `למחוק את «${dlg.name}»? כל המדיה, העריכה והשיחה יימחקו מהמחשב הזה.`
          : ""}
        confirmLabel="מחק"
        danger
        onClose={() => setDlg({ kind: "none" })}
        onConfirm={onDelete}
      />
    </div>
  );
}
