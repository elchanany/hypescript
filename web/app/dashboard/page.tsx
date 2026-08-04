"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, LogIn, LogOut, Settings, Film } from "lucide-react";
import { createProject, listProjects, ProjectMeta, setCurrentProject } from "@/lib/storage";
import { useAuth } from "@/lib/auth/useAuth";

function fmtDate(ms: number) {
  try {
    return new Date(ms).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
  } catch { return ""; }
}

export default function DashboardPage() {
  const { configured, loading, user, signOut, signInWithGoogle } = useAuth();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => setProjects(await listProjects());

  useEffect(() => { refresh(); }, []);

  const openProject = async (id: string) => {
    await setCurrentProject(id);
    window.location.href = "/";
  };

  const newProject = async () => {
    const name = prompt("שם הפרויקט החדש:", `פרויקט ${projects.length + 1}`);
    if (name === null) return;
    setBusy(true);
    try {
      const id = await createProject(name || "פרויקט");
      await openProject(id);
    } finally { setBusy(false); }
  };

  return (
    <div className="dash-root">
      <header className="dash-top">
        <Link href="/dashboard" className="dash-brand"><span className="tb-logo">hs</span> hypescript</Link>
        <nav className="dash-nav">
          <Link href="/" className="dash-link"><Film size={16} />עורך</Link>
          <Link href="/settings" className="dash-link"><Settings size={16} />הגדרות</Link>
          {configured && !loading && (
            user ? (
              <button className="dash-user" onClick={() => signOut()} title="התנתק">
                <span className="dash-avatar">{(user.email || "?")[0]?.toUpperCase()}</span>
                <span className="dash-email">{user.email}</span>
                <LogOut size={15} />
              </button>
            ) : (
              <button className="btn secondary tall" onClick={() => signInWithGoogle()}><LogIn size={15} />התחבר</button>
            )
          )}
        </nav>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>הפרויקטים שלי</h1>
            <p>נשמרים מקומית במחשב שלך (IndexedDB). הווידאו לא עולה לענן.</p>
          </div>
          <button className="btn primary tall" onClick={newProject} disabled={busy}>
            <Plus size={16} />פרויקט חדש
          </button>
        </div>

        {configured && !loading && !user && (
          <div className="dash-banner">
            אפשר לעבוד בלי התחברות. להתחברות עם Google (סנכרון זהות בלבד) —{" "}
            <button className="linkish" onClick={() => signInWithGoogle()}>לחץ כאן</button>.
          </div>
        )}

        {projects.length === 0 ? (
          <div className="dash-empty">
            <FolderOpen size={40} strokeWidth={1.25} />
            <p>אין פרויקטים עדיין.</p>
            <button className="btn primary tall" onClick={newProject}>צור את הראשון</button>
          </div>
        ) : (
          <div className="dash-grid">
            {projects.map((p) => (
              <button key={p.id} className="dash-card" onClick={() => openProject(p.id)}>
                <span className="dash-card-icon"><FolderOpen size={22} /></span>
                <span className="dash-card-name">{p.name}</span>
                <span className="dash-card-meta">{fmtDate(p.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
