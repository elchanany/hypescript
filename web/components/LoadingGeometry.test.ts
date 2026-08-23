import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loadingState = readFileSync(new URL("./LoadingState.tsx", import.meta.url), "utf8");
const chat = readFileSync(new URL("./Chat.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
const routeLoading = readFileSync(new URL("../app/loading.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("loading geometry", () => {
  it("does not invent miniature layouts inside the shared status", () => {
    expect(loadingState).not.toContain("SkeletonLayout");
    expect(loadingState).not.toContain("loading-editor-shell");
    expect(routeLoading).not.toContain("route-loading-shell");
  });

  it("hydrates the real editor surfaces and reports project loading", () => {
    expect(editor).toContain('editor-root${!restored ? " is-hydrating" : ""}');
    expect(editor).toContain("טוענים את הפרויקט…");
    expect(css).toContain(".editor-root.is-hydrating :is(.leftpanel,.center-col,.inspector2,.timeline-region,.agent-dock,.chat-focus-shell)::after");
  });

  it("uses the real project card and chat bubble shapes", () => {
    expect(dashboard).toContain("dash-card dash-card-loading");
    expect(dashboard).toContain("dash-card-opening");
    expect(chat).toContain("msg2 assistant chat-restoring");
    expect(chat).toContain('className="is-loading skeleton-shimmer"');
  });
});
