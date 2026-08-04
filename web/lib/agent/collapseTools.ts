// קיבוץ כרטיסי-כלי זהים רצופים בצ'אט הסוכן — כדי שלא יוצגו עשרות
// "מחיקת קליפ" זהות אחת אחרי השנייה, אלא כרטיס אחד עם מונה.

export type CollapsibleTool = {
  kind: "tool";
  id: string;
  name: string;
  label: string;
  color: string;
  status: string;
  state: "running" | "ok" | "error";
  summary: string;
  time: string;
};

export type CollapsedToolView = CollapsibleTool & { count: number };

function mergeToolState(
  a: CollapsibleTool["state"],
  b: CollapsibleTool["state"],
): CollapsibleTool["state"] {
  if (a === "running" || b === "running") return "running";
  if (a === "error" || b === "error") return "error";
  return "ok";
}

/** מקבץ קריאות-כלי זהות רצופות (אותו `name`) לכרטיס תצוגה אחד. */
export function collapseConsecutiveTools<T extends { kind: string }>(
  items: T[],
): Array<Exclude<T, CollapsibleTool> | CollapsedToolView> {
  const out: Array<Exclude<T, CollapsibleTool> | CollapsedToolView> = [];
  for (const it of items) {
    if (it.kind !== "tool") {
      out.push(it as Exclude<T, CollapsibleTool>);
      continue;
    }
    const tool = it as unknown as CollapsibleTool;
    const prev = out[out.length - 1] as CollapsedToolView | undefined;
    if (prev && prev.kind === "tool" && prev.name === tool.name) {
      prev.count += 1;
      prev.state = mergeToolState(prev.state, tool.state);
      prev.status = tool.status;
      if (tool.summary) prev.summary = tool.summary;
      prev.time = tool.time;
      continue;
    }
    out.push({ ...tool, count: 1 });
  }
  return out;
}

/** כותרת: "מחיקת קליפ ×55" כשיש חזרות. */
export function toolGroupTitle(label: string, count: number): string {
  return count > 1 ? `${label} ×${count}` : label;
}

/** סיכום קצר לפי סוג הפקודה כשיש חזרות; אחרת הסיכום האחרון. */
export function toolGroupSummary(
  name: string,
  count: number,
  lastSummary: string,
  status: string,
  state: CollapsibleTool["state"],
): string {
  if (state === "running") {
    return count > 1 ? `${status} (×${count})` : status;
  }
  if (count <= 1) return lastSummary || status;

  const heads: Record<string, string> = {
    delete_clip: `נמחקו ${count} קליפים`,
    delete_subtitle: `נמחקו ${count} כתוביות`,
    clear_subtitles: `נוקו הכתוביות (${count} פעמים)`,
    remove_segments: `הוסרו מקטעים (${count} פעמים)`,
    add_clip: `נוספו ${count} קליפים`,
    split_clip: `פוצלו ${count} קליפים`,
    trim_clip: `קוצצו ${count} קליפים`,
    move_clip: `הוזזו ${count} קליפים`,
    edit_subtitle: `נערכו ${count} כתוביות`,
    retime_subtitles: `תוזמנו כתוביות (${count} פעמים)`,
    find_in_transcript: `${count} חיפושים`,
    capture_frame: `צולמו ${count} פריימים`,
    keep_by_script: `חיתוך לפי סקריפט (×${count})`,
  };
  // כשיש ניסוח ייעודי לפקודה — הוא מספיק (הכותרת כבר מציגה ×N).
  // אחרת: הסיכום האחרון (מצב סופי) או נפילה כללית.
  return heads[name] || lastSummary || `בוצע ${count} פעמים`;
}
