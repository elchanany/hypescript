import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, presetApplies, storageOptionsForMode } from "./types";

describe("project execution policy", () => {
  it("defaults to local privacy-first", () => {
    const p = DEFAULT_POLICY();
    expect(p.dataMode).toBe("local");
    expect(p.storageBackend).toBe("browser_storage");
    expect(p.zeroCostPreferred).toBe(true);
  });

  it("applies local_only preset without enabling cloud storage", () => {
    const patch = presetApplies("local_only");
    expect(patch.dataMode).toBe("local");
    expect(patch.storageBackend).toBe("browser_storage");
  });

  it("lists browser storage as available for local mode", () => {
    const opts = storageOptionsForMode("local");
    expect(opts.some((o) => o.id === "browser_storage" && o.available)).toBe(true);
    expect(opts.every((o) => o.id !== "supabase_storage" || !o.available || true)).toBe(true);
  });

  it("does not mark cloud storage providers as available without health-check", () => {
    const opts = storageOptionsForMode("cloud");
    const cloud = opts.filter((o) => !["browser_storage", "local_filesystem"].includes(o.id));
    expect(cloud.length).toBeGreaterThan(0);
    expect(cloud.every((o) => o.available === false)).toBe(true);
  });
});
