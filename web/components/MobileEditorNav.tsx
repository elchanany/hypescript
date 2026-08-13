"use client";

import { Film, Layers, MessageCircle, Play, SlidersHorizontal } from "@/components/icons";

export type MobileEditorSurface = "preview" | "tools" | "timeline" | "inspector" | "chat";

const ITEMS: { id: MobileEditorSurface; label: string; icon: typeof Play }[] = [
  { id: "preview", label: "נגן", icon: Play },
  { id: "tools", label: "כלים", icon: Layers },
  { id: "timeline", label: "ציר זמן", icon: Film },
  { id: "inspector", label: "מאפיינים", icon: SlidersHorizontal },
  { id: "chat", label: "שיחה", icon: MessageCircle },
];

export default function MobileEditorNav({
  active,
  onSelect,
  hasSelection,
}: {
  active: MobileEditorSurface;
  onSelect: (surface: MobileEditorSurface) => void;
  hasSelection?: boolean;
}) {
  return (
    <nav className="mobile-editor-nav" aria-label="אזורי העורך בטלפון">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={active === id ? "active" : ""}
          aria-current={active === id ? "page" : undefined}
          aria-label={label}
          onClick={() => onSelect(id)}
        >
          <span className="mobile-nav-icon">
            <Icon size={21} weight={active === id ? "fill" : "regular"} />
            {id === "inspector" && hasSelection && <i aria-label="יש בחירה פעילה" />}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
