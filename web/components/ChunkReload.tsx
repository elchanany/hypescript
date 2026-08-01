"use client";

// כשמתפרסת גרסה חדשה בזמן שהדף פתוח, טעינת chunk ישן נכשלת ("Loading chunk N
// failed" / ChunkLoadError). כאן מזהים זאת וטוענים מחדש פעם אחת (עם שמירה מפני
// לולאת-רענון), כדי שהמשתמש יקבל את הגרסה העדכנית במקום שגיאה.

import { useEffect } from "react";

const isChunkError = (m?: string | null) =>
  !!m && /Loading chunk\s+[\w-]+\s+failed|ChunkLoadError|Loading CSS chunk|error loading dynamically imported module/i.test(m);

export default function ChunkReload() {
  useEffect(() => {
    const reloadOnce = () => {
      if (sessionStorage.getItem("hs_chunk_reloaded")) return;
      sessionStorage.setItem("hs_chunk_reloaded", "1");
      location.reload();
    };
    const onErr = (e: ErrorEvent) => { if (isChunkError(e?.message) || isChunkError((e?.error as any)?.message)) reloadOnce(); };
    const onRej = (e: PromiseRejectionEvent) => { const m = (e?.reason as any)?.message || String(e?.reason ?? ""); if (isChunkError(m)) reloadOnce(); };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    const t = setTimeout(() => sessionStorage.removeItem("hs_chunk_reloaded"), 10000);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); clearTimeout(t); };
  }, []);
  return null;
}
