"use client";

// מקור אמת מרכזי לעריכה: מחזיק clips ו-subs + מערכת Undo/Redo.
// כל שינוי דרך setClips/setSubs/setProject נרשם ל-History. reset (טעינת פרויקט)
// אינו נרשם. משתמש ב-refs כדי למנוע snapshots מיושנים (stale closures).

import { useCallback, useRef, useState } from "react";
import { Clip } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { createHistory } from "@/lib/editor/history";

export interface EditorSnapshot { clips: Clip[] | null; subs: Sub[] | null; }
type Updater<T> = T | ((prev: T) => T);

export function useEditor() {
  const [clips, setClipsRaw] = useState<Clip[] | null>(null);
  const [subs, setSubsRaw] = useState<Sub[] | null>(null);
  const clipsRef = useRef(clips); clipsRef.current = clips;
  const subsRef = useRef(subs); subsRef.current = subs;
  const hist = useRef(createHistory<EditorSnapshot>());
  const [, force] = useState(0);
  const touch = useCallback(() => force((v) => v + 1), []);

  const apply = (s: EditorSnapshot) => { setClipsRaw(s.clips); setSubsRaw(s.subs); };
  const now = (): EditorSnapshot => ({ clips: clipsRef.current, subs: subsRef.current });

  const commit = useCallback((next: EditorSnapshot) => {
    hist.current.push(now());
    apply(next);
    touch();
  }, [touch]);

  const setClips = useCallback((u: Updater<Clip[] | null>) => {
    const next = typeof u === "function" ? (u as any)(clipsRef.current) : u;
    commit({ clips: next, subs: subsRef.current });
  }, [commit]);

  const setSubs = useCallback((u: Updater<Sub[] | null>) => {
    const next = typeof u === "function" ? (u as any)(subsRef.current) : u;
    commit({ clips: clipsRef.current, subs: next });
  }, [commit]);

  // עדכון clips+subs יחד ב-commit אחד (למשל שינויים של הסוכן).
  const setProject = useCallback((c: Clip[] | null, s: Sub[] | null) => {
    commit({ clips: c, subs: s });
  }, [commit]);

  // טעינת פרויקט/איפוס — לא נכנס להיסטוריה.
  const reset = useCallback((s: EditorSnapshot) => {
    hist.current.reset();
    apply(s);
    touch();
  }, [touch]);

  const undo = useCallback(() => {
    const prev = hist.current.undo(now());
    if (prev) { apply(prev); touch(); }
  }, [touch]);

  const redo = useCallback(() => {
    const next = hist.current.redo(now());
    if (next) { apply(next); touch(); }
  }, [touch]);

  return {
    clips, subs,
    setClips, setSubs, setProject, reset, undo, redo,
    canUndo: hist.current.canUndo(),
    canRedo: hist.current.canRedo(),
  };
}
