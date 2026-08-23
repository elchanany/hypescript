// A/V link groups (B-10).
//
// קישור אינו בחירה. קליפ וידאו שהאודיו שלו הופרד נשאר קליפ אחד נבחר —
// הקליפ המקושר מסומן ויזואלית, אך אינו נכנס ל-selectedIds ואינו הופך את
// הבחירה לבחירה-מרובה. פעולות עריכה (פיצול/טרים/הזזה/מחיקה) מתפשטות לשותפים
// שבקבוצה **רק** כאשר "בחירה מקושרת" (avLinked) דלוקה.
//
// כל הפונקציות כאן טהורות ומחזירות מערך חדש; המצב עצמו נשמר ב-Clip.linkId.

import { splitClip, trimClip, uid, type Clip } from "./model";

/** מרווח מינימלי שבו splitClip מסרב לפצל — חייב להתאים לו כדי לא לפצל שותף לריק. */
const EDGE_EPS = 0.05;

function withoutLink(c: Clip): Clip {
  if (c.linkId == null) return c;
  const { linkId: _drop, ...rest } = c;
  return rest;
}

/** מזהי הקליפים שבאותה קבוצת קישור כמו `id`, בלי `id` עצמו. */
export function linkedPartnerIds(clips: Clip[], id: string): string[] {
  const self = clips.find((c) => c.id === id);
  if (!self?.linkId) return [];
  return clips.filter((c) => c.id !== id && c.linkId === self.linkId).map((c) => c.id);
}

/** האם לקליפ יש בן-זוג מקושר בפועל (קבוצה בת שניים ומעלה). */
export const isLinkedClip = (clips: Clip[], id: string): boolean => linkedPartnerIds(clips, id).length > 0;

/**
 * מזהי הקליפים שפעולה על `id` תשפיע עליהם: תמיד `id`, ובנוסף השותפים
 * המקושרים כאשר `linkedSelection` דלוק. זהו הגורם היחיד שקובע התפשטות.
 */
export function affectedIds(clips: Clip[], id: string, linkedSelection: boolean): string[] {
  return linkedSelection ? [id, ...linkedPartnerIds(clips, id)] : [id];
}

/** מסמן קבוצת קישור חדשה על הקליפים הנתונים (דרושים לפחות שניים). */
export function linkClips(clips: Clip[], ids: string[]): Clip[] {
  const set = new Set(ids.filter(Boolean));
  if (set.size < 2) return clips;
  const linkId = uid("lnk");
  return clips.map((c) => (set.has(c.id) ? { ...c, linkId } : c));
}

/**
 * מנתק את `id` מקבוצתו. אם נשאר בקבוצה חבר בודד — הקבוצה מתפרקת לגמרי,
 * כדי שלא יישאר linkId "יתום" שאינו מקשר לכלום.
 */
export function unlinkClip(clips: Clip[], id: string): Clip[] {
  const self = clips.find((c) => c.id === id);
  if (!self?.linkId) return clips;
  const group = self.linkId;
  const stripped = clips.map((c) => (c.id === id ? withoutLink(c) : c));
  const remaining = stripped.filter((c) => c.linkId === group);
  return remaining.length >= 2 ? stripped : stripped.map((c) => (c.linkId === group ? withoutLink(c) : c));
}

/**
 * פיצול מודע-קישור. החצי השמאלי שומר על מזהה הקבוצה הקיים; החצאים הימניים
 * מקבלים קבוצה חדשה — אחרת פיצול היה מדביק את כל החתיכות לקבוצה אחת ענקית.
 * שותף שנקודת הפיצול נופלת מחוץ לתחומו (למשל אחרי טרים עצמאי) פשוט מדולג.
 */
export function splitLinkedClips(clips: Clip[], id: string, atSource: number, linkedSelection: boolean): Clip[] {
  const self = clips.find((c) => c.id === id);
  if (!self) return clips;
  let next = splitClip(clips, id, atSource);
  if (next === clips) return clips; // splitClip סירב (קרוב מדי לקצה)
  if (linkedSelection) {
    for (const pid of linkedPartnerIds(clips, id)) {
      const p = next.find((c) => c.id === pid);
      if (!p || atSource <= p.start + EDGE_EPS || atSource >= p.end - EDGE_EPS) continue;
      next = splitClip(next, pid, atSource);
    }
  }
  if (!self.linkId) return next;
  const before = new Set(clips.map((c) => c.id));
  const rightIds = next.filter((c) => !before.has(c.id) && c.start === atSource).map((c) => c.id);
  return linkClips(next, rightIds);
}

/**
 * טרים מודע-קישור. השותפים מקבלים בדיוק את גבולות המקור שהתקבלו בפועל אחרי
 * ההצמדה של trimClip — לא את הבקשה הגולמית — כדי שהקבוצה לא תתפצל לגבולות שונים.
 */
export function trimLinkedClips(
  clips: Clip[],
  id: string,
  start: number,
  end: number,
  maxDuration: number,
  linkedSelection: boolean,
  maxFor?: (sourceId: string) => number,
): Clip[] {
  let next = trimClip(clips, id, start, end, maxDuration);
  if (!linkedSelection) return next;
  const self = next.find((c) => c.id === id);
  if (!self) return next;
  for (const pid of linkedPartnerIds(clips, id)) {
    const p = next.find((c) => c.id === pid);
    if (!p) continue;
    const max = maxFor?.(p.sourceId);
    next = trimClip(next, pid, self.start, self.end, Number.isFinite(max) && (max as number) > 0 ? (max as number) : maxDuration);
  }
  return next;
}
