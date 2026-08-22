import { execFileSync, execFileSync as exec } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { assAlignment, assColor, assEscapeText, assTime, buildAssFile, escapeFilterPath } from "./assSubtitles";
import type { Sub } from "@/lib/editor/subtitlesEdl";

const TARGET = { width: 1280, height: 720 };
const SUBS: Sub[] = [
  { id: "s1", start: 0.5, end: 2, text: "שלום עולם" },
  { id: "s2", start: 2, end: 4.25, text: "שורה שנייה, עם פסיק" },
];

describe("assTime", () => {
  it("formats hours, minutes, seconds and centiseconds", () => {
    expect(assTime(0)).toBe("0:00:00.00");
    expect(assTime(1.5)).toBe("0:00:01.50");
    expect(assTime(61.234)).toBe("0:01:01.23");
    expect(assTime(3661.99)).toBe("1:01:01.99");
  });

  it("clamps a negative or broken value to zero instead of emitting garbage", () => {
    expect(assTime(-5)).toBe("0:00:00.00");
    expect(assTime(NaN)).toBe("0:00:00.00");
  });
});

describe("assColor", () => {
  it("reverses RGB into BGR — getting this wrong swaps red and blue silently", () => {
    expect(assColor("#ff0000")).toBe("&H000000FF");
    expect(assColor("#0000ff")).toBe("&H00FF0000");
    expect(assColor("#ffffff")).toBe("&H00FFFFFF");
  });

  it("inverts alpha: 0 is fully opaque in ASS", () => {
    expect(assColor("#000000", 0)).toBe("&H00000000");
    expect(assColor("#000000", 255)).toBe("&HFF000000");
  });

  it("falls back to white for a malformed colour", () => {
    expect(assColor("not-a-colour")).toBe("&H00FFFFFF");
  });
});

describe("assAlignment", () => {
  it("maps the caption position to the ASS numpad convention", () => {
    expect(assAlignment("bottom")).toBe(2);
    expect(assAlignment("center")).toBe(5);
    expect(assAlignment("top")).toBe(8);
  });
});

describe("assEscapeText", () => {
  it("escapes the characters that are ASS syntax", () => {
    expect(assEscapeText("a{b}c")).toBe("a\\{b\\}c");
    expect(assEscapeText("line1\nline2")).toBe("line1\\Nline2");
  });

  it("drops the RLM marks the editor adds for display", () => {
    expect(assEscapeText("\u200Fשלום\u200F")).toBe("שלום");
  });
});

describe("buildAssFile", () => {
  it("sizes the script to the real frame, so no extra scaling is needed", () => {
    const ass = buildAssFile(SUBS, null, TARGET);
    expect(ass).toContain("PlayResX: 1280");
    expect(ass).toContain("PlayResY: 720");
  });

  it("emits one Dialogue line per cue, in time order", () => {
    const ass = buildAssFile([SUBS[1], SUBS[0]], null, TARGET);
    const lines = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("0:00:00.50");
    expect(lines[1]).toContain("0:00:02.00");
  });

  it("skips empty and zero-length cues rather than emitting invalid events", () => {
    const ass = buildAssFile([
      { id: "a", start: 1, end: 1, text: "אפס אורך" },
      { id: "b", start: 1, end: 2, text: "   " },
      { id: "c", start: 1, end: 2, text: "טוב" },
    ], null, TARGET);
    expect(ass.split("\n").filter((l) => l.startsWith("Dialogue:"))).toHaveLength(1);
  });

  it("uses an opaque box for bg=box and no box at all for bg=none", () => {
    const box = buildAssFile(SUBS, { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "box" }, TARGET);
    const none = buildAssFile(SUBS, { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "none" }, TARGET);
    expect(box).toMatch(/Style: Default,[^\n]*,3,/);   // BorderStyle 3 = opaque box
    expect(none).toMatch(/Style: Default,[^\n]*,1,/);  // BorderStyle 1 = outline only
  });

  it("scales the font from the short side of the frame", () => {
    const tall = buildAssFile(SUBS, { fontSize: 5, color: "#fff000", bold: false, position: "top", bg: "soft" }, { width: 1080, height: 1920 });
    // short side 1080 * 5% = 54
    expect(tall).toMatch(/Style: Default,[^,]+,54,/);
  });
});

describe("escapeFilterPath", () => {
  it("escapes the colon that would otherwise end the filter argument", () => {
    expect(escapeFilterPath("C:/tmp/subs.ass")).toBe("C\\:/tmp/subs.ass");
  });

  it("normalises backslashes so a Windows path survives the filter parser", () => {
    expect(escapeFilterPath("C:\\tmp\\subs.ass")).toBe("C\\:/tmp/subs.ass");
  });

  it("leaves a plain POSIX path alone — that is what the worker actually uses", () => {
    expect(escapeFilterPath("/tmp/hs/subs.ass")).toBe("/tmp/hs/subs.ass");
  });
});

// ── אימות אמיתי מול FFmpeg ────────────────────────────────────────────────
// "המחרוזת נראית נכון" אינה הוכחה שהקובץ תקין. כאן FFmpeg באמת קורא את ה-ASS
// שנוצר, צורב אותו על וידאו, ואנחנו מוודאים שהפלט קיים ובעל האורך הנכון.
//
// FFmpeg מורץ עם cwd בתיקיית העבודה ועם שם קובץ יחסי בכוונה: אות הכונן של
// Windows ("C:") היא מפריד ארגומנטים בתוך מסנן, וכל וריאציית בריחה מתנהגת
// אחרת בין בניות. בעובד עצמו הנתיב הוא /tmp/... בלי נקודתיים, ולכן זו אינה
// הדרך שבה הקוד רץ בפרודקשן — מה שנבדק כאן הוא *תוכן* ה-ASS, וזה הסיכון
// האמיתי. הבריחה עצמה מכוסה ביחידה למעלה.
function ffmpegAvailable(): boolean {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; }
  catch { return false; }
}
const FF = ffmpegAvailable();
let work = "";

afterAll(() => { if (work) rmSync(work, { recursive: true, force: true }); });

describe.skipIf(!FF)("ass burn-in through real FFmpeg", () => {
  it("produces a playable file of the expected duration", () => {
    work = mkdtempSync(join(tmpdir(), "hs-ass-"));
    const assPath = join(work, "subs.ass");
    const out = join(work, "out.mp4");
    writeFileSync(assPath, buildAssFile(SUBS, null, TARGET), "utf8");

    exec("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", `color=c=navy:s=${TARGET.width}x${TARGET.height}:r=25:d=5`,
      "-vf", "ass=filename=subs.ass",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "out.mp4",
    ], { stdio: "pipe", cwd: work });

    const duration = Number(String(exec("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out,
    ], { stdio: "pipe" })).trim());
    expect(duration).toBeGreaterThan(4.8);
    expect(duration).toBeLessThan(5.3);
  });

  it("FFmpeg accepts every background variant without erroring on the style line", () => {
    const dir = mkdtempSync(join(tmpdir(), "hs-ass-bg-"));
    try {
      for (const bg of ["none", "soft", "box"] as const) {
        const p = join(dir, `${bg}.ass`);
        writeFileSync(p, buildAssFile(SUBS, { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg }, TARGET), "utf8");
        exec("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-f", "lavfi", "-i", "color=c=black:s=320x240:r=10:d=1",
          "-vf", `ass=filename=${bg}.ass`,
          "-frames:v", "3", "-f", "null", "-",
        ], { stdio: "pipe", cwd: dir });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
