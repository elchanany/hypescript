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

export function serializeComposerMessage(text: string, references: ComposerReference[]): string {
  return [...references.map((reference) => reference.token), text.trim()].filter(Boolean).join(" ");
}
