// בדיקת קצה-לקצה של הזרימה שהמשתמש מריץ בפועל:
// תמלול קיים → keep_by_script → generate_subtitles → audit_edit.
// הטקסט והשיבושים לקוחים מהבריף האמיתי שנכשל.

import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import type { Sub } from "@/lib/editor/subtitlesEdl";
import type { Word } from "@/lib/models";
import { TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

/** הטקסט שהלקוח ביקש להשאיר (ההקדשה + ציטוט הגמרא). */
const SPOKEN_SCRIPT =
  "שלום וברכה, השיעור הזה נמסר בכולל הקדיש והחסד. "
  + "ויהיו הדברים להצלחת הגברת תפארת עטר בת נתלי. "
  + "הגמרא כותבת: קשה סילוקו של אדם כשר כשריפת בית אלהינו. "
  + "ובמקום אחר נאמר: קשה סילוקו של אדם כשר כחורבן בית אלהינו.";

/**
 * תמלול מדומה עם שלושת סוגי הכשל האמיתיים:
 *  - שיבושי כתיב ("טיפרת" / "קשר")
 *  - מהססים ("אה", "אממ")
 *  - דיבור שלא ביקשו לשמור (המשפט על ההנצחה)
 */
function buildTranscript(): Word[] {
  const spoken = [
    "אה", "שלום", "וברכה", "השיעור", "הזה", "נמסר", "בכולל", "הקדיש", "והחסד",
    "ההנצחה", "היום", "תהיה", "לעילוי", "נשמת", "משה", "בן", "רחל",
    "אממ", "ויהיו", "הדברים", "להצלחת", "הגברת", "טיפרת", "עטר", "בת", "נתלי",
    "הגמרא", "כותבת", "קשה", "סילוקו", "של", "אדם", "קשר", "כשריפת", "בית", "אלהינו",
    "ובמקום", "אחר", "נאמר", "קשה", "סילוקו", "של", "אדם", "קשר", "כחורבן", "בית", "אלהינו",
  ];
  let t = 0.5;
  return spoken.map((text) => {
    const word: Word = { text, start: t, end: t + 0.32, type: "word" };
    t += 0.32 + 0.07;
    return word;
  });
}

function harness(words: Word[]) {
  const asset: MediaAsset = {
    id: "media-1", name: "שיעור.mp4", kind: "video",
    file: null as unknown as File, duration: 30, url: "blob:lesson",
  };
  let clips: Clip[] = [];
  let subs: Sub[] = [];
  const tracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
  ];
  const api: EditorApi = {
    getClips: () => clips,
    setClips: (next) => { clips = next || []; },
    getOverlays: () => [], setOverlays: () => undefined, updateOverlay: () => undefined,
    removeOverlay: () => undefined, addOverlay: () => undefined,
    updateClip: () => undefined,
    getMedia: () => [asset], addMediaAsset: () => undefined,
    getSubs: () => subs, setSubs: (next) => { subs = next || []; },
    getTracks: () => tracks, setTracks: () => undefined,
    getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => undefined, selectOverlay: () => undefined,
    seek: () => undefined, getPlayhead: () => 0,
    getCaptionStyle: () => ({ fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "soft" }),
    setCaptionStyle: () => undefined,
  };
  const ctx: AgentContext = {
    media: [asset], duration: 30, words,
    transcripts: { "media-1": words },
    clips: [], subs: [], overlays: [], tracks,
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  };
  return { ctx, clips: () => clips, subs: () => subs };
}

const silent = () => undefined;

