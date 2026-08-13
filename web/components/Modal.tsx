"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { X } from "@/components/icons";

export function Dialog({
  open, title, children, onClose, footer, danger,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  danger?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // focus first input or panel
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("input,textarea,button.btn.primary,button.btn.danger");
      el?.focus();
    }, 0);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        className={`dlg-panel ${danger ? "danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dlg-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dlg-x" aria-label="סגור" onClick={onClose}><X size={16} /></button>
        </div>
        {children && <div className="dlg-body">{children}</div>}
        {footer && <div className="dlg-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Modal with a text field — replaces window.prompt */
export function NameDialog({
  open, title, label = "שם", initial = "", confirmLabel = "שמור",
  onSubmit, onClose,
}: {
  open: boolean;
  title: string;
  label?: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => { if (open) setValue(initial); }, [open, initial]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  };

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn secondary tall" onClick={onClose}>ביטול</button>
          <button type="button" className="btn primary tall" onClick={submit} disabled={!value.trim()}>{confirmLabel}</button>
        </>
      }
    >
      <label className="dlg-field">
        <span>{label}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          placeholder={label}
          autoComplete="off"
        />
      </label>
    </Dialog>
  );
}

/** Modal confirm — replaces window.confirm */
export function ConfirmDialog({
  open, title, message, confirmLabel = "אישור", danger,
  onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      danger={danger}
      footer={
        <>
          <button type="button" className="btn secondary tall" onClick={onClose}>ביטול</button>
          <button
            type="button"
            className={`btn tall ${danger ? "danger" : "primary"}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="dlg-msg">{message}</p>
    </Dialog>
  );
}
