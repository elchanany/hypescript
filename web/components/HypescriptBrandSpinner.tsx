"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import BrandLogo from "@/components/BrandLogo";

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
  xs: { iconSize: 18, cardWidth: 28 },
  sm: { iconSize: 26, cardWidth: 42 },
  md: { iconSize: 44, cardWidth: 70 },
  lg: { iconSize: 72, cardWidth: 110 },
  xl: { iconSize: 110, cardWidth: 160 },
  hero: { iconSize: 240, cardWidth: 380 },
  giant: { iconSize: 320, cardWidth: 480 },
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
      tiltX: -yRatio * 14,
      tiltY: xRatio * 18,
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

        {/* 3D-Perspective Tilted Squircle Card (Inspired by Spotify Studio style) */}
        <div className="hsx-hero-icon-card">
          {/* Card Inner Specular Highlight / Bevel Glint */}
          <div className="hsx-card-specular" aria-hidden="true" />

          {/* Animated Brain+Play Icon Core */}
          <div className="hsx-hero-icon-wrapper">
            {/* Pulsing Synaptic Energy Rings */}
            <div className="hsx-pulse-ring ring-primary" aria-hidden="true" />
            <div className="hsx-pulse-ring ring-secondary" aria-hidden="true" />
            <div className="hsx-pulse-ring ring-tertiary" aria-hidden="true" />

            {/* Neural Laser Sweep Beam */}
            <div className="hsx-laser-sweep" aria-hidden="true" />

            {/* The Authentic Master Hypescript Mark (Brain + Play) */}
            <img
              src="/brand/icons/icon-512.png"
              alt="Hypescript AI"
              width={iconSize}
              height={iconSize}
              className="hsx-hero-brain-img"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />

            {/* Dynamic Playhead Center Sparkle */}
            <span className="hsx-playhead-beacon" aria-hidden="true" />
          </div>

          {/* Floating Floating Particle Chips */}
          <div className="hsx-floating-particles" aria-hidden="true">
            <span className="particle-dot p1" />
            <span className="particle-dot p2" />
            <span className="particle-dot p3" />
            <span className="particle-dot p4" />
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
        {/* Outer Rotating Conic Halo */}
        <div className="hsx-spinner-halo" aria-hidden="true" />

        {/* Breathing Synaptic Glow */}
        <div className="hsx-spinner-glow" aria-hidden="true" />

        {/* The Exact Hypescript Brain+Play Icon */}
        <img
          src="/brand/icons/icon-256.png"
          alt=""
          width={iconSize}
          height={iconSize}
          className="hsx-spinner-img"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      </div>

      {label && <span className="hsx-spinner-label">{label}</span>}
    </div>
  );
}
