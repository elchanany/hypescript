"use client";

// Shared UI primitives for the editor. One consistent set — no per-component variants.
import { ChevronDown, type AppIcon } from "@/components/icons";
import { ReactNode, useEffect, useRef, useState } from "react";

export const ICON = 16;
export const STROKE = 1.75;

type TipPos = "up" | "down" | "right" | "left";

export function IconButton({
  icon: Icon, tip, tipPos = "down", active, danger, disabled, onClick, size = "sm", className = "",
}: {
  icon: AppIcon; tip?: string; tipPos?: TipPos; active?: boolean; danger?: boolean;
  disabled?: boolean; onClick?: (e: React.MouseEvent) => void; size?: "sm" | "lg"; className?: string;
}) {
  return (
    <button
      type="button"
      className={`iconbtn ${size === "lg" ? "lg" : ""} ${active ? "on" : ""} ${danger ? "danger" : ""} ${className}`}
      data-tip={tip} data-tippos={tipPos} disabled={disabled} onClick={onClick}
      aria-label={tip}
    >
      <Icon size={ICON} strokeWidth={STROKE} />
    </button>
  );
}

export function Button({
  children, icon: Icon, variant = "secondary", size, disabled, onClick, tip, className = "",
}: {
  children?: ReactNode; icon?: AppIcon; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "tall"; disabled?: boolean; onClick?: (e: React.MouseEvent) => void; tip?: string; className?: string;
}) {
  const autoTip = tip || (typeof children === "string" ? children : undefined);
  return (
    <button
      type="button"
      className={`btn ${variant} ${size || ""} ${className}`}
      disabled={disabled} onClick={onClick} data-tip={autoTip} aria-label={autoTip}
    >
      {Icon && <Icon size={ICON} strokeWidth={STROKE} />}
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, tip }: { checked: boolean; onChange: (v: boolean) => void; tip?: string }) {
  return (
    <label className="toggle" data-tip={tip}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="knob" />
    </label>
  );
}

export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`section ${open ? "" : "collapsed"}`}>
      <div className="sec-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronDown className="chev" size={13} strokeWidth={STROKE} />
          {title}
        </span>
        {right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
      </div>
      <div className="sec-body">{children}</div>
    </div>
  );
}

export interface CtxItem {
  label: string; icon?: AppIcon; onClick?: () => void; danger?: boolean; disabled?: boolean; kbd?: string; sep?: boolean;
}

// Lightweight context / dropdown menu anchored at a screen point.
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    let nx = x, ny = y;
    if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div ref={ref} className="ctx-menu" style={{ left: pos.x, top: pos.y }} onClick={(e) => e.stopPropagation()}>
        {items.map((it, i) =>
          it.sep ? (
            <div key={i} className="ctx-sep" />
          ) : (
            <button key={i} className={`ctx-item ${it.danger ? "danger" : ""}`} disabled={it.disabled}
              onClick={() => { it.onClick?.(); onClose(); }}>
              {it.icon && <it.icon size={15} strokeWidth={STROKE} />}
              <span>{it.label}</span>
              {it.kbd && <span className="kbd">{it.kbd}</span>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// Small hook: close a popover on outside click.
export function useOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}
