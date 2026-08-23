"use client";

import { useEffect, useState } from "react";

interface Props {
  size?: number;
  className?: string;
  mode?: "idle" | "loading" | "hero";
  interactive?: boolean;
}

/**
 * Hypescript3DIconAnimation
 *
 * אנימציית הופעה וטעינה נעימה, נקייה ומקצועית לאייקון התלת-ממדי המקורי של Hypescript:
 * - שומר על ה-3D Clay Render המקורי המרהיב (100% איכות ואותנטיות ללא עיוותים).
 * - חלקי האייקון (המיספרה שמאלית, כפתור Play מרכזי, והמיספרה ימנית) מונפשים כיחידות נפרדות.
 * - אנימציית כניסה (Entrance) חלקה עם אפקט Spring.
 * - אנימציית נשימה וטעינה (Loading / Idle) נעימה ויוקרתית בסגנון Apple / Linear.
 * - ברק ספקולרי (Sheen Shimmer) עדין שחולף על פני האייקון.
 */
export default function Hypescript3DIconAnimation({
  size = 240,
  className = "",
  mode = "idle",
  interactive = true,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageSrc = "/brand/icons/icon-512.png";

  return (
    <div
      className={`hsx-3d-icon-stage mode-${mode} ${mounted ? "is-entered" : ""} ${interactive ? "is-interactive" : ""} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-label="Hypescript AI"
    >
      {/* Soft Ambient Depth Shadow */}
      <div className="hsx-3d-ambient-shadow" aria-hidden="true" />

      {/* Layer 1: Left Brain Hemisphere */}
      <div className="hsx-3d-slice slice-left" aria-hidden="true">
        <img
          src={imageSrc}
          alt=""
          width={size}
          height={size}
          className="hsx-3d-img"
          draggable={false}
          decoding="async"
        />
      </div>

      {/* Layer 2: Central 3D Play Button */}
      <div className="hsx-3d-slice slice-center" aria-hidden="true">
        <img
          src={imageSrc}
          alt=""
          width={size}
          height={size}
          className="hsx-3d-img"
          draggable={false}
          decoding="async"
        />
      </div>

      {/* Layer 3: Right Brain Hemisphere */}
      <div className="hsx-3d-slice slice-right" aria-hidden="true">
        <img
          src={imageSrc}
          alt=""
          width={size}
          height={size}
          className="hsx-3d-img"
          draggable={false}
          decoding="async"
        />
      </div>

      {/* Layer 4: Smooth Specular Light Sheen */}
      <div className="hsx-3d-sheen-sweep" aria-hidden="true" />
    </div>
  );
}
