"use client";

import { useRef, useState, type PointerEvent } from "react";
import Hypescript3DIconAnimation from "@/components/Hypescript3DIconAnimation";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero" | "giant";

interface Props {
  size?: SpinnerSize;
  label?: string;
  showCard?: boolean;
  interactiveTilt?: boolean;
  className?: string;
  priority?: boolean;
}

const SIZE_MAP: Record<SpinnerSize, { iconSize: number; cardWidth: number }> = {
  xs: { iconSize: 22, cardWidth: 32 },
  sm: { iconSize: 32, cardWidth: 48 },
  md: { iconSize: 52, cardWidth: 80 },
  lg: { iconSize: 84, cardWidth: 120 },
  xl: { iconSize: 130, cardWidth: 180 },
  hero: { iconSize: 280, cardWidth: 420 },
  giant: { iconSize: 360, cardWidth: 520 },
};

export default function HypescriptBrandSpinner({
  size = "md",
  label,
  showCard = false,
  interactiveTilt = true,
  className = "",
  priority = false,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<{ tiltX: number; tiltY: number }>({
    tiltX: 0,
    tiltY: 0,
  });

  const { iconSize } = SIZE_MAP[size];
  const isHeroMode = size === "hero" || size === "giant" || showCard;

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactiveTilt || !cardRef.current || e.pointerType === "touch") return;
    const rect = cardRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({
      tiltX: -yRatio * 12,
      tiltY: xRatio * 16,
    });
  }

  function handlePointerLeave() {
    setTiltStyle({ tiltX: 0, tiltY: 0 });
  }

  if (isHeroMode) {
    return (
      <div
        ref={cardRef}
        className={`hsx-hero-icon-container size-${size} ${className}`.trim()}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={
          {
            "--hero-tilt-x": `${tiltStyle.tiltX}deg`,
            "--hero-tilt-y": `${tiltStyle.tiltY}deg`,
          } as React.CSSProperties
        }
      >
        {/* Ambient Back Glow Aura */}
        <div className="hsx-hero-icon-aura" aria-hidden="true" />

        {/* 3D-Perspective Tilted Squircle Card */}
        <div className="hsx-hero-icon-card">
          {/* Card Inner Specular Highlight / Bevel Glint */}
          <div className="hsx-card-specular" aria-hidden="true" />

          {/* Animated 3D Brain+Play Elements Core */}
          <div className="hsx-hero-icon-wrapper">
            <Hypescript3DIconAnimation
              size={iconSize}
              mode="hero"
              interactive={interactiveTilt}
            />
          </div>
        </div>

        {label && <span className="hsx-hero-icon-label">{label}</span>}
      </div>
    );
  }

  // Compact / Inline Spinner Mode for loading states across the app
  return (
    <div
      className={`hsx-brand-spinner size-${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label || "Hypescript טוען…"}
    >
      <div className="hsx-spinner-stage" style={{ width: iconSize, height: iconSize }}>
        <Hypescript3DIconAnimation
          size={iconSize}
          mode="loading"
          interactive={false}
        />
      </div>

      {label && <span className="hsx-spinner-label">{label}</span>}
    </div>
  );
}

