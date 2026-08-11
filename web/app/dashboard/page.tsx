"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen, Plus, LogIn, LogOut, Settings, Film,
  Pencil, Trash2, MoreHorizontal, Clapperboard, CreditCard,
  Clock3, ShieldCheck,
} from "lucide-react";
import {
  deleteProject, listProjects, ProjectMeta,
  renameProject, setCurrentProject,
} from "@/lib/storage";
import { useAuth } from "@/lib/auth/useAuth";
import { ConfirmDialog, NameDialog } from "@/components/Modal";
import BrandLogo from "@/components/BrandLogo";
import NewProjectWizard from "@/components/NewProjectWizard";
import { toast } from "@/lib/ui/toast";
import {
  formatDurationHe, getProjectCardInfo, type ProjectCardInfo,
} from "@/lib/projects/preview";
import { createProjectWithPolicy } from "@/lib/projects/create";
import { ensureCloudProjectMirror } from "@/lib/projects/create";
import { deleteCloudProject, listCloudProjects, renameCloudProject } from "@/lib/cloud/client";
import type { ProjectMetaV2 } from "@/lib/projects/types";
import { useOutside } from "@/components/ui";

function fmtDate(ms: number) {
  try {
    return new Date(ms).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
  } catch { return ""; }
}

function fmtRelativeHe(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return fmtDate(ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "עכשיו";
  if (min < 60) return `לפני ${min} דק׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שע׳`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return fmtDate(ms);
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
  project, ownerLabel, ownerAvatar, onOpen, onRename, onDelete,
}: {
  project: ProjectMeta;
  ownerLabel: string;
  ownerAvatar: string | null;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [info, setInfo] = useState<ProjectCardInfo | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useOutside<HTMLDivElement>(() => setMenu(false));
  const coverRef = useRef<string | null>(null);
  const meta = project as ProjectMetaV2;

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await getProjectCardInfo(project.id);
      if (!alive) {
        if (next.coverUrl?.startsWith("blob:")) URL.revokeObjectURL(next.coverUrl);
        return;
      }
      if (coverRef.current?.startsWith("blob:")) URL.revokeObjectURL(coverRef.current);
      coverRef.current = next.coverUrl;
      setInfo(next);
    })();
    return () => {
      alive = false;
      if (coverRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(coverRef.current);
        coverRef.current = null;
      }
    };
  }, [project.id, project.updatedAt]);

  const dur = info ? formatDurationHe(info.editedDurationSec) : "";
  const stats: string[] = [];
  if (info?.videoCount) stats.push(`${info.videoCount} וידאו`);
  else if (info?.mediaCount) stats.push(`${info.mediaCount} מדיה`);
  if (info?.clipCount) stats.push(`${info.clipCount} קליפים`);
  if (info?.subtitleCount) stats.push(`${info.subtitleCount} כתוביות`);
  if (dur) stats.push(dur);

  return (
    <article className={`dash-card ${menu ? "menu-open" : ""}`}>
      <div className="dash-card-cover-wrap">
        <button type="button" className="dash-card-cover" onClick={onOpen} aria-label={`פתח ${project.name}`}>
          {info?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.coverUrl} alt="" />
          ) : (
            <span className="dash-card-ph"><FolderOpen size={28} strokeWidth={1.4} /></span>
          )}
          <span className="dash-card-cover-shade" aria-hidden />
        </button>

        <div className="dash-card-cover-actions" ref={menuRef}>
          <button
            type="button"
            className="dash-icon-btn on-cover"
            aria-label="פעולות פרויקט"
            aria-expanded={menu}
            aria-haspopup="menu"
            onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
          >
            <MoreHorizontal size={16} />
          </button>
          {menu && (
            <div className="dash-menu dash-menu-up" role="menu">
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

      <div className="dash-card-body">
        <button type="button" className="dash-card-title" onClick={onOpen}>{project.name}</button>

        <div className="dash-card-badges">
          <span className={`dash-badge mode-${meta.dataMode || "local"}`}>
            {meta.dataMode === "cloud" ? "בענן" : meta.dataMode === "hybrid" ? "משולב" : "מקומי"}
          </span>
          {meta.aspectRatio && (
            <span className="dash-badge">{meta.aspectRatio}</span>
          )}
        </div>

        <div className="dash-card-meta-block">
          <span className="dash-card-meta" title={fmtDate(project.updatedAt)}>
            <Clock3 size={12} strokeWidth={2} />
            עודכן {fmtRelativeHe(project.updatedAt)}
          </span>
          {stats.length > 0 && (
            <span className="dash-card-stats" title={stats.join(" · ")}>
              {info?.clipCount ? <Clapperboard size={12} strokeWidth={2} /> : <Film size={12} strokeWidth={2} />}
              {stats.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>

        {ownerLabel ? (
          <div className="dash-card-owner" title={ownerLabel}>
            {ownerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerAvatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="dash-avatar sm">{ownerLabel[0]?.toUpperCase() || "?"}</span>
            )}
            <span className="dash-card-owner-txt">
              <span className="k">בעלים</span>
              <span className="v">{ownerLabel}</span>
            </span>
          </div>
        ) : (
          <div className="dash-card-owner local">
            <span className="dash-avatar sm">מ</span>
            <span className="dash-card-owner-txt">
              <span className="k">שמירה</span>
              <span className="v">מקומית במחשב זה</span>
            </span>
          </div>
        )}
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
  const [isAdmin, setIsAdmin] = useState(false);
  const userMenuRef = useOutside<HTMLDivElement>(() => setUserOpen(false));
  const welcomed = useRef(false);

  const refresh = async () => {
    if (user) {
      try {
        const cloud = await listCloudProjects();
        await Promise.all(cloud.filter((project) => project.state !== "deleting").map(ensureCloudProjectMirror));
      } catch { /* show local cache while offline */ }
    }
    setProjects(await listProjects());
  };

  useEffect(() => { if (!loading) refresh(); }, [loading, user?.id]);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    fetch("/api/admin/access").then((r) => r.json()).then((body) => setIsAdmin(body.admin === true)).catch(() => setIsAdmin(false));
  }, [user?.id]);

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
    if (sessionStorage.getItem("hs_after_login") === "create-project") {
      sessionStorage.removeItem("hs_after_login");
      setDlg({ kind: "create" });
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

  const onCreateWizard = async (result: { name: string; policy: import("@/lib/projects/types").ProjectExecutionPolicy }) => {
    setBusy(true);
    try {
      const id = await createProjectWithPolicy(result);
      setDlg({ kind: "none" });
      toast.success("הפרויקט נוצר", `${result.name} · ${result.policy.dataMode}`);
      await openProject(id);
    } catch (e) {
      toast.error("יצירת הפרויקט נכשלה", e instanceof Error ? e.message : undefined);
      setBusy(false);
      throw e;
    }
  };

  const onRename = async (name: string) => {
    if (dlg.kind !== "rename") return;
    const id = dlg.id;
    setDlg({ kind: "none" });
    try {
      const project = (await listProjects() as ProjectMetaV2[]).find((item) => item.id === id);
      if (project?.cloudProjectId) await renameCloudProject(project.cloudProjectId, name);
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
      const project = (await listProjects() as ProjectMetaV2[]).find((item) => item.id === id);
      if (project?.cloudProjectId) await deleteCloudProject(project.cloudProjectId);
      await deleteProject(id);
      await refresh();
      toast.success("הפרויקט נמחק", name);
    } catch (e) {
      toast.error("המחיקה נכשלה", e instanceof Error ? e.message : undefined);
    }
  };

  const avatar = userAvatarUrl(user);
  const label = userLabel(user);
  const startCreate = () => {
    if (configured && !user) {
      sessionStorage.setItem("hs_after_login", "create-project");
      signInWithGoogle();
      return;
    }
    setDlg({ kind: "create" });
  };

  return (
    <div className="dash-root">
      <header className="dash-top">
        <Link href="/dashboard" className="dash-brand dash-brand-link" aria-label="Hypescript">
          <BrandLogo variant="horizontal" size="sm" theme="auto" priority decorative />
        </Link>
        <nav className="dash-nav">
          <Link href="/" className="dash-link"><Film size={16} />עורך</Link>
          <Link href="/settings" className="dash-link"><Settings size={16} />הגדרות</Link>
          {isAdmin && <Link href="/admin" className="dash-link admin"><ShieldCheck size={16} />ניהול</Link>}
          {configured && !loading && (
            user ? (
              <div className="dash-user-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className="dash-user"
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
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
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="dash-avatar-img lg" src={avatar} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="dash-avatar lg">{label[0]?.toUpperCase() || "?"}</span>
                      )}
                      <div>
                        <div className="dash-user-name">{label}</div>
                        {user.email && <div className="dash-user-mail">{user.email}</div>}
                        <div className="dash-user-status">חשבון Hypescript</div>
                      </div>
                    </div>
                    <Link href="/settings" role="menuitem" onClick={() => setUserOpen(false)}>
                      <Settings size={14} />הגדרות
                    </Link>
                    <Link href="/account" role="menuitem" onClick={() => setUserOpen(false)}>
                      <CreditCard size={14} />חשבון ומנוי
                    </Link>
                    {isAdmin && <Link href="/admin" role="menuitem" onClick={() => setUserOpen(false)}><ShieldCheck size={14} />מרכז ניהול</Link>}
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
        {user && !loading && (
          <section className="dash-identity" aria-label="חשבון מחובר">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="dash-identity-av" src={avatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="dash-avatar xl">{label[0]?.toUpperCase() || "?"}</span>
            )}
            <div className="dash-identity-body">
              <div className="dash-identity-name">{label}</div>
              <div className="dash-identity-sub">
                {user.email && <span className="dash-identity-mail">{user.email}</span>}
                <Link className="dash-pill" href="/account">חשבון ומנוי</Link>
                <span className="dash-pill">{projects.length} פרויקטים בחשבון</span>
              </div>
            </div>
            <button
              type="button"
              className="btn ghost tall"
              onClick={async () => { await signOut(); toast.info("התנתקת"); }}
            >
              <LogOut size={15} />התנתק
            </button>
          </section>
        )}

        <div className="dash-head">
          <div>
            <h1>הפרויקטים שלי</h1>
            <p>
              {user
                ? `שלום ${label.split(" ")[0]} — הפרויקטים נשמרים ומסתנכרנים בענן כברירת מחדל.`
                : "התחבר כדי ליצור פרויקטים שמסתנכרנים אוטומטית בין המכשירים שלך."}
            </p>
          </div>
          <button
            type="button"
            className="btn primary tall"
            onClick={startCreate}
            disabled={busy}
          >
            <Plus size={16} />{configured && !user ? "התחבר והתחל" : "פרויקט חדש"}
          </button>
        </div>

        {configured && !loading && !user && (
          <div className="dash-banner">
            Hypescript הוא שירות ענן. התחבר עם Google כדי ליצור, לסנכרן ולרנדר פרויקטים —{" "}
            <button type="button" className="linkish" onClick={() => signInWithGoogle()}>לחץ כאן</button>.
          </div>
        )}

        {projects.length === 0 ? (
          <div className="dash-empty">
            <FolderOpen size={40} strokeWidth={1.25} />
            <p>אין פרויקטים עדיין.</p>
            <button type="button" className="btn primary tall" onClick={startCreate}>
              צור את הראשון
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                ownerLabel={user ? label : ""}
                ownerAvatar={user ? avatar : null}
                onOpen={() => openProject(p.id)}
                onRename={() => setDlg({ kind: "rename", id: p.id, name: p.name })}
                onDelete={() => setDlg({ kind: "delete", id: p.id, name: p.name })}
              />
            ))}
          </div>
        )}
      </main>

      <NewProjectWizard
        open={dlg.kind === "create"}
        initialName={`פרויקט ${projects.length + 1}`}
        onClose={() => setDlg({ kind: "none" })}
        onCreate={onCreateWizard}
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