describe("זרימת עריכה מלאה על בריף אמיתי", () => {
  it("keep_by_script שומר את כל מילות הטקסט למרות שיבושי תמלול", async () => {
    const h = harness(buildTranscript());
    const result = String(await TOOL_BY_NAME.keep_by_script.run(
      { script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent,
    ));
    expect(result).toContain("כיסוי הטקסט: 100%");
    expect(result).not.toContain("⚠");
    expect(h.clips().length).toBeGreaterThan(0);
  });

  it("מסיר את הדיבור שלא ביקשו ואת המהססים", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    const keptText = h.clips().flatMap((clip) =>
      h.ctx.transcripts["media-1"]
        .filter((w) => (w.start + w.end) / 2 >= clip.start && (w.start + w.end) / 2 <= clip.end)
        .map((w) => w.text)).join(" ");
    expect(keptText).not.toContain("ההנצחה");
    expect(keptText).not.toContain("אממ");
    expect(keptText).not.toContain("אה ");
    expect(keptText).toContain("כשריפת");
  });

  it("מדווח במפורש על מילה שביקשו ולא נאמרה", async () => {
    const h = harness(buildTranscript());
    const result = String(await TOOL_BY_NAME.keep_by_script.run(
      { script: `${SPOKEN_SCRIPT} תהא נשמתו צרורה בצרור החיים.` }, h.ctx, silent,
    ));
    expect(result).toContain("⚠");
    expect(result).toContain("לא נמצאו בתמלול");
    expect(result).toContain("צרורה");
  });

  it("generate_subtitles מפיק פעימות בלי חזרות ועם הכתיב של המשתמש", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    const result = String(await TOOL_BY_NAME.generate_subtitles.run({}, h.ctx, silent));
    expect(result).toContain("אפס חזרות על מילים");

    const all = h.subs().map((s) => s.text.replace(/‏/g, "").replace(/\n/g, " ")).join(" ");
    // הכתיב נלקח מהסקריפט, לא מהתמלול המשובש
    expect(all).toContain("תפארת");
    expect(all).not.toContain("טיפרת");
    expect(all).toContain("כשר");
    expect(all).not.toContain("קשר");
  });

  it("שרשור הכתוביות שווה בדיוק לטקסט המבוקש — אין חזרה ואין אובדן", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    await TOOL_BY_NAME.generate_subtitles.run({}, h.ctx, silent);
    const subs = h.subs();
    expect(subs.length).toBeGreaterThan(3);
    // כל טוקן מופיע בכתובית אחת בדיוק, בסדר המקורי. זו ההוכחה המבנית
    // שאין חשיפה מצטברת — לא סתם ספירת מילים משותפות, כי הרב באמת חוזר
    // על "בית אלהינו" פעמיים בטקסט.
    const rendered = subs.map((s) => s.text.replace(/‏/g, "").replace(/\n/g, " ")).join(" ")
      .split(/\s+/).filter(Boolean);
    expect(rendered).toEqual(SPOKEN_SCRIPT.split(/\s+/).filter(Boolean));
  });

  it("אין חשיפה מצטברת — כתובית אינה פותחת במילים של קודמתה", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    await TOOL_BY_NAME.generate_subtitles.run({}, h.ctx, silent);
    const subs = h.subs();
    for (let i = 0; i < subs.length - 1; i++) {
      const current = subs[i].text.replace(/‏/g, "").split(/\s+/).filter(Boolean);
      const next = subs[i + 1].text.replace(/‏/g, "").split(/\s+/).filter(Boolean);
      const cumulative = current.every((word, k) => next[k] === word);
      expect(cumulative, `כתובית ${i + 2} חוזרת על כל ${i + 1}`).toBe(false);
    }
  });

  it("כתוביות אינן חופפות בזמן ואינן חורגות מהציר", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    await TOOL_BY_NAME.generate_subtitles.run({}, h.ctx, silent);
    const subs = h.subs();
    const timelineEnd = h.clips().reduce((sum, c) => sum + (c.end - c.start), 0);
    for (let i = 0; i < subs.length; i++) {
      expect(subs[i].end).toBeGreaterThan(subs[i].start);
      expect(subs[i].end).toBeLessThanOrEqual(timelineEnd + 0.5);
      if (i + 1 < subs.length) expect(subs[i + 1].start).toBeGreaterThanOrEqual(subs[i].end - 1e-6);
    }
  });

  it("audit_edit עובר על עריכה תקינה ומדווח כיסוי מלא", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    await TOOL_BY_NAME.generate_subtitles.run({}, h.ctx, silent);
    const report = String(await TOOL_BY_NAME.audit_edit.run({ measure_audio: false }, h.ctx, silent));
    expect(report).toContain("כיסוי הטקסט");
    expect(report).toContain("עבר את כל הבדיקות");
    expect(report).not.toContain("כשלים:");
  });

  it("audit_edit נכשל כשכתוביות חוזרות על מילים", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    // חשיפה מצטברת — בדיוק הפגם שהמשתמש דיווח עליו
    await TOOL_BY_NAME.generate_subtitles.run({ reveal: "progressive" }, h.ctx, silent);
    const report = String(await TOOL_BY_NAME.audit_edit.run({ measure_audio: false }, h.ctx, silent));
    expect(report).toContain("כשלים:");
    expect(report).toContain("חוזרות על מילים");
  });

  it("audit_edit נכשל כשחסרות מילים מהטקסט המבוקש", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, h.ctx, silent);
    const report = String(await TOOL_BY_NAME.audit_edit.run(
      { script: `${SPOKEN_SCRIPT} תהא נשמתו צרורה בצרור החיים.`, measure_audio: false }, h.ctx, silent,
    ));
    expect(report).toContain("כשלים:");
    expect(report).toContain("חסרות");
    expect(report).toContain("צרורה");
  });

  it("הפלט רציף בזמן-מקור — אין השמעה כפולה של אותה הברה", async () => {
    const h = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "tight" }, h.ctx, silent);
    const clips = h.clips();
    for (let i = 1; i < clips.length; i++) {
      expect(clips[i].start).toBeGreaterThanOrEqual(clips[i - 1].end - 1e-6);
    }
  });

  it("pacing משנה את מידת ההידוק בלי לפגוע בכיסוי", async () => {
    const broadcast = harness(buildTranscript());
    const tight = harness(buildTranscript());
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "broadcast" }, broadcast.ctx, silent);
    await TOOL_BY_NAME.keep_by_script.run({ script: SPOKEN_SCRIPT, pacing: "tight" }, tight.ctx, silent);
    const total = (clips: Clip[]) => clips.reduce((sum, c) => sum + (c.end - c.start), 0);
    expect(total(tight.clips())).toBeLessThanOrEqual(total(broadcast.clips()) + 1e-6);
    for (const h of [broadcast, tight]) {
      const report = String(await TOOL_BY_NAME.audit_edit.run(
        { script: SPOKEN_SCRIPT, measure_audio: false }, h.ctx, silent,
      ));
      expect(report).not.toContain("חסרות");
    }
  });
});
