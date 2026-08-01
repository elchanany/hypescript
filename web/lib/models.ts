// מבני נתונים משותפים — מקבילים ל-models.py בגרסה המקומית.

export interface Word {
  text: string;
  start: number; // שניות, ציר הזמן המקורי
  end: number;
}

export interface KeepInterval {
  start: number;
  end: number;
}

export function intervalDuration(iv: KeepInterval): number {
  return Math.max(0, iv.end - iv.start);
}

export function keptDuration(keeps: KeepInterval[]): number {
  return keeps.reduce((s, iv) => s + intervalDuration(iv), 0);
}
