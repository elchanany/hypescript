"use client";

import { useEffect, useState } from "react";
import { Cloud, Loader2 } from "@/components/icons";
import { formatBytes, formatRemaining, remainingSeconds, type TransferProgress } from "@/lib/ui/progress";

export type LoadingVariant = "lines" | "projects" | "editor" | "media" | "chat" | "timeline";

function SkeletonLayout({ variant, lines }: { variant: LoadingVariant; lines: number }) {
  if (variant === "projects") return <div className="loading-project-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i className="skeleton-shimmer" key={index}><b /><span /><span /></i>)}</div>;
  if (variant === "editor") return <div className="loading-editor-shell" aria-hidden="true"><i className="skeleton-shimmer media" /><i className="skeleton-shimmer preview" /><i className="skeleton-shimmer chat" /><i className="skeleton-shimmer timeline" /></div>;
  if (variant === "media") return <div className="loading-media-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i className="skeleton-shimmer" key={index} />)}</div>;
  if (variant === "chat") return <div className="loading-chat-bubbles" aria-hidden="true"><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></div>;
  if (variant === "timeline") return <div className="loading-timeline-tracks" aria-hidden="true"><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></div>;
  return <div className="loading-state-lines" aria-hidden="true">{Array.from({ length: lines }, (_, index) => <i className="skeleton-shimmer" key={index} />)}</div>;
}

export function LoadingState({ label = "טוען נתונים…", lines = 3, compact = false, variant = "lines" }: { label?: string; lines?: number; compact?: boolean; variant?: LoadingVariant }) {
  return <div className={`loading-state variant-${variant}${compact ? " compact" : ""}`} role="status" aria-live="polite" aria-label={label}>
    <div className="loading-state-title"><Loader2 className="spin" size={16} /><span>{label}</span></div>
    <SkeletonLayout variant={variant} lines={lines} />
  </div>;
}

export function UploadProgressCard({ value, compact = false }: { value: TransferProgress; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const percent = Math.round(value.ratio * 100);
  const remaining = Math.max(0, value.totalBytes - value.loadedBytes);
  return <section className={`upload-progress-card${compact ? " compact" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`מעלה ${value.fileName}`}>
    <div className="upload-progress-icon"><Cloud size={17} /><i /></div>
    <div className="upload-progress-copy">
      <div><strong>{value.count > 1 ? `מעלה ${value.count} קבצים` : "מעלה קובץ"}</strong><b>{percent}%</b></div>
      <span title={value.fileName}>{value.fileName}</span>
      <div className="upload-progress-track"><i style={{ width: `${percent}%` }} /></div>
      <small>{formatBytes(value.loadedBytes)} מתוך {formatBytes(value.totalBytes)} · נשארו {formatBytes(remaining)} · {formatRemaining(remainingSeconds(value, now))}</small>
    </div>
  </section>;
}
