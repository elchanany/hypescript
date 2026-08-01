// מודל EDL — רשימת קליפים מסודרת (לא "קטעים לשמירה" ממוינים).
// כל קליפ מצביע על טווח במקור; הסדר ברשימה הוא הסדר בסרטון הסופי.
// כך אפשר לסדר-מחדש, לחזור על קטע, לפצל ולטרים — בדיוק כמו CapCut.

export interface Clip {
  id: string;
  start: number; // in-point במקור (שניות)
  end: number; // out-point במקור (שניות)
}

export function uid(): string {
  return "c" + Math.random().toString(36).slice(2, 9);
}

export const clipDur = (c: Clip): number => Math.max(0, c.end - c.start);
export const totalDur = (clips: Clip[]): number => clips.reduce((s, c) => s + clipDur(c), 0);

// מיקום ההתחלה של קליפ i על ציר-הזמן הסופי (assembled).
export function assembledStart(clips: Clip[], i: number): number {
  let s = 0;
  for (let k = 0; k < i && k < clips.length; k++) s += clipDur(clips[k]);
  return s;
}

// זמן-סופי -> (אינדקס קליפ, זמן במקור).
export function assembledToSource(clips: Clip[], at: number): { index: number; source: number } {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const d = clipDur(clips[i]);
    if (at <= acc + d) return { index: i, source: clips[i].start + (at - acc) };
    acc += d;
  }
  const last = clips.length - 1;
  return last >= 0 ? { index: last, source: clips[last].end } : { index: -1, source: 0 };
}

export function sourceToAssembled(clips: Clip[], index: number, source: number): number {
  return assembledStart(clips, index) + (source - clips[index].start);
}

// --- פעולות (טהורות; מחזירות מערך חדש) ---
export function removeClip(clips: Clip[], id: string): Clip[] {
  return clips.filter((c) => c.id !== id);
}

export function moveClip(clips: Clip[], id: string, toIndex: number): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const arr = [...clips];
  const [c] = arr.splice(i, 1);
  arr.splice(Math.max(0, Math.min(arr.length, toIndex)), 0, c);
  return arr;
}

export function trimClip(clips: Clip[], id: string, start: number, end: number, maxDuration: number): Clip[] {
  return clips.map((c) => {
    if (c.id !== id) return c;
    const s = Math.max(0, Math.min(start, end - 0.05));
    const e = Math.min(maxDuration, Math.max(end, s + 0.05));
    return { ...c, start: s, end: e };
  });
}

export function splitClip(clips: Clip[], id: string, atSource: number): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const c = clips[i];
  if (atSource <= c.start + 0.05 || atSource >= c.end - 0.05) return clips;
  const arr = [...clips];
  arr.splice(i, 1, { ...c, end: atSource }, { id: uid(), start: atSource, end: c.end });
  return arr;
}

export function addClip(clips: Clip[], clip: Clip, atIndex?: number): Clip[] {
  const arr = [...clips];
  arr.splice(atIndex ?? arr.length, 0, clip);
  return arr;
}
