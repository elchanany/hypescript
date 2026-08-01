// מנגנון History גנרי (snapshot-based) ל-Undo/Redo אמיתי.
// כל פעולה משמעותית דוחפת snapshot של המצב לפני השינוי; undo/redo מחליפים ביניהם.

export interface History<T> {
  push(state: T): void; // רשום את המצב הנוכחי לפני מוטציה
  undo(current: T): T | null; // מחזיר מצב קודם (או null), ודוחף את current ל-redo
  redo(current: T): T | null; // מחזיר מצב הבא (או null)
  canUndo(): boolean;
  canRedo(): boolean;
  reset(): void;
  depth(): { past: number; future: number };
}

export function createHistory<T>(limit = 100): History<T> {
  const past: T[] = [];
  const future: T[] = [];
  return {
    push(state) {
      past.push(state);
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(current) {
      if (past.length === 0) return null;
      const prev = past.pop() as T;
      future.push(current);
      return prev;
    },
    redo(current) {
      if (future.length === 0) return null;
      const next = future.pop() as T;
      past.push(current);
      return next;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    reset: () => { past.length = 0; future.length = 0; },
    depth: () => ({ past: past.length, future: future.length }),
  };
}
