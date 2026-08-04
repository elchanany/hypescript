// Lightweight toast bus — no extra deps. ToastHost subscribes and renders.

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  ms?: number;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snap = items.slice();
  listeners.forEach((l) => l(snap));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items.slice());
  return () => { listeners.delete(listener); };
}

export function dismissToast(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function pushToast(kind: ToastKind, title: string, detail?: string, ms = 3800) {
  const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  items = [...items, { id, kind, title, detail, ms }].slice(-5);
  emit();
  if (ms > 0) {
    globalThis.setTimeout(() => dismissToast(id), ms);
  }
  return id;
}

export const toast = {
  success: (title: string, detail?: string) => pushToast("success", title, detail),
  error: (title: string, detail?: string) => pushToast("error", title, detail, 5200),
  info: (title: string, detail?: string) => pushToast("info", title, detail),
};
