export type ComposerReference = {
  token: string;
  label: string;
  kind: "media" | "time" | "context" | "message";
  preview?: string;
  author?: "user" | "assistant";
  time?: string;
};

export function addComposerReference(current: ComposerReference[], next: ComposerReference): ComposerReference[] {
  return current.some((reference) => reference.token === next.token) ? current : [...current, next];
}

export function serializeComposerMessage(text: string, references: ComposerReference[] = []): string {
  const trimmed = text.trim();
  const missing = references.filter((r) => !trimmed.includes(r.token));
  if (missing.length === 0) return trimmed;
  return [...missing.map((r) => r.token), trimmed].filter(Boolean).join(" ");
}

