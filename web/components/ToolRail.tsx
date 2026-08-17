"use client";

import Link from "next/link";
import { Film, Captions, Type, Settings, Blend, WandSparkles, Palette, Layers } from "@/components/icons";

export type LeftTab = "media" | "text" | "captions" | "effects" | "transitions" | "stickers" | "elements";

const TABS: { id: LeftTab; icon: typeof Film; label: string }[] = [
  { id: "media", icon: Film, label: "מדיה" },
  { id: "text", icon: Type, label: "טקסט וגופנים" },
  { id: "captions", icon: Captions, label: "כתוביות" },
  { id: "effects", icon: WandSparkles, label: "אפקטים ולוקים" },
  { id: "transitions", icon: Blend, label: "מעברים" },
  { id: "stickers", icon: Palette, label: "סטיקרים ו-GIFs" },
  { id: "elements", icon: Layers, label: "אלמנטים וצורות" },
];

export default function ToolRail({ active, onSelect }: { active: LeftTab; onSelect: (t: LeftTab) => void }) {
  return (
    <div className="toolrail" data-tour="tools">
      {TABS.map((t) => (
        <button key={t.id} className={`rail-btn ${active === t.id ? "on" : ""}`} data-tip={t.label} data-tippos="right"
          onClick={() => onSelect(t.id)} aria-label={t.label}>
          <t.icon size={20} strokeWidth={1.75} />
        </button>
      ))}
      <div className="rail-grow" />
      <Link href="/settings" className="rail-btn" data-tip="הגדרות" data-tippos="right" aria-label="הגדרות">
        <Settings size={20} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
