import { describe, it, expect } from "vitest";
import { migrateState } from "./migrate";
import { SCHEMA_VERSION } from "./project";

describe("project migration", () => {
  it("migrates old {clips, subs} (no schema) to 3 tracks, preserving data", () => {
    const old = { clips: [{ id: "c1", sourceId: "m1", start: 0, end: 2 }], subs: [{ id: "s1", start: 0, end: 1, text: "שלום" }] };
    const p = migrateState(old);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.clips).toHaveLength(1);
    expect(p.subs).toHaveLength(1);
    expect(p.tracks.map((t) => t.type)).toEqual(["video", "audio", "caption"]);
  });

  it("handles null safely", () => {
    const p = migrateState(null);
    expect(p.clips).toBeNull();
    expect(p.subs).toBeNull();
    expect(p.tracks).toHaveLength(3);
  });

  it("does not lose clips on malformed track data", () => {
    const p = migrateState({ schemaVersion: 2, clips: [{ id: "c", sourceId: "m", start: 0, end: 1 }], subs: null, tracks: "oops" });
    expect(p.clips).toHaveLength(1);
    expect(p.tracks).toHaveLength(3);
  });

  it("preserves existing track flags (lock/mute/name)", () => {
    const p = migrateState({
      schemaVersion: 2, clips: null, subs: null,
      tracks: [{ id: "trk_audio", name: "מוזיקה", type: "audio", order: 1, height: 50, locked: true, muted: true }],
    });
    const audio = p.tracks.find((t) => t.type === "audio")!;
    expect(audio.muted).toBe(true);
    expect(audio.locked).toBe(true);
    expect(audio.name).toBe("מוזיקה");
    // חסרות הושלמו
    expect(p.tracks.find((t) => t.type === "video")).toBeTruthy();
    expect(p.tracks.find((t) => t.type === "caption")).toBeTruthy();
  });
});
