"use client";

import { useId } from "react";

interface Props {
  size?: number;
  className?: string;
  speed?: "normal" | "fast" | "slow";
  interactive?: boolean;
  glow?: boolean;
}

/**
 * HypescriptBrainPlayVector
 *
 * המבנה הווקטורי המונפש של האייקון המקורי של Hypescript:
 * 1. שתי המיספרות מוח (שמאל וימין) בעלות נפח אורגני תלת-ממדי.
 * 2. חריצים סינפטיים פנימיים (3 בכל צד) שבהם רצים פולסים חשמליים של AI.
 * 3. כפתור Play מרכזי מעוגל שפועם בסינכרון ומייצר גלי אנרגיה (Shockwaves).
 * 4. צמתים סינפטיים זוהרים שמבזיקים כשהמידע זורם בין המוח לכפתור העריכה.
 */
export default function HypescriptBrainPlayVector({
  size = 240,
  className = "",
  speed = "normal",
  interactive = true,
  glow = true,
}: Props) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={`hsx-brain-vector speed-${speed} ${interactive ? "interactive" : ""} ${className}`.trim()}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Hypescript AI Brain + Play"
    >
      <defs>
        {/* Clay 3D Volume Gradients for Brain Lobes */}
        <radialGradient id={`left-lobe-grad-${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="45%" stopColor="#34d399" />
          <stop offset="75%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>

        <radialGradient id={`right-lobe-grad-${uid}`} cx="65%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="45%" stopColor="#34d399" />
          <stop offset="75%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>

        {/* 3D Play Button Gradient */}
        <linearGradient id={`play-grad-${uid}`} x1="116" y1="110" x2="186" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="35%" stopColor="#34d399" />
          <stop offset="85%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>

        {/* Electric Neural Pulse Laser Gradient */}
        <linearGradient id={`pulse-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b9f65d" stopOpacity="0" />
          <stop offset="50%" stopColor="#b9f65d" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        {/* Specular Glint Highlight */}
        <linearGradient id={`glint-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Shadow & Glow Filters */}
        <filter id={`drop-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#042f2e" floodOpacity="0.45" />
        </filter>

        <filter id={`neon-glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`groove-shadow-${uid}`}>
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#064e3b" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Dynamic Synaptic Background Grid / Ambient Particles */}
      <g className="hsx-neural-field" opacity={glow ? 0.85 : 0.4}>
        {/* Radiating Synaptic Ring from Play Button */}
        <circle cx="150" cy="150" r="30" className="hsx-energy-ring r1" />
        <circle cx="150" cy="150" r="55" className="hsx-energy-ring r2" />
        <circle cx="150" cy="150" r="85" className="hsx-energy-ring r3" />
      </g>

      {/* ========================================================
          LEFT BRAIN HEMISPHERE
          ======================================================== */}
      <g className="hsx-lobe-group lobe-left">
        {/* Left Lobe 3D Base Body */}
        <path
          d="M 115 62 C 90 48, 54 75, 40 115 C 28 152, 34 198, 56 232 C 74 258, 106 256, 116 238 C 122 225, 114 200, 108 178 C 102 158, 102 142, 108 122 C 114 100, 122 75, 115 62 Z"
          fill={`url(#left-lobe-grad-${uid})`}
          filter={`url(#drop-shadow-${uid})`}
          className="hsx-lobe-body"
        />

        {/* Left Lobe Specular Bevel Highlight */}
        <path
          d="M 108 68 C 88 56, 60 80, 48 116 C 38 148, 42 190, 62 222 C 76 244, 98 244, 108 232"
          stroke={`url(#glint-grad-${uid})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="hsx-lobe-glint"
        />

        {/* Neural Grooves (Deep Anatomical Folds) */}
        <g className="hsx-neural-grooves" filter={`url(#groove-shadow-${uid})`}>
          {/* Top Groove */}
          <path
            d="M 52 110 C 68 116, 88 112, 104 96"
            stroke="#064e3b"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Middle Main Groove */}
          <path
            d="M 44 152 C 64 154, 82 150, 98 140"
            stroke="#064e3b"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Bottom Groove */}
          <path
            d="M 58 198 C 72 192, 88 188, 104 182"
            stroke="#064e3b"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Micro Branching */}
          <path
            d="M 70 114 C 76 130, 85 142, 94 148"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
          <path
            d="M 68 194 C 78 176, 88 168, 96 160"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
        </g>

        {/* ACTIVE NEURAL FIRING PULSES (Glowing Laser Beams traveling in grooves) */}
        <g className="hsx-active-pulses" filter={`url(#neon-glow-${uid})`}>
          <path
            d="M 52 110 C 68 116, 88 112, 104 96"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-left-top"
          />
          <path
            d="M 44 152 C 64 154, 82 150, 98 140"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-left-mid"
          />
          <path
            d="M 58 198 C 72 192, 88 188, 104 182"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-left-bot"
          />
        </g>

        {/* Synaptic Nodes (Glowing Spark Junctions) */}
        <g className="hsx-synapse-nodes">
          <circle cx="52" cy="110" r="3" className="hsx-node node-1" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="104" cy="96" r="3.5" className="hsx-node node-2" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
          <circle cx="44" cy="152" r="3.5" className="hsx-node node-3" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="98" cy="140" r="4" className="hsx-node node-4" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
          <circle cx="58" cy="198" r="3" className="hsx-node node-5" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="104" cy="182" r="3.5" className="hsx-node node-6" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
        </g>
      </g>

      {/* ========================================================
          RIGHT BRAIN HEMISPHERE
          ======================================================== */}
      <g className="hsx-lobe-group lobe-right">
        {/* Right Lobe 3D Base Body */}
        <path
          d="M 185 62 C 210 48, 246 75, 260 115 C 272 152, 266 198, 244 232 C 226 258, 194 256, 184 238 C 178 225, 186 200, 192 178 C 198 158, 198 142, 192 122 C 186 100, 178 75, 185 62 Z"
          fill={`url(#right-lobe-grad-${uid})`}
          filter={`url(#drop-shadow-${uid})`}
          className="hsx-lobe-body"
        />

        {/* Right Lobe Specular Bevel Highlight */}
        <path
          d="M 192 68 C 212 56, 240 80, 252 116 C 262 148, 258 190, 238 222 C 224 244, 202 244, 192 232"
          stroke={`url(#glint-grad-${uid})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="hsx-lobe-glint"
        />

        {/* Neural Grooves (Deep Anatomical Folds) */}
        <g className="hsx-neural-grooves" filter={`url(#groove-shadow-${uid})`}>
          {/* Top Groove */}
          <path
            d="M 248 110 C 232 116, 212 112, 196 96"
            stroke="#064e3b"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Middle Main Groove */}
          <path
            d="M 256 152 C 236 154, 218 150, 202 140"
            stroke="#064e3b"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Bottom Groove */}
          <path
            d="M 242 198 C 228 192, 212 188, 196 182"
            stroke="#064e3b"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Micro Branching */}
          <path
            d="M 230 114 C 224 130, 215 142, 206 148"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
          <path
            d="M 232 194 C 222 176, 212 168, 204 160"
            stroke="#064e3b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
        </g>

        {/* ACTIVE NEURAL FIRING PULSES (Glowing Laser Beams traveling in grooves) */}
        <g className="hsx-active-pulses" filter={`url(#neon-glow-${uid})`}>
          <path
            d="M 248 110 C 232 116, 212 112, 196 96"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-right-top"
          />
          <path
            d="M 256 152 C 236 154, 218 150, 202 140"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-right-mid"
          />
          <path
            d="M 242 198 C 228 192, 212 188, 196 182"
            stroke={`url(#pulse-grad-${uid})`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="hsx-pulse-path pulse-right-bot"
          />
        </g>

        {/* Synaptic Nodes (Glowing Spark Junctions) */}
        <g className="hsx-synapse-nodes">
          <circle cx="248" cy="110" r="3" className="hsx-node node-1" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="196" cy="96" r="3.5" className="hsx-node node-2" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
          <circle cx="256" cy="152" r="3.5" className="hsx-node node-3" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="202" cy="140" r="4" className="hsx-node node-4" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
          <circle cx="242" cy="198" r="3" className="hsx-node node-5" fill="#b9f65d" filter={`url(#neon-glow-${uid})`} />
          <circle cx="196" cy="182" r="3.5" className="hsx-node node-6" fill="#ffffff" filter={`url(#neon-glow-${uid})`} />
        </g>
      </g>

      {/* ========================================================
          SYNAPTIC BRIDGES (Electric Spark Arcs between Lobes & Play Button)
          ======================================================== */}
      <g className="hsx-synaptic-bridges" filter={`url(#neon-glow-${uid})`}>
        <path
          d="M 104 140 Q 112 145, 120 148"
          stroke="#b9f65d"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="hsx-spark-bridge bridge-left"
        />
        <path
          d="M 196 140 Q 188 145, 180 148"
          stroke="#b9f65d"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="hsx-spark-bridge bridge-right"
        />
      </g>

      {/* ========================================================
          CENTRAL PLAY BUTTON (Pulsing 3D Emerald Core)
          ======================================================== */}
      <g className="hsx-play-core-group">
        {/* Play Button Outer Glow Aura */}
        <circle cx="148" cy="150" r="38" fill="url(#pulse-grad-uid)" opacity="0.3" filter={`url(#neon-glow-${uid})`} className="hsx-play-glow-field" />

        {/* 3D Rounded Play Triangle */}
        <path
          d="M 124 116 C 119 112, 116 115, 116 122 L 116 178 C 116 185, 119 188, 124 184 L 180 154 C 186 151, 186 149, 180 146 Z"
          fill={`url(#play-grad-${uid})`}
          filter={`url(#drop-shadow-${uid})`}
          className="hsx-play-triangle"
        />

        {/* Specular Bevel on Play Triangle Top Edge */}
        <path
          d="M 120 124 L 176 148"
          stroke={`url(#glint-grad-${uid})`}
          strokeWidth="3"
          strokeLinecap="round"
          className="hsx-play-glint"
        />

        {/* Central Energy Spark Beacon */}
        <circle
          cx="145"
          cy="150"
          r="4.5"
          fill="#ffffff"
          filter={`url(#neon-glow-${uid})`}
          className="hsx-play-spark"
        />
      </g>
    </svg>
  );
}
