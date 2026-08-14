"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type TipPos = "up" | "down" | "left" | "right";

interface TooltipState {
  text: string;
  pos: TipPos;
  x: number;
  y: number;
  targetRect: DOMRect;
  visible: boolean;
}

export default function GlobalTooltip() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<TooltipState | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest<HTMLElement>("[data-tip], [data-tooltip]");
      if (!el || el === currentElRef.current) {
        if (!el && currentElRef.current) {
          clearTooltip();
        }
        return;
      }

      currentElRef.current = el;
      if (timerRef.current) window.clearTimeout(timerRef.current);

      const text = el.getAttribute("data-tip") || el.getAttribute("data-tooltip") || "";
      if (!text.trim()) {
        clearTooltip();
        return;
      }

      const prefPos = (el.getAttribute("data-tippos") as TipPos) || "down";

      timerRef.current = window.setTimeout(() => {
        if (!currentElRef.current || !document.contains(currentElRef.current)) return;
        const rect = currentElRef.current.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        setState({
          text,
          pos: prefPos,
          x: rect.left + rect.width / 2,
          y: prefPos === "up" ? rect.top : prefPos === "left" || prefPos === "right" ? rect.top + rect.height / 2 : rect.bottom,
          targetRect: rect,
          visible: true,
        });
      }, 140);
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && currentElRef.current && (target === currentElRef.current || !currentElRef.current.contains(e.relatedTarget as Node | null))) {
        clearTooltip();
      }
    };

    const handleScrollOrKey = () => {
      clearTooltip();
    };

    const clearTooltip = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      currentElRef.current = null;
      setState((prev) => (prev ? { ...prev, visible: false } : null));
    };

    window.addEventListener("pointerover", handlePointerOver, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("scroll", handleScrollOrKey, { passive: true, capture: true });
    window.addEventListener("keydown", handleScrollOrKey, { passive: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("scroll", handleScrollOrKey, { capture: true });
      window.removeEventListener("keydown", handleScrollOrKey);
    };
  }, []);

  if (!mounted || !state || !state.text || !state.visible) return null;

  const { text, pos, targetRect } = state;
  const padding = 8;
  let top = 0;
  let left = 0;
  let transform = "translate(-50%, 0)";

  if (pos === "up") {
    top = targetRect.top - padding;
    left = targetRect.left + targetRect.width / 2;
    transform = "translate(-50%, -100%)";
  } else if (pos === "down") {
    top = targetRect.bottom + padding;
    left = targetRect.left + targetRect.width / 2;
    transform = "translate(-50%, 0)";
  } else if (pos === "left") {
    top = targetRect.top + targetRect.height / 2;
    left = targetRect.left - padding;
    transform = "translate(-100%, -50%)";
  } else if (pos === "right") {
    top = targetRect.top + targetRect.height / 2;
    left = targetRect.right + padding;
    transform = "translate(0, -50%)";
  }

  // Viewport bounds clamp
  const safeLeft = Math.max(12, Math.min(window.innerWidth - 12, left));
  const safeTop = Math.max(12, Math.min(window.innerHeight - 12, top));

  return createPortal(
    <div
      className="global-floating-tooltip"
      style={{
        position: "fixed",
        top: `${safeTop}px`,
        left: `${safeLeft}px`,
        transform,
        zIndex: 999999,
        pointerEvents: "none",
      }}
      role="tooltip"
      aria-hidden="true"
    >
      {text}
    </div>,
    document.body,
  );
}
