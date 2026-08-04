// Central selection model for the professional editor interaction layer.
// Active selection drives Inspector + handles; hover preselection is visual-only.

export type SelectionKind =
  | "none"
  | "clip"
  | "gap"
  | "overlay"
  | "caption"
  | "track"
  | "asset";

export type SelectionTrack = "video" | "audio" | "caption" | "overlay" | null;

/** Active selection — opens Inspector, shows handles, survives mouse leave. */
export interface EditorSelection {
  kind: SelectionKind;
  id: string | null;
  /** Which timeline track the selection originated from (clip A/V distinction). */
  track: SelectionTrack;
}

/** Hover preselection — outline/cursor only; never opens Inspector or history. */
export interface HoverPreselection {
  kind: Exclude<SelectionKind, "none">;
  id: string;
  track?: SelectionTrack;
}

export const EMPTY_SELECTION: EditorSelection = { kind: "none", id: null, track: null };

export function isSameSelection(a: EditorSelection, b: EditorSelection): boolean {
  return a.kind === b.kind && a.id === b.id && a.track === b.track;
}

export function selectClip(id: string, track: "video" | "audio" = "video", isGap = false): EditorSelection {
  return { kind: isGap ? "gap" : "clip", id, track };
}

export function selectOverlay(id: string): EditorSelection {
  return { kind: "overlay", id, track: "overlay" };
}

export function selectCaption(id: string): EditorSelection {
  return { kind: "caption", id, track: "caption" };
}

export function selectTrack(id: string): EditorSelection {
  return { kind: "track", id, track: null };
}

export function selectAsset(id: string): EditorSelection {
  return { kind: "asset", id, track: null };
}

export function clearSelection(): EditorSelection {
  return EMPTY_SELECTION;
}

/** Inspector focus derived from active selection (never from hover). */
export type InspectorFocus =
  | "project"
  | "video"
  | "audio"
  | "caption"
  | "text"
  | "image"
  | "track"
  | "asset"
  | "gap";

export function inspectorFocusFor(
  sel: EditorSelection,
  opts?: { overlayKind?: "image" | "text" | null },
): InspectorFocus {
  switch (sel.kind) {
    case "none":
      return "project";
    case "gap":
      return "gap";
    case "clip":
      return sel.track === "audio" ? "audio" : "video";
    case "caption":
      return "caption";
    case "overlay":
      return opts?.overlayKind === "text" ? "text" : "image";
    case "track":
      return "track";
    case "asset":
      return "asset";
    default:
      return "project";
  }
}
