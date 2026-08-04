"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, subscribeToasts, ToastItem } from "@/lib/ui/toast";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  if (!items.length) return null;
  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={`toast toast-${t.kind}`} role="status">
            <Icon size={18} strokeWidth={2} className="toast-icon" />
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.detail && <div className="toast-detail">{t.detail}</div>}
            </div>
            <button type="button" className="toast-close" aria-label="סגור" onClick={() => dismissToast(t.id)}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
