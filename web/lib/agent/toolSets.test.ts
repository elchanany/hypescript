import { describe, it, expect } from "vitest";
import { LOOP_GUARDS, MUTATING_TOOLS, SERIALIZED_TOOLS } from "./runtime";
import { PLAN_TOOL_NAMES, TOOL_BY_NAME } from "./tools";

const ALL_TOOLS = new Set(Object.keys(TOOL_BY_NAME));

const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "get_video_info", "list_media", "transcribe_video", "find_in_transcript",
  "inspect_timeline_evidence", "inspect_timeline_layers", "get_transcript", "transcribe_timeline",
  "analyze_audio", "capture_frame", "list_clips", "list_tracks", "list_overlays",
  "list_subtitles", "list_stt_models", "list_voices", "discover_intent",
  "set_project_brief", "get_project_brief", "list_caption_styles", "list_looks",
  "list_transitions", "list_text_templates", "audit_edit", "ask_user", "get_brand_kit", "export_srt",
]);

describe("agent tool-set consistency", () => {
  it("classifies every registered tool exactly once", () => {
    for (const name of ALL_TOOLS) {
      const readOnly = READ_ONLY_TOOLS.has(name);
      const serialized = SERIALIZED_TOOLS.has(name);
      expect(readOnly || serialized, `${name} must be read-only or serialized`).toBe(true);
      expect(readOnly && serialized, `${name} cannot be both`).toBe(false);
    }
    for (const name of SERIALIZED_TOOLS) {
      expect(ALL_TOOLS.has(name), `SERIALIZED_TOOLS has unknown tool ${name}`).toBe(true);
    }
    for (const name of READ_ONLY_TOOLS) {
      expect(ALL_TOOLS.has(name), `READ_ONLY_TOOLS has unknown tool ${name}`).toBe(true);
    }
  });

  it("serializes render_video on top of every mutating tool", () => {
    expect(SERIALIZED_TOOLS.size).toBe(MUTATING_TOOLS.size + 1);
    expect(SERIALIZED_TOOLS.has("render_video")).toBe(true);
  });

  it("keeps previously-missed mutating tools protected", () => {
    for (const name of [
      "set_clip_flip", "set_clip_audio_fades", "set_clip_visual_fades", "apply_look",
      "set_caption_style", "set_aspect_ratio", "add_track", "rename_media", "generate_background_music",
      "generate_sfx", "duck_under_speech", "freeze_frame", "export_cover",
    ]) {
      expect(MUTATING_TOOLS.has(name), `${name} mutates state and needs a checkpoint`).toBe(true);
    }
  });

  it("plan allow-list references only real tools", () => {
    for (const name of PLAN_TOOL_NAMES) {
      expect(ALL_TOOLS.has(name), `PLAN_TOOL_NAMES has unknown tool ${name}`).toBe(true);
    }
  });

  it("loop guards reference only real tools", () => {
    for (const name of Object.keys(LOOP_GUARDS)) {
      expect(ALL_TOOLS.has(name), `LOOP_GUARDS has unknown tool ${name}`).toBe(true);
    }
  });
});
