// כלי הסוכן (צד-לקוח). מודל EDL: הסוכן והמשתמש עורכים את אותה רשימת קליפים.
// כל פעולת עריכה = כלי, כך שהמשתמש רואה כל שינוי חי על הציר.

import { isSpeechWord, Word } from "@/lib/models";
import { normalizeHebrew } from "@/lib/align";
import { DEFAULT_TTS_MODEL } from "@/lib/elevenlabs/constants";
import {
  addClip, Clip, clipAudioFades, clipDur, clipVisualFades, firstVideo, MediaAsset, mediaById, moveClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { clampOverlayTransform, imageOverlayGeometry, Overlay, makeImageOverlay, makeTextOverlay, makeTitlePopup, type ImageOverlayPreset } from "@/lib/editor/overlay";
import { isGapClip, removeClipLeaveGap, removeClipRipple, closeGap } from "@/lib/editor/timelineOps";
import { CanvasSize, defaultCanvasFor } from "@/lib/editor/canvasCoords";
import {
  deleteClipRange,
  deleteClipsAt,
  intersectClipsWithSpeech,
  auditCutQuality,
  keepSourceRange,
  normalizeGeneratedCuts,
  protectSpokenWordEdges,
  snapSpeechToWords,
} from "@/lib/editor/clipFilter";
import { edlToSubs, edlToSubsWithScript, parseSrt, Sub, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { loadAudioAnalysis, type AudioAnalysis } from "@/lib/audio/source";
import { describeCalibration, planScriptCut, planSilenceTighten, type Pacing, type ScriptCutPlan } from "@/lib/cut/scriptPlan";
import { buildCaptionCues, CAPTION_POLICY, auditCaptions } from "@/lib/captions/segment";
import { captionTokensFromScript, captionTokensFromTranscript } from "@/lib/captions/fromScript";
import { auditEdit, formatAudit } from "@/lib/qa/editAudit";
import { classifyGap, describeEvent } from "@/lib/audio/nonSpeech";
import { computeSpectral } from "@/lib/audio/features";
import { CaptionStyle } from "@/lib/editor/captionStyle";
import {
  assembleTranscript,
  assembledDuration,
  formatTranscriptLines,
} from "@/lib/editor/assembleTranscript";
import { analyzeAudio, avgDb, findSilences } from "@/lib/audio";
import { CommandId, EditorApi, runCommand } from "@/lib/editor/commands";
import { getActiveBrandKit, brandKitPrompt, summarizeBrandKit } from "@/lib/brand/kit";
import { audioMuted, audioTrack, TrackMeta, primaryVideoTrackId, videoTracks } from "@/lib/editor/project";
import { clipTrackId, clipsOnTrack, flattenVideoTracks, moveClipAtTimeline, projectDuration } from "@/lib/editor/tracks";
import { ToolSchema } from "./types";
import { buildTimelineEnergyEvidence, buildTimelineEvidence, evidenceCounts } from "@/lib/editor/semanticTimeline";
import { colorPreset } from "@/lib/editor/colorPresets";
import { buildMicroEdl } from "@/lib/render/timelineFrame";

export interface AgentContext {
  media: MediaAsset[];
  duration: number; // משך המקור הראשי
  words: Word[] | null; // התמלול של המקור הראשי (תאימות)
  transcripts: Record<string, Word[]>; // תמלול לכל מקור לפי id (מולטי-וידאו)
  /** מטא-דאטה של תמלול שמור (ספק/מודל) — כדי לא לערבב Groq עם בקשת ElevenLabs */
  transcriptMeta?: Record<string, { provider: string; model: string }>;
  /** תמלול על ציר ה-EDL הערוך (אחרי חיתוך) — ממיפוי או מתמלול מחדש */
  assembledWords?: Word[] | null;
  /** סקריפט נקי מהפאנל / keep_by_script — מקור אמת לכתוביות */
  script?: string;
  clips: Clip[] | null;
  subs: Sub[] | null;
  overlays: Overlay[];
  tracks: TrackMeta[];
  canvas: CanvasSize;
  /** סגנון כתוביות נוכחי מהפאנל — לצריבה בפריימים מורכבים (capture_frame timeline=true) */
  captionStyle?: CaptionStyle | null;
  lastRender: Blob | null;
  /** גשר ל-CommandBus/useEditor — עדכון מיידי בעורך + Undo */
  editorApi?: EditorApi | null;
  /** מוטציה כבר נכנסה דרך EditorApi — Chat לא יבצע setProject כפול */
  _editorDirty?: boolean;
  /**
   * ערכת המותג הפעילה (נקראת מה-IndexedDB על ידי הכלים). מוזרקת בטסטים כדי
   * לא לדרוש indexedDB; בהיעדרה הכלים קוראים את הערכה הפעילה מהאחסון המקומי.
   */
  brandKit?: import("@/lib/brand/kit").BrandKit | null;
  askUser: (question: string, options: string[]) => Promise<string>;
  // תמונות שהסוכן צילם — יצורפו להודעה הבאה כדי שיוכל "לראות" אותן (בספק תומך-ראייה).
  pendingImages?: string[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

// התמלול של מקור מסוים (מהמפה, או של הראשי מ-words).
function transcriptOf(ctx: AgentContext, asset: MediaAsset): Word[] | null {
  return ctx.transcripts[asset.id] || (asset.id === mainVideo(ctx)?.id ? ctx.words : null) || null;
}

// המקור הראשי (הסרטון הראשון) — עליו מתמללים וחותכים לפי סקריפט כברירת מחדל.
const mainVideo = (ctx: AgentContext) => firstVideo(ctx.media);
// איתור מקור לפי אינדקס (1-based), id או שם. חשוב: אם הערך מספרי טהור — קודם אינדקס,
// ולא חיפוש-שם (שמות הקבצים מכילים ספרות מתאריך, אחרת "3" היה תופס שם שגוי).
function resolveAsset(ctx: AgentContext, ref: string | number): MediaAsset | undefined {
  if (typeof ref === "number") return ctx.media[ref - 1];
  const s = String(ref).replace(/^@/, "").replace(/^media:/, "").trim();
  if (/^\d+$/.test(s)) return ctx.media[parseInt(s, 10) - 1];
  const low = s.toLowerCase();
  return ctx.media.find((m) => m.id === s) || ctx.media.find((m) => m.name.toLowerCase().includes(low));
}

async function imageDimensions(asset: MediaAsset): Promise<{ width: number; height: number } | undefined> {
  if (typeof Image === "undefined" || !asset.url) return undefined;
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(undefined), 3000);
    img.onload = () => { window.clearTimeout(timer); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { window.clearTimeout(timer); resolve(undefined); };
    img.src = asset.url;
  });
}

function overlayTarget(args: any, ctx: AgentContext): { overlay: Overlay; index: number } | string {
  const overlays = ctx.overlays || [];
  const requestedId = String(args.overlay_id || "").trim();
  const index = requestedId ? overlays.findIndex((item) => item.id === requestedId) : (args.index | 0) - 1;
  const overlay = overlays[index];
  if (!overlay) return requestedId ? `שגיאה: שכבה id=${requestedId} לא נמצאה.` : "שגיאה: אינדקס שכבה לא תקין.";
  if (args.expected_source != null) {
    const expected = resolveAsset(ctx, String(args.expected_source));
    if (!expected || overlay.kind !== "image" || overlay.assetId !== expected.id) {
      const actual = overlay.kind === "image" ? mediaById(ctx.media, overlay.assetId || "")?.name || overlay.assetId : "טקסט";
      return `שגיאת הגנה: היעד הוא ${actual}, לא ${String(args.expected_source)}. לא בוצע שינוי.`;
    }
  }
  return { overlay, index };
}

export type CaptureFrameMode = "timeline" | "source";

/**
 * Decide the capture_frame frame source (pure — the only coercion in the tool).
 *
 * The composited capture is opt-in ONLY: an explicit `timeline=true`/"true"
 * (with an edited timeline present) selects it. `timeline=false`, an explicit
 * `source`, or an omitted `timeline` all stay on the cheap raw path — the
 * expensive composited render is never the silent default.
 */
export function captureFrameMode(timeline: unknown, _source: unknown, hasEditedTimeline: boolean): CaptureFrameMode {
  const wantsTimeline = timeline === true || timeline === "true";
  if (wantsTimeline) return hasEditedTimeline ? "timeline" : "source";
  return "source";
}

export type Reporter = (status: string) => void;

export type ToolArtifactKind = "video" | "srt" | "image" | "audio";

/** Binary output stays client-side and never enters LLM JSON/history. */
export interface ToolArtifact {
  blob: Blob;
  name: string;
  kind: ToolArtifactKind;
}

export interface ToolOutcome {
  text: string;
  artifacts?: ToolArtifact[];
}

export type ToolRunResult = string | ToolOutcome;

export interface ToolMeta {
  name: string;
  label: string;
  color: string;
  icon: string;
  schema: ToolSchema;
  run: (args: any, ctx: AgentContext, report: Reporter) => Promise<ToolRunResult>;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "—";
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

// --- אחסון תמלול לפי טביעת-אצבע (לא מתמללים שוב אותו סרטון) ---
type TxCache = { words: Word[]; provider: string; model: string; v: 2 };

function txKey(f: File) { return `hs_tx_${f.name}_${f.size}_${(f as any).lastModified || 0}`; }

function txRead(k: string): TxCache | null {
  try {
    const r = localStorage.getItem(k);
    if (!r) return null;
    const parsed = JSON.parse(r);
    // פורמט ישן: מערך מילים בלבד — בלי ספק, לא סומכים כשמבקשים ספק ספציפי
    if (Array.isArray(parsed)) return { words: parsed, provider: "unknown", model: "", v: 2 };
    if (parsed?.words && Array.isArray(parsed.words)) {
      return {
        words: parsed.words,
        provider: String(parsed.provider || "unknown"),
        model: String(parsed.model || ""),
        v: 2,
      };
    }
    return null;
  } catch { return null; }
}

function txWrite(k: string, words: Word[], provider: string, model: string) {
  try {
    const payload: TxCache = { words, provider, model, v: 2 };
    localStorage.setItem(k, JSON.stringify(payload));
  } catch { /* quota */ }
}

function providerMatches(cached: string, wanted: string): boolean {
  if (!wanted || wanted === "auto") return true;
  if (!cached || cached === "unknown") return false;
  return cached === wanted;
}

async function fetchTranscribeConfigured(): Promise<{ elevenlabs: boolean; groq: boolean }> {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    return {
      elevenlabs: !!cfg?.transcription?.elevenlabs,
      groq: !!cfg?.transcription?.groq,
    };
  } catch {
    return { elevenlabs: false, groq: false };
  }
}

async function resolveSttChoice(
  _providerArg?: string,
  _modelArg?: string,
): Promise<{ provider: "auto"; model: string }> {
  const configured = await fetchTranscribeConfigured();
  if (!configured.elevenlabs && !configured.groq) throw new Error("שירות התמלול המנוהל אינו זמין כרגע.");
  return { provider: "auto", model: "" };
}

function findRanges(words: Word[], query: string, max = 6) {
  const q = query.split(/\s+/).map(normalizeHebrew).filter(Boolean);
  if (!q.length) return [];
  const norm = words.map((w) => normalizeHebrew(w.text));
  const out: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < words.length && out.length < max; i++) {
    if (norm[i] !== q[0]) continue;
    let qi = 1, j = i + 1, gap = 0;
    while (qi < q.length && j < words.length && gap <= 3) { if (norm[j] === q[qi]) { qi++; gap = 0; } else gap++; j++; }
    if (qi === q.length) { out.push({ start: words[i].start, end: words[j - 1].end, text: words.slice(i, j).map((w) => w.text).join(" ") }); i = j; }
  }
  return out;
}

const requireClips = (ctx: AgentContext) => (ctx.clips && ctx.clips.length ? null : "שגיאה: אין קליפים. צור חיתוך קודם (keep_by_script / remove_segments).");
const clipsSummary = (clips: Clip[]) => `${clips.length} קליפים, משך סופי ${fmt(totalDur(clips))}.`;

// ─── ניתוח גל-קול משותף לכלי החיתוך והבקרה ───────────────────────────────

/**
 * ניתוחים שכבר חושבו בסשן, לפי מזהה מקור — כדי לא לחלץ אודיו פעמיים.
 * חסום ב-2 כי דגימות של שיעור בן עשר דקות שוקלות ~38MB; בלי החסם המפה
 * הזו הייתה מחזיקה הפניות חזקות ומבטלת את המטמון החסום של loadAudioAnalysis.
 */
const MAX_SOURCE_ANALYSES = 2;
const analysisBySource = new Map<string, AudioAnalysis>();

/**
 * מביא מעטפת + דגימות למקור. נכשל בשקט (מחזיר null) — חיתוך בלי גל-קול עדיין
 * עובד, פשוט פחות מדויק, וזה מדווח למשתמש במפורש.
 */
async function analysisFor(
  asset: MediaAsset | undefined,
  report?: Reporter,
): Promise<AudioAnalysis | null> {
  if (!asset || asset.kind === "image" || !asset.file) return null;
  const cached = analysisBySource.get(asset.id);
  if (cached) return cached;
  try {
    const analysis = await loadAudioAnalysis(asset.file, report);
    analysisBySource.set(asset.id, analysis);
    while (analysisBySource.size > MAX_SOURCE_ANALYSES) {
      const oldest = analysisBySource.keys().next().value;
      if (oldest === undefined) break;
      analysisBySource.delete(oldest);
    }
    return analysis;
  } catch {
    return null;
  }
}

const PACING_VALUES: Pacing[] = ["tight", "natural", "broadcast"];
function resolvePacing(value: unknown, fallback: Pacing = "natural"): Pacing {
  const raw = String(value ?? "").toLowerCase() as Pacing;
  return PACING_VALUES.includes(raw) ? raw : fallback;
}

/** תמצית קריאה של תוכנית חיתוך — כולל מה שלא נמצא. */
function summarizePlan(plan: ScriptCutPlan, sourceName: string, measured: boolean): string {
  const lines: string[] = [];
  lines.push(
    `נבנו ${plan.clips.length} קליפים מ-"${sourceName}" (${fmt(plan.keptSec)} מתוך ${fmt(plan.keptSec + plan.removedSec)}).`,
  );
  lines.push(
    measured
      ? `נקודות החיתוך מוקמו לפי גל-קול מדוד (${plan.boundaries.filter((b) => b.measured).length}/${plan.boundaries.length} מעברים).`
      : "אזהרה: אין ניתוח גל-קול למקור הזה — החיתוך לפי חותמות התמלול בלבד, ולכן פחות מדויק.",
  );
  if (plan.calibration) {
    lines.push(describeCalibration(plan.calibration));
    if (!plan.calibration.reliable) {
      lines.push("ההחלטות האקוסטיות נעשו בברירות מחדל שמרניות; ההגנה על גבולות המילים עדיין מובטחת.");
    }
  }
  if (plan.repairedEdges) {
    lines.push(`${plan.repairedEdges} גבולות הורחבו אוטומטית כדי לא לחתוך מילה.`);
  }
  if (plan.missingScript.length) {
    lines.push(
      `⚠ ${plan.missingScript.length} מילים מהטקסט שלך לא נמצאו בתמלול ולכן אינן בפלט: ${plan.missingScript.slice(0, 10).map((m) => m.text).join(", ")}` +
      `${plan.missingScript.length > 10 ? " …" : ""}. בדוק אם הן באמת נאמרו, או תקן את הטקסט.`,
    );
  } else {
    lines.push("כיסוי הטקסט: 100% — כל מילה שביקשת נמצאה.");
  }
  const labelled = plan.events.filter((e) => e.label !== "silence" && e.label !== "unknown_nonspeech");
  if (labelled.length) {
    const counts = new Map<string, number>();
    for (const event of labelled) counts.set(event.label, (counts.get(event.label) || 0) + 1);
    lines.push(
      `בפערים שהוסרו נמדדו: ${[...counts].map(([label, n]) => `${n}× ${label}`).join(", ")} (סיווג אקוסטי, לא ודאות).`,
    );
  }
  if (plan.removedSpeech.length) {
    lines.push(`הוסרו ${plan.removedSpeech.length} מילים שנאמרו ואינן בטקסט.`);
  }
  return lines.join("\n");
}

function syncFromEditor(ctx: AgentContext) {
  const api = ctx.editorApi;
  if (!api) return;
  ctx.clips = api.getClips();
  ctx.subs = api.getSubs();
  ctx.overlays = api.getOverlays();
  ctx.tracks = api.getTracks();
}

/** כל שינוי ב-EDL מבטל תמלול-ציר שמור — ונדחף מיד לעורך דרך EditorApi כשקיים. */
function setClips(ctx: AgentContext, clips: Clip[] | null) {
  ctx.assembledWords = null;
  const primary = primaryVideoTrackId(ctx.tracks || []);
  const tagged = clips?.map((c) => (c.trackId ? c : { ...c, trackId: primary })) ?? null;
  if (ctx.editorApi) {
    const result = runCommand("clip.replaceAll", ctx.editorApi, { clips: tagged || [] });
    if (!result.ok) throw new Error(result.error);
    syncFromEditor(ctx);
    ctx._editorDirty = true;
  } else {
    ctx.clips = tagged;
  }
}

function setSubs(ctx: AgentContext, subtitles: Sub[]) {
  if (ctx.editorApi) {
    const result = runCommand("subtitle.replaceAll", ctx.editorApi, { subtitles });
    if (!result.ok) throw new Error(result.error);
    syncFromEditor(ctx);
    ctx._editorDirty = true;
  } else {
    ctx.subs = subtitles;
  }
}

function setTracks(ctx: AgentContext, tracks: TrackMeta[]) {
  if (ctx.editorApi) {
    ctx.editorApi.setTracks(tracks);
    syncFromEditor(ctx);
    ctx._editorDirty = true;
  } else {
    ctx.tracks = tracks;
  }
}

/** מריץ פקודת CommandBus ומסנכרן את ה-ctx. מחזיר הודעת שגיאה או null בהצלחה. */
function dispatch(ctx: AgentContext, id: CommandId, args?: Record<string, unknown>): string | null {
  if (!ctx.editorApi) return "NO_API";
  const r = runCommand(id, ctx.editorApi, args);
  if (!r.ok) return r.error;
  syncFromEditor(ctx);
  ctx._editorDirty = true;
  ctx.assembledWords = null;
  return null;
}

function ensureTrackId(ctx: AgentContext, clip: Clip): Clip {
  const primary = primaryVideoTrackId(ctx.tracks || []);
  return clip.trackId ? clip : { ...clip, trackId: primary };
}

export interface RegisteredMedia {
  asset: MediaAsset;
  /** true אם נעשה שימוש חוזר בנכס קיים (לפי id או שם+גודל) — בלי ייבוא כפול */
  reused: boolean;
}

/**
 * רושם MediaAsset שנוצר (קריינות/תמונה) בפרויקט דרך גבול המדיה של הדפדפן.
 * - אם editorApi.addMediaAsset קיים: קורא לו ואז מסנכרן את ctx.media מ-api.getMedia()
 *   (הגבול בונה אוסף חדש — לעולם לא דוחפים לתוך מערך state).
 * - אחרת: fallback אימוטאבילי ctx.media = [...ctx.media, asset].
 * - מניעת כפילות: לפי id, ואם הגיוני — לפי אותו שם קובץ וגודל.
 * - לעולם לא ממוטט מערכים.
 */
export function registerMediaAsset(ctx: AgentContext, asset: MediaAsset): RegisteredMedia {
  const existing =
    ctx.media.find((m) => m.id === asset.id) ??
    (asset.file
      ? ctx.media.find((m) => m.kind === asset.kind && m.name === asset.name && m.file && m.file.size === asset.file.size)
      : undefined);
  if (existing) return { asset: existing, reused: true };
  const api = ctx.editorApi;
  if (api?.addMediaAsset) {
    api.addMediaAsset(asset);
    ctx.media = api.getMedia() ?? [...ctx.media, asset];
  } else {
    ctx.media = [...ctx.media, asset];
  }
  return { asset, reused: false };
}

export interface NarrationResultInfo {
  asset: MediaAsset;
  blobSize: number;
  modelId: string;
  voiceId: string;
  /** הזמן המדויק המוצע על הציר (סוף הציר הנוכחי) — להנחיית add_clip */
  timelineStart: number;
  /** שם/id רצועת האודיו — להנחיית add_clip */
  audioTrackName: string;
}

/** פורמט תוצאת generate_narration — פונקציה טהורה (ניתנת לבדיקה בלי רשת). */
export function formatNarrationResult(info: NarrationResultInfo): string {
  const { asset, blobSize, modelId, voiceId, timelineStart, audioTrackName } = info;
  const kb = (blobSize / 1024).toFixed(0);
  return (
    `נוצרה קריינות (${kb}KB, מודל ${modelId}, voice=${voiceId}) ונשמרה במדיה כפריט @media:${asset.id} (${asset.name}, ${asset.duration.toFixed(1)}s). ` +
    `הוסף אותה לציר: add_clip(source="@media:${asset.id}", timeline_start=${timelineStart.toFixed(3)}, track="${audioTrackName}") — ` +
    `ואז צרף תמונת/כרטיס סיום בדיוק לטווח הקליפ (match_clip_id מ-list_clips).`
  );
}

// ─── generate_image: בריף מותג מוגבל (טקסט בלבד) ──────────────────────────────

/** בריף מותג קצר שנשלח למודל התמונה — ארגון/סלוגן/צבעים/ניסוח בלבד. */
export interface ImageBrandBrief {
  organization: string;
  tagline?: string;
  colors: string[];
  writingGuidelines: string;
}

/** בונה בריף מותג מוגבל — לעולם לא כולל Blob/URL/תוכן או id של נכסים. */
export function buildImageBrandBrief(kit: import("@/lib/brand/kit").BrandKit): ImageBrandBrief {
  return {
    organization: kit.organization,
    ...(kit.tagline ? { tagline: kit.tagline } : {}),
    colors: [...kit.colors],
    writingGuidelines: kit.writingGuidelines,
  };
}

/**
 * בונה את ה-prompt הסופי למודל התמונה. use_brand=false או היעדר ערכה → ה-prompt
 * המקורי בלבד. עם ערכה פעילה מצורף בריף מותג מוגבל (טקסט בלבד) + הוראה מפורשת
 * לא לצייר לוגו (ללוגו אמיתי ישמש use_brand_asset).
 */
export function buildImagePrompt(
  prompt: string,
  kit: import("@/lib/brand/kit").BrandKit | null | undefined,
  useBrand: boolean,
): string {
  const base = String(prompt || "").trim();
  if (!useBrand || !kit) return base;
  const brief = buildImageBrandBrief(kit);
  const lines = [
    base,
    "",
    "הנחיות מותג (לשילוב בעיצוב בלבד):",
    `ארגון: ${brief.organization}`,
  ];
  if (brief.tagline) lines.push(`סלוגן: ${brief.tagline}`);
  if (brief.colors.length) lines.push(`פלטת צבעים: ${brief.colors.join(" · ")}`);
  if (brief.writingGuidelines.trim()) lines.push(`הנחיות ניסוח:\n${brief.writingGuidelines.trim()}`);
  lines.push(
    "אל תצייר/תמציא לוגו או טקסט לוגו אלא אם המשתמש ביקש במפורש טקסט/לוגו; ללוגו אמיתי ישמש נכס המותג (use_brand_asset).",
  );
  return lines.join("\n");
}

export interface ImageResultInfo {
  asset: MediaAsset;
  model: string;
  size: string;
}

/** פורמט תוצאת generate_image — פונקציה טהורה (ניתנת לבדיקה בלי רשת). */
export function formatImageResult(info: ImageResultInfo): string {
  const { asset, model, size } = info;
  return (
    `נוצרה תמונה (${model}, ${size}) ונשמרה במדיה כפריט @media:${asset.id} (${asset.name}). ` +
    `הוסף אותה כשכבת תמונה/כרטיס סיום: add_image_overlay(source="@media:${asset.id}", preset="fit_canvas", match_clip_id=ID של קליפ הקריינות, locked=true) — ` +
    `או כתמונה מלאה על הציר: add_clip(source="@media:${asset.id}", placement="timeline", timeline_start=...).`
  );
}

export const TOOLS: ToolMeta[] = [
  {
    name: "get_video_info", label: "בדיקת אורך", color: "#3b82f6", icon: "⏱️",
    schema: { name: "get_video_info", description: "מחזיר את אורך הסרטון הראשי בשניות.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => { const m = mainVideo(ctx); return m ? `אורך "${m.name}": ${m.duration.toFixed(2)}s.` : "שגיאה: לא נטען סרטון."; },
  },
  {
    name: "list_media", label: "רשימת מדיה", color: "#64748b", icon: "🗂️",
    schema: { name: "list_media", description: "מחזיר את כל קבצי המדיה שנטענו (אינדקס 1-based, שם, סוג, משך).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => ctx.media.length ? ctx.media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s)`).join("\n") : "אין מדיה טעונה.",
  },
  {
    name: "rename_media", label: "שינוי שם מדיה", color: "#64748b", icon: "✏️",
    schema: {
      name: "rename_media",
      description: "משנה את שם קובץ המדיה לפי הקשר (למשל קריינות/שמע). source=שם או אינדקס 1-based, name=שם חדש כולל סיומת.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "שם נוכחי או אינדקס" },
          name: { type: "string", description: "שם חדש (למשל קריינות_פתיחה.mp3)" },
        },
        required: ["source", "name"],
      },
    },
    run: async (a, ctx) => {
      const src = String(a.source || "").trim();
      let name = String(a.name || "").trim();
      if (!src || !name) return "שגיאה: חסרים source או name.";
      const idx = /^\d+$/.test(src) ? Math.max(0, parseInt(src, 10) - 1) : ctx.media.findIndex((m) => m.name === src || m.name.includes(src));
      if (idx < 0 || idx >= ctx.media.length) return `שגיאה: לא נמצא מקור "${src}".`;
      if (!/\.[a-z0-9]+$/i.test(name)) {
        const old = ctx.media[idx].name;
        const ext = old.includes(".") ? old.slice(old.lastIndexOf(".")) : "";
        name += ext;
      }
      ctx.media[idx] = { ...ctx.media[idx], name };
      return `שם המדיה עודכן ל-"${name}".`;
    },
  },
  {
    name: "transcribe_video", label: "תמלול הסרטון", color: "#8b5cf6", icon: "📝",
    schema: {
      name: "transcribe_video",
      description:
        "מתמלל סרטון ובונה מפת נקודות-ציון (מילים+זמנים). ספקים: elevenlabs (Scribe — מומלץ, בתשלום; אירועי שמע/צחוק/דוברים) או groq (Whisper). " +
        "אפשר לבחור model במפורש (למשל scribe_v2 / whisper-large-v3). אם יש כמה סרטונים — תמלל כל אחד (עם source).",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "שם/אינדקס הסרטון לתמלול (ברירת מחדל: הראשי)" },
          provider: { type: "string", description: "elevenlabs | groq | auto (ברירת מחדל לפי הגדרות)" },
          model: { type: "string", description: "מודל תמלול (למשל scribe_v2 / scribe_v1 / whisper-large-v3)" },
          force: { type: "boolean", description: "true=התעלם מתמלול שמור ותמלל מחדש" },
          tag_audio_events: { type: "boolean", description: "ElevenLabs: סמן צחוק/מוזיקה וכו' (ברירת מחדל true)" },
          diarize: { type: "boolean", description: "ElevenLabs: הפרדת דוברים (ברירת מחדל true)" },
          num_speakers: { type: "number", description: "ElevenLabs: מספר דוברים ידוע (משפר הפרדה)" },
          keyterms: { type: "string", description: "ElevenLabs: מונחים חשובים מופרדים בפסיק (שמות/מונחים תורניים)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "שגיאה: לא נמצא סרטון לתמלול.";

      const { provider, model } = await resolveSttChoice(a.provider, a.model);
      const wantsSpecific = false;

      // אם המשתמש ביקש ספק ספציפי — לא מחזירים תמלול ישן מספק אחר
      if (!a.force && ctx.transcripts[asset.id]) {
        const meta = ctx.transcriptMeta?.[asset.id];
        if (!wantsSpecific || (meta && providerMatches(meta.provider, provider))) {
          const n = ctx.transcripts[asset.id].filter(isSpeechWord).length;
          return `"${asset.name}" כבר תומלל: ${n} מילים. לתמלול מחדש השתמש ב-force=true.`;
        }
      }
      const isMain = asset.id === mainVideo(ctx)?.id;
      const key = txKey(asset.file);
      if (!a.force) {
        const cached = txRead(key);
        if (cached && (!wantsSpecific || providerMatches(cached.provider, provider))) {
          ctx.transcripts[asset.id] = cached.words;
          if (!ctx.transcriptMeta) ctx.transcriptMeta = {};
          ctx.transcriptMeta[asset.id] = { provider: cached.provider, model: cached.model };
          if (isMain) { ctx.words = cached.words; if (!ctx.duration) ctx.duration = asset.duration; }
          return `נטען תמלול שמור ל-"${asset.name}" (${cached.words.filter(isSpeechWord).length} מילים).`;
        }
      }
      try { await import("@/lib/ffmpeg"); }
      catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) ואז הרץ תמלול שוב. אל תנסה שוב בלי רענון."); }

      report(`מתמלל ${asset.name} במנוע האיכותי…`);
      let transcribeMediaFile: typeof import("@/lib/transcribe/client").transcribeMediaFile;
      try { ({ transcribeMediaFile } = await import("@/lib/transcribe/client")); }
      catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) ואז הרץ תמלול שוב."); }

      const formExtras: Record<string, string> = {};
      if (a.tag_audio_events === false) formExtras.tag_audio_events = "false";
      if (a.diarize === false) formExtras.diarize = "false";
      if (a.num_speakers != null) formExtras.num_speakers = String(a.num_speakers);
      if (a.keyterms) formExtras.keyterms = String(a.keyterms);
      const words = await transcribeMediaFile({
        file: asset.file,
        durationSec: asset.duration || 0,
        provider,
        model,
        formExtras,
        onPhase: (msg) => report(msg),
      });
      ctx.transcripts[asset.id] = words;
      if (!ctx.transcriptMeta) ctx.transcriptMeta = {};
      ctx.transcriptMeta[asset.id] = { provider, model };
      if (isMain) { ctx.words = words; if (!ctx.duration) ctx.duration = asset.duration; }
      txWrite(key, words, provider, model);
      const speech = words.filter(isSpeechWord).length;
      const events = words.filter((w) => w.type === "audio_event").length;
      const speakers = new Set(words.map((w) => w.speakerId).filter(Boolean));
      const extras = [
        events ? `${events} אירועי-שמע` : "",
        speakers.size ? `${speakers.size} דוברים` : "",
      ].filter(Boolean).join(", ");
      return `תומלל "${asset.name}" במנוע המנוהל: ${speech} מילים${extras ? ` (+ ${extras})` : ""} (נשמר).`;
    },
  },
  {
    name: "find_in_transcript", label: "איתור בתמלול", color: "#14b8a6", icon: "🔍",
    schema: {
      name: "find_in_transcript",
      description:
        "מאתר היכן טקסט נאמר. ברירת מחדל: זמנים במקור. עם timeline=true — על הציר הערוך (אחרי חיתוך).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          source: { type: "string", description: "סרטון המקור (ברירת מחדל הראשי; לא רלוונטי עם timeline)" },
          timeline: { type: "boolean", description: "true=חיפוש על הציר הערוך (assembled)" },
        },
        required: ["query"],
      },
    },
    run: async (a, ctx) => {
      const onTimeline = a.timeline === true || a.timeline === "true";
      if (onTimeline) {
        if (!ctx.clips?.length) return "אין ציר ערוך. חתוך קודם או השתמש בלי timeline.";
        const words = ctx.assembledWords?.length
          ? ctx.assembledWords
          : assembleTranscript(ctx.clips, (sid) => ctx.transcripts[sid] ?? (sid === mainVideo(ctx)?.id ? ctx.words : null));
        if (!words.length) return "אין תמלול למקורות שבציר. תמלל קודם (transcribe_video).";
        const r = findRanges(words, String(a.query || ""));
        return r.length
          ? "נמצא על הציר הערוך:\n" + r.map((x) => `• ${x.start.toFixed(2)}–${x.end.toFixed(2)}s: "${x.text}"`).join("\n")
          : `לא נמצא "${a.query}" על הציר הערוך.`;
      }
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "שגיאה: אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}".`;
      const r = findRanges(words, String(a.query || ""));
      return r.length ? "נמצא במקור:\n" + r.map((x) => `• ${x.start.toFixed(2)}–${x.end.toFixed(2)}s: "${x.text}"`).join("\n") : `לא נמצא "${a.query}".`;
    },
  },
  {
    name: "inspect_timeline_evidence", label: "ראיות בציר הזמן", color: "#0f766e", icon: "🔎",
    schema: {
      name: "inspect_timeline_evidence",
      description:
        "מחזיר ראיות לפי טווח זמן: דיבור מתמלול, אירועים שספק התמלול סימן, ופערי עריכה. " +
        "עם classify_sounds=true מסווג גם את הצלילים בפערים לפי מאפיינים אקוסטיים נמדדים " +
        "(נשימה / כחכוח / חבטה-גרירת רהיט / צחוק / שקט), עם דרגת ביטחון. סיווג שאין לו די ראיות מסומן 'לא ידוע' ולא מנוחש.",
      parameters: {
        type: "object",
        properties: {
          include_energy: { type: "boolean", description: "true=נתח גם RMS/dBFS מקומי" },
          classify_sounds: { type: "boolean", description: "true=סווג את הצלילים שאינם דיבור בפערים שבמקור" },
          source: { type: "string", description: "סרטון לסיווג צלילים (ברירת מחדל הראשי)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      if (!ctx.clips?.length) return "אין ציר ערוך לניתוח.";
      const main = mainVideo(ctx);
      const directSpans = buildTimelineEvidence(
        ctx.clips,
        (sourceId) => ctx.transcripts[sourceId] ?? (sourceId === main?.id ? ctx.words : null),
      );
      let energySpans: ReturnType<typeof buildTimelineEnergyEvidence> = [];
      const includeEnergy = a.include_energy === true || a.include_energy === "true";
      if (includeEnergy) {
        report("מודד אנרגיית RMS בציר…");
        const profiles = new Map<string, Awaited<ReturnType<typeof analyzeAudio>>>();
        const sourceIds = [...new Set(ctx.clips.map((clip) => clip.sourceId))];
        for (const sourceId of sourceIds) {
          const asset = mediaById(ctx.media, sourceId);
          if (!asset || asset.kind === "image" || !asset.file) continue;
          try { profiles.set(sourceId, await analyzeAudio(asset.file)); }
          catch { /* source remains without measured energy evidence */ }
        }
        energySpans = buildTimelineEnergyEvidence(ctx.clips, (sourceId) => profiles.get(sourceId));
      }
      const spans = [...directSpans, ...energySpans]
        .sort((left, right) => left.start - right.start || left.end - right.end || left.kind.localeCompare(right.kind));
      const counts = evidenceCounts(spans);
      const lines = spans.slice(0, 80).map((span) => {
        const range = `${span.start.toFixed(2)}–${span.end.toFixed(2)}s`;
        if (span.kind === "speech") return `• ${range} דיבור מתמלול: ${span.text || ""}`;
        if (span.kind === "audio_event") return `• ${range} אירוע שסומן במפורש בידי ספק התמלול: ${span.text || "ללא תווית"}`;
        if (span.kind === "gap") return `• ${range} פער עריכה מפורש`;
        return `• ${range} אנרגיה ${span.energyLevel === "low" ? "נמוכה יחסית" : "מוגברת"}: ${(span.db ?? 0).toFixed(1)}dBFS (רצפה ${(span.floorDb ?? 0).toFixed(1)}dBFS)`;
      });
      // סיווג אקוסטי של הפערים בזמן-מקור — מה שספק התמלול לא סימן
      let soundLines: string[] = [];
      if (a.classify_sounds === true || a.classify_sounds === "true") {
        const asset = a.source ? resolveAsset(ctx, a.source) : main;
        const words = asset ? transcriptOf(ctx, asset) : null;
        if (!asset || !words) {
          soundLines = ["סיווג צלילים דורש מקור מתומלל."];
        } else {
          report("מסווג צלילים שאינם דיבור…");
          const analysis = await analysisFor(asset, report);
          if (!analysis) {
            soundLines = ["לא ניתן לנתח את גל-הקול של המקור — אין סיווג צלילים."];
          } else {
            const speech = words.filter(isSpeechWord).sort((x, y) => x.start - y.start);
            const gaps: Array<[number, number]> = [];
            let previous = 0;
            for (const word of speech) {
              if (word.start - previous >= 0.12) gaps.push([previous, word.start]);
              previous = Math.max(previous, word.end);
            }
            if (asset.duration - previous >= 0.12) gaps.push([previous, asset.duration]);
            const classified = gaps.slice(0, 60).map(([from, to]) =>
              classifyGap(analysis.envelope, from, to, computeSpectral(analysis.samples, analysis.sampleRate, from, to)));
            const interesting = classified.filter((event) => event.label !== "silence");
            soundLines = [
              `סיווג ${gaps.length} פערים בזמן-מקור (${interesting.length} אינם שקט מלא):`,
              ...interesting.slice(0, 30).map((event) => `• ${describeEvent(event)}`),
            ];
          }
        }
      }

      return `ראיות בציר: ${counts.speech} מקטעי דיבור, ${counts.audio_event} אירועי ספק, ${counts.gap} פערי עריכה` +
        (includeEnergy ? `, ${counts.energy} מקטעי אנרגיה מדודים` : "") +
        `.\n${lines.join("\n") || "אין ראיות זמינות."}` +
        (soundLines.length ? `\n\n${soundLines.join("\n")}` : "") +
        "\nהבהרה: תווית ספק היא ראיה ישירה; סיווג אקוסטי הוא הסתברותי ומצוין עם ביטחון. היעדר תמלול אינו מוכיח שקט.";
    },
  },
  {
    name: "get_transcript", label: "קריאת תמלול", color: "#14b8a6", icon: "📄",
    schema: {
      name: "get_transcript",
      description:
        "מחזיר תמלול עם חותמות זמן. " +
        "timeline=true (מומלץ אחרי חיתוך): זמנים על הציר הערוך — הסדר והזמנים כמו בנגן. " +
        "בלי timeline: תמלול המקור הגולמי (לפני חיתוך).",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "סרטון מקור (רק כשלא timeline)" },
          timeline: { type: "boolean", description: "true=ציר ערוך אחרי חיתוך (ברירת מחדל true אם יש קליפים)" },
        },
      },
    },
    run: async (a, ctx) => {
      const hasClips = !!ctx.clips?.length;
      const onTimeline = a.timeline === true || a.timeline === "true"
        || (a.timeline == null && hasClips && !a.source);

      if (onTimeline) {
        if (!hasClips) return "אין ציר ערוך. תמלל מקור או בנה קליפים קודם.";
        const getWords = (sid: string) => ctx.transcripts[sid] ?? (sid === mainVideo(ctx)?.id ? ctx.words : null);
        const words = ctx.assembledWords?.length
          ? ctx.assembledWords
          : assembleTranscript(ctx.clips!, getWords);
        if (!words.length) {
          return "אין מילים על הציר הערוך — תמלל את המקורות (transcribe_video) ואז קרא שוב עם timeline=true, או הרץ transcribe_timeline.";
        }
        // שמירה לשימוש חוזר בלי לחשב שוב
        if (!ctx.assembledWords?.length) ctx.assembledWords = words;
        const events = words.filter((w) => w.type === "audio_event");
        const speech = words.filter(isSpeechWord);
        const lines = formatTranscriptLines(words);
        const eventLines = events.slice(0, 40).map((e) => `• ${e.start.toFixed(1)}–${e.end.toFixed(1)}s ${e.text}`);
        const dur = assembledDuration(ctx.clips!);
        return `תמלול על הציר הערוך (${speech.length} מילים, משך ${dur.toFixed(1)}s) — זמנים כמו בנגן:\n${lines}` +
          (eventLines.length ? `\n\nאירועי שמע:\n${eventLines.join("\n")}` : "") +
          `\n\n(לרענון אחרי חיתוך נוסף: transcribe_timeline. לתמלול API מחדש על האודיו הערוך: mode=retranscribe)`;
      }

      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `"${asset.name}" עדיין לא תומלל.`;
      const events = words.filter((w) => w.type === "audio_event");
      const speech = words.filter(isSpeechWord);
      const lines = formatTranscriptLines(words);
      const eventLines = events.slice(0, 40).map((e) => `• ${e.start.toFixed(1)}–${e.end.toFixed(1)}s ${e.text}${e.speakerId ? ` (${e.speakerId})` : ""}`);
      return `תמלול מקור "${asset.name}" (${speech.length} מילים, זמנים במקור):\n${lines}` +
        (eventLines.length ? `\n\nאירועי שמע (${events.length}):\n${eventLines.join("\n")}` : "") +
        (hasClips ? `\n\nטיפ: אחרי חיתוך השתמש ב-get_transcript(timeline=true) או transcribe_timeline לקבלת הסדר העדכני.` : "");
    },
  },
  {
    name: "transcribe_timeline", label: "תמלול הציר הערוך", color: "#8b5cf6", icon: "🗺️",
    schema: {
      name: "transcribe_timeline",
      description:
        "בונה תמלול על הציר הערוך אחרי חיתוך/סידור. " +
        "mode=remap (ברירת מחדל, חינמי ומיידי): ממפה את תמלולי המקור לזמנים החדשים. " +
        "mode=retranscribe: יוצר אודיו זמני מהעריכה ושולח ל-STT (ElevenLabs/Groq) — מדויק יותר אחרי הרכבה מורכבת, בתשלום.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", description: "remap | retranscribe" },
          provider: { type: "string", description: "רק ל-retranscribe: elevenlabs | groq | auto" },
          model: { type: "string", description: "רק ל-retranscribe: מודל STT" },
        },
      },
    },
    run: async (a, ctx, report) => {
      if (!ctx.clips?.length) return "שגיאה: אין קליפים. חתוך/בנה ציר קודם.";
      const mode = String(a.mode || "remap").toLowerCase() === "retranscribe" ? "retranscribe" : "remap";
      const getWords = (sid: string) => ctx.transcripts[sid] ?? (sid === mainVideo(ctx)?.id ? ctx.words : null);

      if (mode === "remap") {
        report("ממפה תמלול לציר הערוך…");
        const words = assembleTranscript(ctx.clips, getWords);
        if (!words.length) {
          return "אין תמלול מקורות למיפוי. תמלל קודם (transcribe_video) או השתמש ב-mode=retranscribe.";
        }
        ctx.assembledWords = words;
        const n = words.filter(isSpeechWord).length;
        const dur = assembledDuration(ctx.clips);
        return `מופה תמלול לציר הערוך: ${n} מילים, משך ${dur.toFixed(1)}s (בלי תמלול API). קרא עם get_transcript(timeline=true).`;
      }

      // retranscribe: אודיו זמני מה-EDL → STT
      try { await import("@/lib/ffmpeg"); }
      catch { throw new Error("נפרסה גרסה חדשה — רענן את הדף (Ctrl+Shift+R) ואז נסה שוב."); }

      const { provider, model } = await resolveSttChoice(a.provider, a.model);
      report(`בונה אודיו זמני מהעריכה…`);
      let extractAssembledAudio: typeof import("@/lib/ffmpeg").extractAssembledAudio;
      let transcribeMediaFile: typeof import("@/lib/transcribe/client").transcribeMediaFile;
      try {
        ({ extractAssembledAudio } = await import("@/lib/ffmpeg"));
        ({ transcribeMediaFile } = await import("@/lib/transcribe/client"));
      } catch {
        throw new Error("נפרסה גרסה חדשה — רענן את הדף (Ctrl+Shift+R) ואז נסה שוב.");
      }

      const { blob, durationSec } = await extractAssembledAudio(ctx.media, ctx.clips, () => {});
      const file = new File([blob], "edited_timeline.mp3", { type: "audio/mpeg" });
      report("מתמלל את האודיו הערוך במנוע האיכותי…");
      const words = await transcribeMediaFile({
        file,
        durationSec,
        provider,
        model,
        onPhase: (msg) => report(msg),
      });
      ctx.assembledWords = words;
      const n = words.filter(isSpeechWord).length;
      return {
        text: `תומלל הציר הערוך מחדש: ${n} מילים על ${durationSec.toFixed(1)}s. האודיו הזמני זמין להורדה בצ'אט. קרא עם get_transcript(timeline=true).`,
        artifacts: [{ blob, name: "edited_timeline.mp3", kind: "audio" }],
      };
    },
  },
  {
    name: "analyze_audio", label: "ניתוח אודיו", color: "#0891b2", icon: "🔊",
    schema: { name: "analyze_audio", description: "מודד עוצמת סאונד (dB) ברווחים בין מילים ומציג ראיית אנרגיה: שקט יחסי מול עוצמה גבוהה יותר. המדידה אינה מזהה נשימה, שיעול או סוג רעש.", parameters: { type: "object", properties: { source: { type: "string", description: "סרטון (ברירת מחדל הראשי)" } } } },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}".`;
      report("מנתח עוצמת סאונד…");
      const prof = await analyzeAudio(asset.file);
      const gaps: Array<[number, number]> = [];
      let prev = 0;
      for (const w of words) { if (w.start - prev > 0.25) gaps.push([prev, w.start]); prev = w.end; }
      if (asset.duration - prev > 0.25) gaps.push([prev, asset.duration]);
      const quiet = prof.floorDb + 6;
      const lines = gaps.slice(0, 40).map(([s, e]) => {
        const d = avgDb(prof, s, e);
        return `• ${s.toFixed(1)}–${e.toFixed(1)}s (${(e - s).toFixed(1)}s): ${d < quiet ? "עוצמה נמוכה יחסית" : "עוצמה גבוהה מרצפת הרעש"} [${d.toFixed(0)}dB]`;
      });
      return `ניתוח עוצמה "${asset.name}" (רצפת רעש ${prof.floorDb.toFixed(0)}dB, שיא ${prof.peakDb.toFixed(0)}dB):\n${lines.join("\n")}\n(זו ראיית אנרגיה בלבד, לא זיהוי סמנטי של נשימה/שיעול/רעש. השתמש ב-remove_silence לחיתוך לפי סף עוצמה.)`;
    },
  },
  {
    name: "remove_silence", label: "הידוק דיבור", color: "#f59e0b", icon: "🤫",
    schema: {
      name: "remove_silence",
      description:
        "מהדק שקטים בלי לשנות את התוכן — כל הדיבור נשמר. נקודות החיתוך ממוקמות בעמק השקט המדוד בגל-הקול, " +
        "וצלילים שאינם דיבור (נשימה, כחכוח, חבטה) מסווגים לפי מאפיינים אקוסטיים לפני שמוסרים אותם. " +
        "אחרי keep_by_script בדרך כלל אין צורך — ההידוק כבר קרה שם; השתמש בזה רק כשאין טקסט מוגדר או להידוק נוסף.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string" },
          pacing: {
            type: "string",
            enum: ["tight", "natural", "broadcast"],
            description: "tight=פרסומת (0.16s); natural=ברירת מחדל (0.42s); broadcast=דרשה, שומר פאוזה רטורית (0.85s)",
          },
          threshold_db: { type: "number", description: "רק ל-fallback ללא תמלול: סף עוצמה (dB)" },
          min_silence: { type: "number", description: "עוקף את הפאוזה של ה-pacing" },
          padding: { type: "number", description: "אוויר בכל צד (ברירת מחדל לפי pacing)" },
          remove_fillers: { type: "boolean", description: "מסיר אה/אמ/יעני (ברירת מחדל true)" },
          keep_laughter: { type: "boolean", description: "השאר צחוק קהל (ברירת מחדל true)" },
          within_existing: { type: "boolean", description: "true=חתוך רק בתוך הקליפים הקיימים (ברירת מחדל כשיש EDL)" },
          replace_all: { type: "boolean", description: "true=החלף את כל ה-EDL (זהיר — מוחק בחירה קודמת)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "אין סרטון.";
      const dur = asset.duration;
      const words = transcriptOf(ctx, asset);
      const pacing = resolvePacing(a.pacing, "natural");
      const minSilence = a.min_silence != null ? +a.min_silence : null;
      const padding = a.padding != null ? +a.padding : null;
      let speech: Clip[];
      let method: string;
      let thr: number | null = null;
      if (words?.length) {
        const analysis = await analysisFor(asset, report);
        report(`מודד גל-קול וממקם חיתוכים (${pacing})…`);
        const plan = planSilenceTighten(words, {
          sourceId: asset.id,
          duration: dur,
          pacing,
          envelope: analysis?.envelope ?? null,
          samples: analysis?.samples ?? null,
          sampleRate: analysis?.sampleRate,
          removeFillers: a.remove_fillers !== false,
          keepLaughter: a.keep_laughter !== false,
          boundary: padding != null ? { preRollSec: padding, postRollSec: padding } : undefined,
          ...(minSilence != null ? { maxInternalPauseOverride: minSilence } : {}),
        });
        speech = plan.clips;
        const labelled = plan.events.filter((e) => e.label !== "silence" && e.label !== "unknown_nonspeech");
        method = `גל-קול מדוד/${pacing}`
          + (analysis ? "" : " (בלי מדידה — חותמות תמלול בלבד)")
          + (labelled.length ? `, ${labelled.length} צלילים לא-דיבוריים מסווגים` : "");
      } else {
        report("אין תמלול — מנתח עוצמת סאונד בזהירות…");
        const prof = await analyzeAudio(asset.file);
        thr = a.threshold_db != null ? +a.threshold_db : prof.floorDb + 8;
        const sil = findSilences(prof, thr, Math.max(0.25, minSilence ?? 0.4));
        const raw: Array<[number, number]> = [];
        let prev = 0;
        for (const [s, e] of sil) { if (s - prev > 0.05) raw.push([prev, s]); prev = e; }
        if (dur - prev > 0.05) raw.push([prev, dur]);
        speech = raw.map(([start, end]) => ({ id: uid(), sourceId: asset.id, start, end }));
        speech = snapSpeechToWords(speech, null, { maxSnapSec: 0.5, padSec: padding ?? 0.08 });
        method = `עוצמה ${thr.toFixed(0)}dB (fallback)`;
      }
      speech = normalizeGeneratedCuts(speech.map((clip) => ({
        ...clip,
        start: Math.max(0, clip.start),
        end: Math.min(dur, clip.end),
      })));
      if (!speech.length) return "לא זוהו קטעי דיבור לשמירה.";
      const hasEdl = !!(ctx.clips && ctx.clips.length);
      const replaceAll = a.replace_all === true;
      // כשיש EDL — תמיד within אלא אם replace_all=true במפורש
      const within = !replaceAll && (a.within_existing === true || (hasEdl && a.within_existing !== false));
      let merged: Clip[];
      if (within && hasEdl) {
        merged = intersectClipsWithSpeech(ctx.clips!, speech, asset.id);
        merged = protectSpokenWordEdges(merged, words || [], asset.id, 0.02);
        merged = normalizeGeneratedCuts(merged);
        if (!merged.length) return "לא נשאר דיבור בתוך הקליפים הקיימים. בדוק טווחים או הרץ עם replace_all=true בזהירות.";
        const qa = auditCutQuality(merged, words || [], asset.id);
        if (qa.repeatedSourceSec > 1e-6 || qa.invalidClips || qa.clippedWords.length) {
          throw new Error(`בדיקת איכות החיתוך נכשלה: חזרה ${qa.repeatedSourceSec.toFixed(3)}s, מילים חתוכות ${qa.clippedWords.length}, קליפים לא תקינים ${qa.invalidClips}.`);
        }
        setClips(ctx, merged);
        return `הודק הדיבור *בתוך הבחירה הקיימת* ב-"${asset.name}" (${method}). QA: אפס חפיפת מקור, אפס מילים חתוכות. ${clipsSummary(merged)}`;
      }
      merged = speech;
      const qa = auditCutQuality(merged, words || [], asset.id);
      if (qa.repeatedSourceSec > 1e-6 || qa.invalidClips || qa.clippedWords.length) {
        throw new Error(`בדיקת איכות החיתוך נכשלה: חזרה ${qa.repeatedSourceSec.toFixed(3)}s, מילים חתוכות ${qa.clippedWords.length}, קליפים לא תקינים ${qa.invalidClips}.`);
      }
      setClips(ctx, merged);
      const removed = dur - merged.reduce((s, k) => s + (k.end - k.start), 0);
      const warn = hasEdl && replaceAll ? " (הוחלף EDL קודם — replace_all)" : "";
      return `הודק הדיבור ב-"${asset.name}" (${method}): ${merged.length} קטעים, הוסרו ${removed.toFixed(1)}s. QA: אפס חפיפת מקור, אפס מילים חתוכות.${warn} ${clipsSummary(merged)}`;
    },
  },
  {
    name: "capture_frame", label: "צילום פריים", color: "#06b6d4", icon: "📸",
    schema: {
      name: "capture_frame",
      description:
        "מצלם פריים בשנייה מדויקת — כדי לבדוק איך נראה הווידאו בנקודה מסוימת. " +
        "בלי timeline (ברירת מחדל): פריים גולמי מהמקור, מהר. " +
        "timeline=true: פריים מורכב מהציר הערוך — בדיוק מה שייראה בייצוא באותו רגע (כולל cutaway, אובריי וכתוביות פעילים, לפי סגנון הכתוביות הנוכחי); איטי יותר, כי מרנדר מיקרו-קטע. " +
        "כדי לאמת את הפלט הערוך בפועל (אחרי שינויי מיקום/סגנון) — העבר timeline=true. התמונה מוצגת בצ'אט, ואם הספק תומך בראייה — תוכל לנתח אותה בתור הבא.",
      parameters: { type: "object", properties: { at_seconds: { type: "number", description: "השנייה לצילום" }, source: { type: "string", description: "סרטון מקור (אופציונלי, לצילום גולמי)" }, timeline: { type: "boolean", description: "true = השנייה על הציר הערוך (assembled) — פריים מורכב כמו בייצוא. מושמט/false (ברירת מחדל) = פריים גולמי מהמקור" } }, required: ["at_seconds"] },
    },
    run: async (a, ctx) => {
      const at = +a.at_seconds;
      const mode = captureFrameMode(a.timeline, a.source, !!ctx.clips?.length);

      if (mode === "timeline") {
        // פריים מורכב: מיקרו-EDL של ~0.25s דרך מסלול הייצוא המאומת (renderEDL + burn-in) → חילוץ PNG
        let renderTimelineFrame: typeof import("@/lib/ffmpeg").renderTimelineFrame;
        try { ({ renderTimelineFrame } = await import("@/lib/ffmpeg")); }
        catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) ואז צלם שוב."); }
        const micro = buildMicroEdl(
          ctx.clips!, ctx.tracks || [], at,
          ctx.overlays || [], ctx.subs || [], {},
        );
        if (!micro) return "שגיאה: אין תוכן על הציר הערוך לצילום.";
        const blob = await renderTimelineFrame({
          media: ctx.media,
          micro,
          canvas: ctx.canvas || defaultCanvasFor(),
          captionStyle: ctx.captionStyle ?? null,
        });
        try { ctx.pendingImages?.push(await blobToDataUrl(blob)); } catch { /* ignore */ }
        const srcName = mediaById(ctx.media, micro.segments[0]?.sourceId)?.name;
        const where = micro.gap
          ? "רווח (שחור)"
          : `מקור "${srcName || "?"}" ב-${micro.sourceTime.toFixed(1)}s`;
        return {
          text: `צולם פריים מורכב מהציר הערוך בשנייה ${at.toFixed(1)} (${where}; אובריי וכתוביות פעילים + סגנון כתוביות נוכחי נכללו; ברזולוציית ייצוא). ${micro.gap ? "הנקודה היא רווח — צולם שחור. " : ""}הערה: צילום כזה איטי יותר מפריים גולמי (מרנדר מיקרו-קטע). אם צריך רק את המקור — צלם בלי timeline (ברירת המחדל).`,
          artifacts: [{ blob, name: `timeline_${at.toFixed(1)}s.png`, kind: "image" }],
        };
      }

      // פריים גולמי מהמקור (התנהגות קודמת, ללא קומפוזיציה)
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "אין סרטון לצילום.";
      const srcTime = +a.at_seconds;
      const { extractFrame } = await import("@/lib/ffmpeg");
      const blob = await extractFrame(asset.file, srcTime);
      try { ctx.pendingImages?.push(await blobToDataUrl(blob)); } catch { /* ignore */ }
      return {
        text: `צולם פריים גולמי מהמקור "${asset.name}" בשנייה ${srcTime.toFixed(1)} (בלי אובריי/כתוביות). לצילום מורכב של מה שנראה בפועל — השתמש ב-timeline=true.`,
        artifacts: [{ blob, name: `frame_${srcTime.toFixed(1)}s.png`, kind: "image" }],
      };
    },
  },
  {
    name: "keep_by_script", label: "חיתוך לפי סקריפט", color: "#f59e0b", icon: "✂️",
    schema: {
      name: "keep_by_script",
      description:
        "חיתוך מלא בפעולה אחת: מיישר את הטקסט לתמלול (עמיד לשגיאות כתיב ואותיות שימוש), מסיר את מה שלא בטקסט, " +
        "מהדק פאוזות לפי pacing, וממקם כל נקודת חיתוך בעמק השקט המדוד בגל-הקול — לא על חותמת התמלול. " +
        "מדווח במפורש על כל מילה מהטקסט שלא נמצאה במקום להשמיט אותה בשקט. " +
        "אין צורך להריץ remove_silence אחריו — ההידוק כבר נעשה כאן.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "הטקסט שאמור להישאר, בסדר הרצוי" },
          source: { type: "string", description: "סרטון המקור (ברירת מחדל הראשי)" },
          pacing: {
            type: "string",
            enum: ["tight", "natural", "broadcast"],
            description: "tight=פרסומת/רשתות (פאוזה 0.16s); natural=ברירת מחדל לשיעור (0.42s); broadcast=דרשה, שומר פאוזה רטורית (0.85s)",
          },
          remove_fillers: { type: "boolean", description: "הסרת אה/אמ/יעני (ברירת מחדל true)" },
          keep_laughter: { type: "boolean", description: "השאר צחוק קהל (ברירת מחדל true)" },
          append: { type: "boolean", description: "להוסיף לרצף הקיים במקום להחליף (הרכבה מכמה סרטונים)" },
        },
        required: ["script"],
      },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "שגיאה: אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}" (transcribe_video source="${asset.name}").`;
      const scriptText = String(a.script || "").trim();
      if (!scriptText) return "שגיאה: script ריק.";
      if (!a.append) ctx.script = scriptText;

      const analysis = await analysisFor(asset, report);
      report(`מיישר את הטקסט ל-"${asset.name}" וממקם חיתוכים…`);
      const plan = planScriptCut(words, scriptText, {
        sourceId: asset.id,
        duration: asset.duration,
        pacing: resolvePacing(a.pacing),
        envelope: analysis?.envelope ?? null,
        samples: analysis?.samples ?? null,
        sampleRate: analysis?.sampleRate,
        removeFillers: a.remove_fillers !== false,
        keepLaughter: a.keep_laughter !== false,
      });
      if (!plan.clips.length) {
        return `לא נמצאה אף התאמה בין הטקסט ל-"${asset.name}". ודא שזה הסרטון הנכון, או שהתמלול הצליח.`;
      }

      setClips(ctx, a.append ? [...(ctx.clips || []), ...plan.clips] : plan.clips);
      return `${summarizePlan(plan, asset.name, !!analysis)}\n${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "remove_segments", label: "הסרת קטעים", color: "#f59e0b", icon: "✂️",
    schema: { name: "remove_segments", description: "מסיר טווחי-זמן מהמקור ובונה EDL מהשאר (בסדר המקורי).", parameters: { type: "object", properties: { segments: { type: "array", items: { type: "object", properties: { start: { type: "number" }, end: { type: "number" } }, required: ["start", "end"] } } }, required: ["segments"] } },
    run: async (a, ctx) => {
      const m = mainVideo(ctx);
      if (!m) return "שגיאה: לא נטען סרטון.";
      const dur = ctx.duration || m.duration;
      const segs = (a.segments || []).map((s: any) => ({ start: Math.max(0, +s.start), end: Math.min(dur, +s.end) })).filter((s: any) => s.end > s.start).sort((x: any, y: any) => x.start - y.start);
      const clips: Clip[] = []; let prev = 0;
      for (const s of segs) { if (s.start - prev > 0.05) clips.push({ id: uid(), sourceId: m.id, start: prev, end: s.start }); prev = Math.max(prev, s.end); }
      if (dur - prev > 0.05) clips.push({ id: uid(), sourceId: m.id, start: prev, end: dur });
      if (!clips.length) return "לא נשאר תוכן.";
      setClips(ctx, clips);
      return `הוסרו ${segs.length} קטעים. ${clipsSummary(clips)}`;
    },
  },
  {
    name: "add_clip", label: "הוספת קליפ", color: "#10b981", icon: "➕",
    schema: {
      name: "add_clip",
      description: "מוסיף וידאו/תמונה כקליפ מלא ברצועת וידאו, אודיו ברצועת אודיו, או תמונה כשכבת לוגו. source לפי שם, id או אינדקס. באאוטרו עם תמונה+קריינות: הוסף קודם קריינות לרצועת אודיו ואז תמונה placement=timeline עם אותו timeline_start ואותו duration_seconds המדויק; לעולם אל תשתמש במשך הסרטון המקורי.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "שם המקור או אינדקס (1-based)" },
          start: { type: "number" },
          end: { type: "number" },
          duration_seconds: { type: "number", description: "משך הקליפ על הציר. לתמונה+קריינות העבר בדיוק את משך הקריינות לשניהם." },
          match_source: { type: "string", description: "מקור אחר שהמשך שלו קובע את משך הקליפ (למשל @media של הקריינות עבור תמונת סיום). עדיף על ניחוש duration_seconds." },
          at_index: { type: "number", description: "מיקום ברצועה (1-based, אופציונלי)" },
          timeline_start: { type: "number", description: "זמן מדויק בציר הסופי; מפצל קליפ קיים או מוסיף רווח לפי הצורך" },
          placement: { type: "string", enum: ["timeline", "overlay"], description: "לתמונה בלבד: קליפ מלא או שכבת overlay. ברירת מחדל timeline; ללוגו השתמש add_image_overlay." },
          track: { type: "string", description: "שם או id של רצועת היעד" },
        },
        required: ["source"],
      },
    },
    run: async (a, ctx) => {
      const asset = resolveAsset(ctx, a.source);
      if (!asset) return `לא נמצא מקור "${a.source}". השתמש ב-list_media.`;
      const matchAsset = a.match_source != null ? resolveAsset(ctx, a.match_source) : undefined;
      if (a.match_source != null && !matchAsset) return `לא נמצא מקור התאמה "${a.match_source}". השתמש ב-list_media.`;
      const matchedDuration = matchAsset && Number.isFinite(matchAsset.duration) && matchAsset.duration > 0 ? matchAsset.duration : 0;
      if (asset.kind === "image" && String(a.placement || "timeline") === "overlay") {
        const start = a.timeline_start != null ? Math.max(0, +a.timeline_start) : a.start != null ? Math.max(0, +a.start) : 0;
        const duration = Number(a.duration_seconds);
        const end = matchedDuration > 0
          ? start + matchedDuration
          : Number.isFinite(duration) && duration > 0
          ? start + duration
          : a.end != null ? Math.max(start + 0.05, +a.end) : Math.max(start + 4, totalDur(ctx.clips || []) || 4);
        const commandError = dispatch(ctx, "overlay.addImage", { assetId: asset.id, start, end });
        if (commandError === "NO_API") {
          const canvas = ctx.canvas || defaultCanvasFor();
          ctx.overlays = [...(ctx.overlays || []), makeImageOverlay(asset.id, canvas.width, canvas.height, ctx.overlays || [], start, end)];
        } else if (commandError) return `שגיאה: ${commandError}`;
        return `נוספה שכבת תמונה מ-"${asset.name}". סה״כ ${ctx.overlays.length} שכבות.`;
      }
      const primary = primaryVideoTrackId(ctx.tracks || []);
      let trackId = asset.kind === "audio" ? (audioTrack(ctx.tracks || [])?.id || "trk_audio") : primary;
      if (a.track != null && String(a.track).trim()) {
        const ref = String(a.track).trim();
        const candidates = asset.kind === "audio" ? (ctx.tracks || []).filter((x) => x.type === "audio") : videoTracks(ctx.tracks || []);
        const t = candidates.find((x) => x.id === ref || x.name === ref || x.name.includes(ref));
        if (!t) return `רצועה "${ref}" לא נמצאה. השתמש ב-list_tracks.`;
        trackId = t.id;
      }
      const start = a.start != null ? Math.max(0, +a.start) : 0;
      const requestedDuration = Number(a.duration_seconds);
      const effectiveDuration = matchedDuration > 0 ? matchedDuration : requestedDuration;
      const end = Number.isFinite(effectiveDuration) && effectiveDuration > 0
        ? (asset.kind === "image" ? start + effectiveDuration : Math.min(asset.duration, start + effectiveDuration))
        : a.end != null ? (asset.kind === "image" ? +a.end : Math.min(asset.duration, +a.end)) : asset.duration;
      if (ctx.editorApi) {
        const e = dispatch(ctx, "clip.add", {
          sourceId: asset.id,
          start,
          end: Math.max(start + 0.1, end),
          duration_seconds: Number.isFinite(effectiveDuration) && effectiveDuration > 0 ? effectiveDuration : undefined,
          trackId,
          at_index: a.at_index != null ? (a.at_index | 0) - 1 : undefined,
          timeline_start: a.timeline_start != null ? Math.max(0, +a.timeline_start) : undefined,
        });
        if (e && e !== "NO_API") return e;
        if (!e) return `נוסף קליפ מ-"${asset.name}" לרצועה. ${clipsSummary(ctx.clips!)}`;
      }
      const clip: Clip = ensureTrackId(ctx, { id: uid(), sourceId: asset.id, start, end: Math.max(start + 0.1, end), trackId });
      setClips(ctx, addClip(ctx.clips || [], clip, a.at_index != null ? (a.at_index | 0) - 1 : undefined));
      return `נוסף קליפ מ-"${asset.name}". ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "list_clips", label: "רשימת קליפים", color: "#64748b", icon: "📋",
    schema: { name: "list_clips", description: "מחזיר ID יציב, רצועה, טווח מקור והטווח המדויק על הציר הערוך. השתמש ב-clip_id כדי להצמיד תמונת סיום/שכבה לקליפ בלי לנחש זמנים.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const primary = primaryVideoTrackId(ctx.tracks || []);
      const tName = (id: string) => ctx.tracks?.find((t) => t.id === id)?.name || id;
      const elapsed = new Map<string, number>();
      return ctx.clips!.map((c, i) => {
        const tid = clipTrackId(c, primary);
        const timelineStart = elapsed.get(tid) || 0;
        const timelineEnd = timelineStart + clipDur(c);
        elapsed.set(tid, timelineEnd);
        const en = c.enabled === false ? " (מושבת)" : "";
        if (isGapClip(c)) return `${i + 1}. id=${c.id} [${tName(tid)}] [רווח] ציר ${timelineStart.toFixed(3)}–${timelineEnd.toFixed(3)}s (${clipDur(c).toFixed(3)}s)`;
        const name = mediaById(ctx.media, c.sourceId)?.name || c.sourceId;
        return `${i + 1}. id=${c.id} [${tName(tid)}] ${name} · מקור ${c.start.toFixed(3)}–${c.end.toFixed(3)}s · ציר ${timelineStart.toFixed(3)}–${timelineEnd.toFixed(3)}s (${clipDur(c).toFixed(3)}s)${en}`;
      }).join("\n");
    },
  },
  {
    name: "list_tracks", label: "רשימת רצועות", color: "#64748b", icon: "🎚️",
    schema: { name: "list_tracks", description: "מחזיר רצועות וידאו/אודיו/כתוביות (id, שם, סוג, כמה קליפים).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const tracks = ctx.tracks?.length ? ctx.tracks : [];
      if (!tracks.length) return "אין רצועות.";
      const primary = primaryVideoTrackId(tracks);
      return tracks.map((t, i) => {
        const n = t.type === "caption" ? (ctx.subs?.length || 0) : clipsOnTrack(ctx.clips || [], t.id, primary).length;
        return `${i + 1}. ${t.name} (${t.type}, id=${t.id}) · ${n}${t.locked ? " 🔒" : ""}`;
      }).join("\n");
    },
  },
  {
    name: "rename_track", label: "שינוי שם רצועה", color: "#64748b", icon: "✏️",
    schema: { name: "rename_track", description: "משנה שם רצועה לפי id, שם או אינדקס 1-based.", parameters: { type: "object", properties: { track: { type: "string" }, name: { type: "string" } }, required: ["track", "name"] } },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const track = /^\d+$/.test(ref) ? ctx.tracks[Number(ref) - 1] : ctx.tracks.find((t) => t.id === ref || t.name === ref || t.name.includes(ref));
      if (!track) return "רצועה לא נמצאה. השתמש ב-list_tracks.";
      const e = dispatch(ctx, "track.rename", { trackId: track.id, name: a.name });
      if (e === "NO_API") setTracks(ctx, ctx.tracks.map((t) => t.id === track.id ? { ...t, name: String(a.name).trim() } : t));
      else if (e) return `שגיאה: ${e}`;
      return `שם הרצועה שונה ל-${String(a.name).trim()}.`;
    },
  },
  {
    name: "set_track_locked", label: "נעילת רצועה", color: "#64748b", icon: "🔒",
    schema: { name: "set_track_locked", description: "נועל או משחרר רצועה לפי id, שם או אינדקס 1-based.", parameters: { type: "object", properties: { track: { type: "string" }, locked: { type: "boolean" } }, required: ["track", "locked"] } },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const track = /^\d+$/.test(ref) ? ctx.tracks[Number(ref) - 1] : ctx.tracks.find((t) => t.id === ref || t.name === ref || t.name.includes(ref));
      if (!track) return "רצועה לא נמצאה. השתמש ב-list_tracks.";
      const e = dispatch(ctx, "track.setLocked", { trackId: track.id, locked: !!a.locked });
      if (e === "NO_API") setTracks(ctx, ctx.tracks.map((t) => t.id === track.id ? { ...t, locked: !!a.locked } : t));
      else if (e) return `שגיאה: ${e}`;
      return `רצועת ${track.name}: ${a.locked ? "נעולה" : "משוחררת"}.`;
    },
  },
  {
    name: "set_track_muted", label: "השתקת רצועה", color: "#64748b", icon: "🔇",
    schema: { name: "set_track_muted", description: "משתיק או מפעיל רצועת אודיו לפי id, שם או אינדקס 1-based.", parameters: { type: "object", properties: { track: { type: "string" }, muted: { type: "boolean" } }, required: ["track", "muted"] } },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const track = /^\d+$/.test(ref) ? ctx.tracks[Number(ref) - 1] : ctx.tracks.find((t) => t.id === ref || t.name === ref || t.name.includes(ref));
      if (!track) return "רצועה לא נמצאה. השתמש ב-list_tracks.";
      if (track.type !== "audio") return "השתקה זמינה כרגע לרצועת אודיו בלבד.";
      const e = dispatch(ctx, "track.setMuted", { trackId: track.id, muted: !!a.muted });
      if (e === "NO_API") setTracks(ctx, ctx.tracks.map((t) => t.id === track.id ? { ...t, muted: !!a.muted } : t));
      else if (e) return `שגיאה: ${e}`;
      return `רצועת ${track.name}: ${a.muted ? "מושתקת" : "פעילה"}.`;
    },
  },
  {
    name: "set_track_height", label: "גובה רצועה", color: "#64748b", icon: "↕️",
    schema: { name: "set_track_height", description: "קובע גובה רצועה בפיקסלים (28..140) לפי id, שם או אינדקס 1-based.", parameters: { type: "object", properties: { track: { type: "string" }, height: { type: "number" } }, required: ["track", "height"] } },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const track = /^\d+$/.test(ref) ? ctx.tracks[Number(ref) - 1] : ctx.tracks.find((t) => t.id === ref || t.name === ref || t.name.includes(ref));
      if (!track) return "רצועה לא נמצאה. השתמש ב-list_tracks.";
      const height = Math.max(28, Math.min(140, Number(a.height)));
      if (!Number.isFinite(height)) return "גובה רצועה לא תקין.";
      const e = dispatch(ctx, "track.setHeight", { trackId: track.id, height });
      if (e === "NO_API") setTracks(ctx, ctx.tracks.map((t) => t.id === track.id ? { ...t, height } : t));
      else if (e) return `שגיאה: ${e}`;
      return `גובה רצועת ${track.name}: ${height}px.`;
    },
  },
  {
    name: "reorder_track", label: "סידור רצועה", color: "#64748b", icon: "↕️",
    schema: { name: "reorder_track", description: "מעלה או מוריד רצועה ביחס לרצועה סמוכה מאותו סוג.", parameters: { type: "object", properties: { track: { type: "string" }, direction: { type: "number", description: "-1 למעלה, 1 למטה" } }, required: ["track", "direction"] } },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const track = /^\d+$/.test(ref) ? ctx.tracks[Number(ref) - 1] : ctx.tracks.find((t) => t.id === ref || t.name === ref || t.name.includes(ref));
      if (!track) return "רצועה לא נמצאה. השתמש ב-list_tracks.";
      const direction = Number(a.direction);
      if (direction !== -1 && direction !== 1) return "direction חייב להיות -1 או 1.";
      const e = dispatch(ctx, "track.reorder", { trackId: track.id, direction });
      if (e === "NO_API") return "שגיאה: שינוי סדר דורש חיבור לעורך.";
      if (e) return `שגיאה: ${e}`;
      return `סדר רצועת ${track.name} עודכן.`;
    },
  },
  {
    name: "add_video_track", label: "הוספת רצועת וידאו", color: "#10b981", icon: "➕",
    schema: {
      name: "add_video_track",
      description: "מוסיף רצועת וידאו חדשה למונטאז' (מעל הקיימות). אופציונלי: name.",
      parameters: { type: "object", properties: { name: { type: "string" } } },
    },
    run: async (a, ctx) => {
      const before = new Set(videoTracks(ctx.tracks || []).map((t) => t.id));
      if (ctx.editorApi) {
        const e = dispatch(ctx, "track.addVideo", { name: a.name });
        if (e && e !== "NO_API") return e;
      } else {
        const { createVideoTrack } = await import("@/lib/editor/project");
        const { tracks } = createVideoTrack(ctx.tracks || [], a.name != null ? String(a.name) : undefined);
        setTracks(ctx, tracks);
      }
      const created = videoTracks(ctx.tracks || []).find((t) => !before.has(t.id));
      return created
        ? `נוספה רצועת וידאו "${created.name}" (id=${created.id}). השתמש ב-add_clip/move_clip_to_track.`
        : "נוספה רצועת וידאו.";
    },
  },
  {
    name: "remove_video_track", label: "מחיקת רצועת וידאו", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "remove_video_track",
      description: "מוחק רצועת וידאו (לא את האחרונה). קליפים עוברים לרצועה הראשית. track=שם או id.",
      parameters: { type: "object", properties: { track: { type: "string" } }, required: ["track"] },
    },
    run: async (a, ctx) => {
      const ref = String(a.track || "").trim();
      const t = videoTracks(ctx.tracks || []).find((x) => x.id === ref || x.name === ref || x.name.includes(ref));
      if (!t) return `רצועה "${ref}" לא נמצאה.`;
      if (ctx.editorApi) {
        const e = dispatch(ctx, "track.removeVideo", { trackId: t.id });
        if (e) return e;
        return `נמחקה רצועה "${t.name}". ${clipsSummary(ctx.clips || [])}`;
      }
      return "שגיאה: אין חיבור לעורך.";
    },
  },
  {
    name: "move_clip_to_track", label: "העברת קליפ לרצועה", color: "#0ea5e9", icon: "🔀",
    schema: {
      name: "move_clip_to_track",
      description: "מעביר קליפ לרצועת וידאו אחרת (מונטאז'/B-roll). timeline_start מציב אותו בזמן ציר מדויק ומוסיף רווח לפי הצורך; בלי זמן הוא מצטרף לסוף.",
      parameters: { type: "object", properties: { index: { type: "number" }, track: { type: "string" }, timeline_start: { type: "number", description: "זמן התחלה מדויק על הציר הערוך" } }, required: ["index", "track"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      const ref = String(a.track || "").trim();
      const t = videoTracks(ctx.tracks || []).find((x) => x.id === ref || x.name === ref || x.name.includes(ref));
      if (!t) return `רצועה "${ref}" לא נמצאה.`;
      if (ctx.editorApi) {
        const exact = a.timeline_start != null && Number.isFinite(+a.timeline_start);
        const e = dispatch(ctx, exact ? "clip.moveAtTimeline" : "clip.moveToTrack", {
          id: c.id, trackId: t.id, ...(exact ? { timeline_start: Math.max(0, +a.timeline_start) } : {}),
        });
        if (e) return e;
        return `קליפ ${a.index | 0} הועבר ל-"${t.name}"${exact ? ` בזמן ${Math.max(0, +a.timeline_start).toFixed(3)}s` : ""}.`;
      }
      setClips(ctx, a.timeline_start != null && Number.isFinite(+a.timeline_start)
        ? moveClipAtTimeline(ctx.clips!, c.id, t.id, Math.max(0, +a.timeline_start), primaryVideoTrackId(ctx.tracks || []))
        : ctx.clips!.map((x) => (x.id === c.id ? { ...x, trackId: t.id } : x)));
      return `קליפ ${a.index | 0} הועבר ל-"${t.name}".`;
    },
  },
  {
    name: "split_clip", label: "פיצול קליפ", color: "#0ea5e9", icon: "🔪",
    schema: { name: "split_clip", description: "מפצל קליפ לשניים בנקודת זמן במקור.", parameters: { type: "object", properties: { index: { type: "number", description: "מספר הקליפ (1-based)" }, at_source: { type: "number", description: "שנייה במקור לפיצול" } }, required: ["index", "at_source"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      if (ctx.editorApi) {
        const e = dispatch(ctx, "clip.split", { id: c.id, at_source: +a.at_source });
        if (e) return e;
        return `פוצל. ${clipsSummary(ctx.clips!)}`;
      }
      setClips(ctx, splitClip(ctx.clips!, c.id, +a.at_source));
      return `פוצל. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "trim_clip", label: "טרים קליפ", color: "#0ea5e9", icon: "↔️",
    schema: {
      name: "trim_clip",
      description: "משנה את גבולות המקור של קליפ (start ו/או end בשניות במקור). אפשר להעביר רק end או רק start — כך משנים כמה זמן הקטע יופיע.",
      parameters: { type: "object", properties: { index: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      const start = a.start != null && a.start !== "" ? +a.start : c.start;
      const end = a.end != null && a.end !== "" ? +a.end : c.end;
      if (!Number.isFinite(start) || !Number.isFinite(end)) return "שגיאה: start/end לא תקינים.";
      if (ctx.editorApi) {
        const e = dispatch(ctx, "clip.trim", { id: c.id, start, end });
        if (e) return e;
        const after = ctx.clips!.find((x) => x.id === c.id);
        if (!after) return "שגיאה: הטרים נכשל.";
        return `טורם קליפ ${a.index | 0} ל-${after.start.toFixed(2)}–${after.end.toFixed(2)}s. ${clipsSummary(ctx.clips!)}`;
      }
      const asset = mediaById(ctx.media, c.sourceId);
      const maxDur = asset?.duration || ctx.duration || c.end;
      setClips(ctx, trimClip(ctx.clips!, c.id, start, end, maxDur));
      const after = ctx.clips!.find((x) => x.id === c.id);
      if (!after || !Number.isFinite(after.start) || !Number.isFinite(after.end)) return "שגיאה: הטרים נכשל (גבולות לא תקינים).";
      return `טורם קליפ ${a.index | 0} ל-${after.start.toFixed(2)}–${after.end.toFixed(2)}s. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "move_clip", label: "הזזת קליפ", color: "#0ea5e9", icon: "↕️",
    schema: { name: "move_clip", description: "מזיז קליפ למיקום אחר *בתוך אותה רצועה* (משנה סדר). להעברה בין רצועות — move_clip_to_track.", parameters: { type: "object", properties: { index: { type: "number" }, to_index: { type: "number", description: "מיקום יעד ברצועה (1-based)" } }, required: ["index", "to_index"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      if (ctx.editorApi) {
        const primary = primaryVideoTrackId(ctx.tracks || []);
        const tid = clipTrackId(c, primary);
        const onTrack = clipsOnTrack(ctx.clips!, tid, primary);
        const localIdx = onTrack.findIndex((x) => x.id === c.id);
        // to_index is 1-based within track for agent UX — convert via local list length
        const e = dispatch(ctx, "clip.move", { id: c.id, to_index: (a.to_index | 0) - 1 });
        if (e) return e;
        return `הוזז (ברצועה, היה ${localIdx + 1}). ${clipsSummary(ctx.clips!)}`;
      }
      setClips(ctx, moveClip(ctx.clips!, c.id, (a.to_index | 0) - 1));
      return `הוזז. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "delete_clip", label: "מחיקת קליפ", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "delete_clip",
      description: "מוחק קליפ בודד. leave_gap=true משאיר רווח שחור/שקט. למחיקת רבים — delete_clips / keep_source_range (לא בלולאה).",
      parameters: { type: "object", properties: { index: { type: "number" }, leave_gap: { type: "boolean", description: "השאר רווח במקום הקליפ" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) setClips(ctx, closeGap(ctx.clips!, c.id));
      else if (a.leave_gap) setClips(ctx, removeClipLeaveGap(ctx.clips!, c.id));
      else setClips(ctx, removeClipRipple(ctx.clips!, c.id));
      return `עודכן. ${ctx.clips!.length ? clipsSummary(ctx.clips!) : "אין קליפים."}`;
    },
  },
  {
    name: "set_clip_enabled", label: "הפעל/השבת קטע", color: "#64748b", icon: "👁️",
    schema: {
      name: "set_clip_enabled",
      description: "מפעיל או משבית קליפ (מושבת = לא נכלל בנגן ובייצוא).",
      parameters: { type: "object", properties: { index: { type: "number" }, enabled: { type: "boolean" } }, required: ["index", "enabled"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const c = ctx.clips![i]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) return "לא ניתן להשבית רווח — מחק/סגור אותו.";
      const commandError = dispatch(ctx, "clip.setEnabled", { id: c.id, enabled: !!a.enabled });
      if (commandError === "NO_API") {
        setClips(ctx, ctx.clips!.map((x, k) => (k === i ? { ...x, enabled: !!a.enabled } : x)));
      } else if (commandError) {
        return `שגיאה: ${commandError}`;
      }
      return `קטע ${a.index}: ${a.enabled ? "פעיל" : "מושבת"}.`;
    },
  },
  {
    name: "set_clip_volume", label: "עוצמת קטע", color: "#64748b", icon: "🔊",
    schema: {
      name: "set_clip_volume",
      description: "קובע עוצמת שמע לקליפ (0..2, ברירת מחדל 1).",
      parameters: { type: "object", properties: { index: { type: "number" }, volume: { type: "number" } }, required: ["index", "volume"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const c = ctx.clips![i]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) return "לרווח אין עוצמה.";
      const volume = Math.max(0, Math.min(2, +a.volume));
      const commandError = dispatch(ctx, "clip.setVolume", { id: c.id, volume });
      if (commandError === "NO_API") {
        setClips(ctx, ctx.clips!.map((x, k) => (k === i ? { ...x, volume } : x)));
      } else if (commandError) {
        return `שגיאה: ${commandError}`;
      }
      return `עוצמת קטע ${a.index}: ${Math.round(volume * 100)}%.`;
    },
  },
  {
    name: "set_clip_audio_fades", label: "Fade שמע", color: "#64748b", icon: "◢",
    schema: {
      name: "set_clip_audio_fades",
      description: "מגדיר fade-in/fade-out ליניאריים בשניות לקליפ, בתצוגה המקדימה ובייצוא. הערכים מוגבלים יחד למשך הקליפ.",
      parameters: { type: "object", properties: { index: { type: "number" }, fade_in: { type: "number" }, fade_out: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const clip = ctx.clips![i];
      if (!clip || isGapClip(clip)) return "אינדקס קליפ לא תקין.";
      if (a.fade_in == null && a.fade_out == null) return "צריך fade_in או fade_out.";
      const args = { id: clip.id, fadeIn: a.fade_in, fadeOut: a.fade_out };
      const commandError = dispatch(ctx, "clip.setAudioFades", args);
      let fades: { fadeIn: number; fadeOut: number };
      if (commandError === "NO_API") {
        fades = clipAudioFades({ ...clip, fadeIn: a.fade_in ?? clip.fadeIn, fadeOut: a.fade_out ?? clip.fadeOut });
        setClips(ctx, ctx.clips!.map((item, index) => index === i ? { ...item, ...fades } : item));
      } else if (commandError) return `שגיאה: ${commandError}`;
      else fades = clipAudioFades(ctx.clips![i]);
      return `דעיכת קטע ${a.index}: כניסה ${fades.fadeIn.toFixed(2)}s, יציאה ${fades.fadeOut.toFixed(2)}s.`;
    },
  },
  {
    name: "set_clip_opacity", label: "שקיפות קטע", color: "#64748b", icon: "◐",
    schema: {
      name: "set_clip_opacity",
      description: "קובע שקיפות חזותית לקליפ (0..1) מול רקע שחור, בתצוגה המקדימה ובייצוא.",
      parameters: { type: "object", properties: { index: { type: "number" }, opacity: { type: "number" } }, required: ["index", "opacity"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const c = ctx.clips![i]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) return "לרווח אין שקיפות.";
      const opacity = Math.max(0, Math.min(1, +a.opacity));
      const commandError = dispatch(ctx, "clip.setOpacity", { id: c.id, opacity });
      if (commandError === "NO_API") {
        setClips(ctx, ctx.clips!.map((x, k) => (k === i ? { ...x, opacity } : x)));
      } else if (commandError) return `שגיאה: ${commandError}`;
      return `שקיפות קטע ${a.index}: ${Math.round(opacity * 100)}%.`;
    },
  },
  {
    name: "set_clip_color", label: "תיקוני צבע", color: "#8b5cf6", icon: "◉",
    schema: {
      name: "set_clip_color",
      description: "מעדכן ניגודיות ורוויה של קליפ עם Preview ו-Export. index הוא 1-based; preset=neutral|crisp|vivid|muted|mono, או contrast=0.5..2 ו-saturation=0..3.",
      parameters: { type: "object", properties: { index: { type: "number" }, preset: { type: "string" }, contrast: { type: "number" }, saturation: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const clip = ctx.clips![i];
      if (!clip || isGapClip(clip)) return "אינדקס קליפ לא תקין.";
      const args: Record<string, number | string> = { id: clip.id };
      if (a.preset != null) {
        const preset = colorPreset(String(a.preset));
        if (!preset) return "preset לא מוכר. השתמש ב-neutral/crisp/vivid/muted/mono.";
        args.contrast = preset.contrast;
        args.saturation = preset.saturation;
      }
      if (a.contrast != null) {
        if (!Number.isFinite(+a.contrast)) return "contrast לא תקין.";
        args.contrast = +a.contrast;
      }
      if (a.saturation != null) {
        if (!Number.isFinite(+a.saturation)) return "saturation לא תקין.";
        args.saturation = +a.saturation;
      }
      if (args.contrast == null && args.saturation == null) return "צריך להעביר contrast או saturation.";
      const commandError = dispatch(ctx, "clip.setColorAdjustments", args);
      if (commandError === "NO_API") {
        const contrast = args.contrast == null ? clip.contrast : Math.max(0.5, Math.min(2, Number(args.contrast)));
        const saturation = args.saturation == null ? clip.saturation : Math.max(0, Math.min(3, Number(args.saturation)));
        setClips(ctx, ctx.clips!.map((item, index) => index === i ? { ...item, contrast, saturation } : item));
      } else if (commandError) return `שגיאה: ${commandError}`;
      return `תיקוני צבע לקליפ ${a.index} עודכנו.`;
    },
  },
  {
    name: "set_clip_visual_fades", label: "Fade חזותי", color: "#8b5cf6", icon: "◩",
    schema: {
      name: "set_clip_visual_fades",
      description: "מגדיר fade-in/fade-out חזותיים ליניאריים בשניות, משחור ואל שחור, ב-Preview וב-Export.",
      parameters: { type: "object", properties: { index: { type: "number" }, fade_in: { type: "number" }, fade_out: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const clip = ctx.clips![i];
      if (!clip || isGapClip(clip)) return "אינדקס קליפ לא תקין.";
      if (a.fade_in == null && a.fade_out == null) return "צריך fade_in או fade_out.";
      const commandError = dispatch(ctx, "clip.setVisualFades", { id: clip.id, fadeIn: a.fade_in, fadeOut: a.fade_out });
      let fades: { fadeIn: number; fadeOut: number };
      if (commandError === "NO_API") {
        fades = clipVisualFades({ ...clip, visualFadeIn: a.fade_in ?? clip.visualFadeIn, visualFadeOut: a.fade_out ?? clip.visualFadeOut });
        setClips(ctx, ctx.clips!.map((item, index) => index === i ? { ...item, visualFadeIn: fades.fadeIn, visualFadeOut: fades.fadeOut } : item));
      } else if (commandError) return `שגיאה: ${commandError}`;
      else fades = clipVisualFades(ctx.clips![i]);
      return `דעיכה חזותית לקליפ ${a.index}: כניסה ${fades.fadeIn.toFixed(2)}s, יציאה ${fades.fadeOut.toFixed(2)}s.`;
    },
  },
  {
    name: "set_clip_flip", label: "היפוך קטע", color: "#8b5cf6", icon: "↔",
    schema: {
      name: "set_clip_flip",
      description: "הופך קליפ אופקית ו/או אנכית ב-Preview וב-Export. אפשר לשנות כיוון אחד בלי לשנות את השני.",
      parameters: { type: "object", properties: { index: { type: "number" }, horizontal: { type: "boolean" }, vertical: { type: "boolean" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const clip = ctx.clips![i];
      if (!clip || isGapClip(clip)) return "אינדקס קליפ לא תקין.";
      if (a.horizontal == null && a.vertical == null) return "צריך horizontal או vertical.";
      const commandError = dispatch(ctx, "clip.setFlip", { id: clip.id, flipX: a.horizontal, flipY: a.vertical });
      if (commandError === "NO_API") {
        setClips(ctx, ctx.clips!.map((item, index) => index === i ? {
          ...item,
          flipX: a.horizontal == null ? item.flipX === true : a.horizontal === true,
          flipY: a.vertical == null ? item.flipY === true : a.vertical === true,
        } : item));
      } else if (commandError) return `שגיאה: ${commandError}`;
      const updated = ctx.clips![i];
      return `היפוך קטע ${a.index}: אופקי ${updated.flipX ? "כן" : "לא"}, אנכי ${updated.flipY ? "כן" : "לא"}.`;
    },
  },
  {
    name: "get_brand_kit", label: "ערכת מותג", color: "#7c3aed", icon: "🎨",
    schema: {
      name: "get_brand_kit",
      description:
        "קורא את ערכת המותג הפעילה שנשמרה מקומית (הגדרות → מותג): שם הארגון, סלוגן, פלטת צבעים, הנחיות ניסוח ונכסים (לוגו/תמונות ייחוס) עם id/שם/תפקיד. " +
        "אין כאן קבצים — רק מטא-דאטה. קרא לפני עבודת תמונה/כרטיס/CTA/לוגו אם ייתכן שקיימת ערכה. אם אין ערכה פעילה — המשך כרגיל בלי מותג.",
      parameters: { type: "object", properties: {} },
    },
    run: async (_a, ctx) => {
      const kit = ctx.brandKit ?? (await getActiveBrandKit());
      if (!kit) return "אין ערכת מותג פעילה. אפשר ליצור אחת בהגדרות → מותג (נשמר מקומית במכשיר בלבד).";
      return brandKitPrompt(summarizeBrandKit(kit));
    },
  },
  {
    name: "use_brand_asset", label: "שימוש בנכס מותג", color: "#7c3aed", icon: "🪧",
    schema: {
      name: "use_brand_asset",
      description:
        "מייבא נכס מערכת המותג הפעילה לפרויקט דרך גבול המדיה של הדפדפן (File/Blob — לא JSON). " +
        "asset=id יציב או שם מהכלי get_brand_kit. " +
        "action=logo_overlay: מייבא את הלוגו ומוסיף אותו מייד כשכבת אובריי דרך פקודת overlay.addImage הקיימת (preset=logo_top_left|logo_top_right|fit_canvas|center, start/end אופציונליים). " +
        "action=reference_media: רק מייבא את התמונה כמדיה לשימוש מאוחר. אם הנכס כבר קיים במדיה — נעשה בו שימוש חוזר בלי ייבוא כפול. לעולם אל תיצור תחליף אם הנכס חסר — החזר שגיאה.",
      parameters: {
        type: "object",
        properties: {
          asset: { type: "string", description: "id יציב או שם של נכס בערכה (מתוך get_brand_kit)" },
          action: { type: "string", enum: ["logo_overlay", "reference_media"], description: "logo_overlay=לוגו כשכבה על הסרטון; reference_media=ייבוא בלבד לשימוש מאוחר" },
          start: { type: "number", description: "שניית התחלה על הציר (ברירת מחדל 0)" },
          end: { type: "number", description: "שניית סיום (ברירת מחדל לפי אורך הציר)" },
          preset: { type: "string", enum: ["logo_top_left", "logo_top_right", "fit_canvas", "center"], description: "רק ל-logo_overlay: מיקום וגודל (ברירת מחדל logo_top_left)" },
        },
        required: ["asset", "action"],
      },
    },
    run: async (a, ctx) => {
      const kit = ctx.brandKit ?? (await getActiveBrandKit());
      if (!kit) return "שגיאה: אין ערכת מותג פעילה. צור/הפעל ערכה בהגדרות → מותג לפני שימוש בנכס מותג.";
      const action = String(a.action || "");
      if (action !== "logo_overlay" && action !== "reference_media") {
        return "שגיאה: action חייב להיות logo_overlay או reference_media.";
      }
      const ref = String(a.asset || "").trim();
      if (!ref) return "שגיאה: חסר asset — העבר id או שם מהערכה (get_brand_kit).";
      const assetMeta = kit.assets.find((x) => x.id === ref)
        ?? kit.assets.find((x) => x.name.toLowerCase().includes(ref.toLowerCase()));
      if (!assetMeta) {
        const names = kit.assets.map((x) => `${x.id} (${x.name})`).join(", ");
        return `שגיאה: נכס "${ref}" לא נמצא בערכה. נכסים זמינים: ${names || "אין"}. לא נוצר תחליף אוטומטי.`;
      }

      // ייבוא לגבול המדיה (דרך addMediaAsset של הדף — לא JSON), עם מניעת כפילות
      const file = new File([assetMeta.blob], assetMeta.name, { type: assetMeta.mime || assetMeta.blob.type || "application/octet-stream" });
      const { asset: mediaAsset, reused } = registerMediaAsset(ctx, {
        id: uid("m"),
        name: file.name,
        kind: "image",
        file,
        duration: 4,
        url: URL.createObjectURL(file),
      });
      const imported = reused ? `נעשה שימוש חוזר במדיה קיימת @media:${mediaAsset.id} (${mediaAsset.name})` : `יובאה תמונת מותג @media:${mediaAsset.id} (${mediaAsset.name})`;

      if (action === "reference_media") {
        return `${imported}. זמינה לשימוש מאוחר — ציין אותה ב-@media:${mediaAsset.id} או ב-add_image_overlay(source=...).`;
      }

      // logo_overlay: אותה דרך מאומתת של overlay.addImage עם preset/גיאומטריה/בטיחות
      const canvas = ctx.canvas || defaultCanvasFor();
      const start = a.start != null ? Math.max(0, +a.start) : 0;
      const end = a.end != null ? Math.max(start + 0.05, +a.end) : Math.max(start + 4, totalDur(ctx.clips || []) || 4);
      const intrinsic = await imageDimensions(mediaAsset);
      const rawPreset = String(a.preset || "logo_top_left");
      const preset: ImageOverlayPreset = rawPreset === "logo_top_right" || rawPreset === "fit_canvas" || rawPreset === "center" ? rawPreset : "logo_top_left";
      const transform = imageOverlayGeometry(canvas.width, canvas.height, intrinsic, preset);
      const overlayId = uid("ov");
      const commandError = dispatch(ctx, "overlay.addImage", {
        assetId: mediaAsset.id,
        overlayId,
        start,
        end,
        preset,
        width: intrinsic?.width,
        height: intrinsic?.height,
        x: transform.x,
        y: transform.y,
        w: transform.w,
        h: transform.h,
        opacity: transform.opacity,
        fadeIn: 0.15,
        fadeOut: 0.15,
        locked: true,
      });
      if (commandError === "NO_API") {
        const overlay = makeImageOverlay(mediaAsset.id, canvas.width, canvas.height, ctx.overlays || [], start, end, intrinsic);
        ctx.overlays = [...(ctx.overlays || []), { ...overlay, id: overlayId, transform, fadeIn: 0.15, fadeOut: 0.15, locked: true }];
      } else if (commandError) {
        return `שגיאה: ${commandError}`;
      }
      return `${imported}. נוספה שכבת לוגו id=${overlayId} (preset=${preset}, ${Math.round(transform.w)}×${Math.round(transform.h)}px, ${start.toFixed(1)}–${end.toFixed(1)}s, מוגנת). אמת עם list_overlays לפי אותו id.`;
    },
  },
  {
    name: "list_overlays", label: "רשימת שכבות", color: "#64748b", icon: "🧩",
    schema: { name: "list_overlays", description: "מחזיר את שכבות התמונה/טקסט על הקנבס.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const ovs = ctx.overlays || [];
      if (!ovs.length) return "אין שכבות.";
      return ovs.map((o, i) => {
        const label = o.kind === "text" ? (o.text || "טקסט") : (mediaById(ctx.media, o.assetId || "")?.name || "תמונה");
        return `${i + 1}. id=${o.id} [${o.kind}] ${label} ${o.start.toFixed(1)}–${o.end.toFixed(1)}s · x=${Math.round(o.transform.x)}, y=${Math.round(o.transform.y)}, w=${Math.round(o.transform.w)}, h=${Math.round(o.transform.h)}, z=${o.zIndex}, round=${Math.round(o.borderRadius || 0)}, fade=${(o.fadeIn || 0).toFixed(2)}/${(o.fadeOut || 0).toFixed(2)}s${o.locked ? " · מוגנת" : ""}`;
      }).join("\n");
    },
  },
  {
    name: "add_image_overlay", label: "הוספת תמונה", color: "#f59e0b", icon: "🖼️",
    schema: {
      name: "add_image_overlay",
      description: "מוסיף תמונה אטומית בלי לשנות שכבות קיימות. לתמונת סיום העבר match_clip_id של קליפ הקריינות: הכלי יעתיק את טווח הציר המדויק ואסור להעביר start/end יחד איתו. ללוגו השתמש logo_top_left/right; לתמונת סיום מלאה fit_canvas.",
      parameters: { type: "object", properties: { source: { type: "string" }, start: { type: "number" }, end: { type: "number" }, match_clip_id: { type: "string", description: "ID יציב מ-list_clips; מצמיד את השכבה בדיוק לטווח הקליפ על הרצועה" }, preset: { type: "string", enum: ["center", "fit_canvas", "logo_top_left", "logo_top_right"] }, x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" }, border_radius: { type: "number" }, opacity: { type: "number" }, fade_in: { type: "number" }, fade_out: { type: "number" }, locked: { type: "boolean" } }, required: ["source"] },
    },
    run: async (a, ctx) => {
      const asset = resolveAsset(ctx, String(a.source || ""));
      if (!asset || asset.kind !== "image") return "שגיאה: נכס תמונה לא נמצא.";
      let start = a.start != null ? Math.max(0, +a.start) : 0;
      let end = a.end != null ? Math.max(start + 0.05, +a.end) : Math.max(start + 4, totalDur(ctx.clips || []) || 4);
      if (a.match_clip_id != null) {
        if (a.start != null || a.end != null) return "שגיאה: match_clip_id קובע זמן מדויק; אין להעביר איתו start/end.";
        const matchId = String(a.match_clip_id);
        const target = (ctx.clips || []).find((clip) => clip.id === matchId);
        if (!target) return `שגיאה: קליפ id=${matchId} לא נמצא. קרא list_clips פעם אחת והשתמש ב-ID שהוחזר.`;
        const primary = primaryVideoTrackId(ctx.tracks || []);
        const tid = clipTrackId(target, primary);
        const trackClips = clipsOnTrack(ctx.clips || [], tid, primary);
        const position = trackClips.findIndex((clip) => clip.id === matchId);
        start = trackClips.slice(0, position).reduce((sum, clip) => sum + clipDur(clip), 0);
        end = start + clipDur(target);
      }
      const canvas = ctx.canvas || defaultCanvasFor();
      const intrinsic = await imageDimensions(asset);
      const rawPreset = String(a.preset || "center");
      const preset: ImageOverlayPreset = rawPreset === "fit_canvas" || rawPreset === "logo_top_left" || rawPreset === "logo_top_right" ? rawPreset : "center";
      const transform = imageOverlayGeometry(canvas.width, canvas.height, intrinsic, preset, {
        ...(a.x != null ? { x: +a.x } : {}), ...(a.y != null ? { y: +a.y } : {}),
        ...(a.w != null ? { w: +a.w } : {}), ...(a.h != null ? { h: +a.h } : {}),
        ...(a.opacity != null ? { opacity: +a.opacity } : {}),
      });
      const overlayId = uid("ov");
      const commandError = dispatch(ctx, "overlay.addImage", {
        assetId: asset.id, overlayId, start, end, preset,
        width: intrinsic?.width, height: intrinsic?.height,
        x: transform.x, y: transform.y, w: transform.w, h: transform.h, opacity: transform.opacity,
        borderRadius: a.border_radius, fadeIn: a.fade_in, fadeOut: a.fade_out, locked: a.locked === true,
      });
      if (commandError === "NO_API") {
        const overlay = makeImageOverlay(asset.id, canvas.width, canvas.height, ctx.overlays || [], start, end, intrinsic);
        ctx.overlays = [...(ctx.overlays || []), {
          ...overlay, id: overlayId, transform,
          borderRadius: a.border_radius != null ? Math.max(0, +a.border_radius) : undefined,
          fadeIn: a.fade_in != null ? Math.max(0, Math.min((end - start) / 2, +a.fade_in)) : undefined,
          fadeOut: a.fade_out != null ? Math.max(0, Math.min((end - start) / 2, +a.fade_out)) : undefined,
          locked: a.locked === true,
        }];
      } else if (commandError) return `שגיאה: ${commandError}`;
      return `נוספה שכבת תמונה אחת: id=${overlayId}, ${asset.name}; x=${Math.round(transform.x)}, y=${Math.round(transform.y)}, ${Math.round(transform.w)}×${Math.round(transform.h)}; ציר ${start.toFixed(3)}–${end.toFixed(3)}s${a.match_clip_id ? ` (מותאם לקליפ ${a.match_clip_id})` : ""}${a.locked ? ", מוגנת" : ""}.`;
    },
  },
  {
    name: "add_text_overlay", label: "הוספת טקסט", color: "#f59e0b", icon: "Ｔ",
    schema: {
      name: "add_text_overlay",
      description: "מוסיף שכבת טקסט או כרטיס CapCut-style אמיתי: source_popup, speaker_card או dedication_card. כל הסגנונות מופיעים ב-Preview ובייצוא.",
      parameters: { type: "object", properties: { text: { type: "string" }, start: { type: "number" }, end: { type: "number" }, preset: { type: "string", enum: ["plain", "source_popup", "speaker_card", "dedication_card"] }, x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" }, color: { type: "string" }, background: { type: "string" }, font_size: { type: "number" }, border_color: { type: "string" }, border_width: { type: "number" }, border_radius: { type: "number" }, fade_in: { type: "number" }, fade_out: { type: "number" } } },
    },
    run: async (a, ctx) => {
      const canvas = ctx.canvas || defaultCanvasFor();
      const start = a.start != null ? +a.start : 0;
      const end = a.end != null ? +a.end : Math.max(start + 4, totalDur(ctx.clips || []) || 4);
      let o: Overlay;
      const presetName = String(a.preset || "plain");
      const popup = presetName === "source_popup" || presetName === "speaker_card" || presetName === "dedication_card";
      const commandError = dispatch(ctx, "overlay.addText", { text: String(a.text || "טקסט חדש"), start, end, preset: presetName });
      if (commandError === "NO_API") {
        o = popup
          ? makeTitlePopup(canvas.width, canvas.height, ctx.overlays || [], String(a.text || "טקסט חדש"), start, end, presetName as "source_popup" | "speaker_card" | "dedication_card")
          : makeTextOverlay(canvas.width, canvas.height, ctx.overlays || [], String(a.text || "טקסט חדש"), start, end);
        ctx.overlays = [...(ctx.overlays || []), o];
      } else if (commandError) return `שגיאה: ${commandError}`;
      else o = ctx.overlays[ctx.overlays.length - 1];
      const preset = popup ? makeTitlePopup(canvas.width, canvas.height, ctx.overlays || [], String(a.text || "טקסט חדש"), start, end, presetName as "source_popup" | "speaker_card" | "dedication_card") : o;
      const transform = { ...o.transform, ...(popup ? preset.transform : {}), ...(a.x != null ? { x: +a.x } : {}), ...(a.y != null ? { y: +a.y } : {}), ...(a.w != null ? { w: +a.w } : {}), ...(a.h != null ? { h: +a.h } : {}) };
      const patch: Partial<Overlay> = { transform };
      if (popup) { patch.background = preset.background; patch.borderRadius = preset.borderRadius; patch.borderColor = preset.borderColor; patch.borderWidth = preset.borderWidth; patch.fontSize = preset.fontSize; patch.fadeIn = preset.fadeIn; patch.fadeOut = preset.fadeOut; }
      if (a.color != null) patch.color = String(a.color);
      if (a.background != null) patch.background = String(a.background);
      if (a.font_size != null) patch.fontSize = Math.max(8, +a.font_size);
      if (a.border_color != null) patch.borderColor = String(a.border_color);
      if (a.border_width != null) patch.borderWidth = Math.max(0, +a.border_width);
      if (a.border_radius != null) patch.borderRadius = Math.max(0, +a.border_radius);
      if (a.fade_in != null) patch.fadeIn = Math.max(0, Math.min((end - start) / 2, +a.fade_in));
      if (a.fade_out != null) patch.fadeOut = Math.max(0, Math.min((end - start) / 2, +a.fade_out));
      if (Object.keys(patch).length) {
        const updateError = dispatch(ctx, "overlay.update", { id: o.id, patch });
        if (updateError === "NO_API") ctx.overlays = ctx.overlays.map((item) => item.id === o.id ? { ...item, ...patch } : item);
        else if (updateError) return `שגיאה: ${updateError}`;
      }
      return `נוספה שכבת טקסט (${presetName}, ${o.id}) בזמן ${start.toFixed(1)}–${end.toFixed(1)}s, מיקום x=${Math.round(transform.x)}, y=${Math.round(transform.y)}, גודל ${Math.round(transform.w)}×${Math.round(transform.h)}. השתמש ב-list_overlays לאימות.`;
    },
  },
  {
    name: "delete_overlay", label: "מחיקת שכבה", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "delete_overlay",
      description: "מוחק שכבה לפי overlay_id יציב (מומלץ) או אינדקס. expected_source מגן ממחיקת תמונה אחרת.",
      parameters: { type: "object", properties: { overlay_id: { type: "string" }, index: { type: "number" }, expected_source: { type: "string" } } },
    },
    run: async (a, ctx) => {
      const target = overlayTarget(a, ctx); if (typeof target === "string") return target;
      const { overlay, index } = target;
      if (overlay.locked) return `שגיאת הגנה: שכבה id=${overlay.id} מוגנת. בטל הגנה במפורש לפני מחיקה.`;
      const commandError = dispatch(ctx, "overlay.delete", { id: overlay.id });
      if (commandError === "NO_API") ctx.overlays = (ctx.overlays || []).filter((_, k) => k !== index);
      else if (commandError) return `שגיאה: ${commandError}`;
      return `נמחקה שכבה id=${overlay.id}. נותרו ${(ctx.overlays || []).length} שכבות.`;
    },
  },
  {
    name: "update_overlay", label: "עדכון שכבה", color: "#f59e0b", icon: "✏️",
    schema: {
      name: "update_overlay",
      description: "מעדכן שכבה לפי overlay_id יציב (מומלץ) או אינדקס. expected_source מונע שינוי תמונה אחרת.",
      parameters: {
        type: "object",
        properties: {
          overlay_id: { type: "string" }, index: { type: "number" }, expected_source: { type: "string" }, text: { type: "string" }, start: { type: "number" }, end: { type: "number" },
          x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" },
          rotation: { type: "number" }, opacity: { type: "number" }, color: { type: "string" }, background: { type: "string" }, border_radius: { type: "number" }, border_color: { type: "string" }, border_width: { type: "number" }, font_size: { type: "number" }, z_index: { type: "number" }, fade_in: { type: "number" }, fade_out: { type: "number" }, locked: { type: "boolean" },
        },
      },
    },
    run: async (a, ctx) => {
      const ovs = ctx.overlays || [];
      const target = overlayTarget(a, ctx); if (typeof target === "string") return target;
      const { overlay: o, index: i } = target;
      if (o.locked && a.locked !== false) return `שגיאת הגנה: שכבה id=${o.id} מוגנת. מותר רק locked=false עד ביטול ההגנה.`;
      let t = { ...o.transform };
      if (a.x != null) t.x = +a.x;
      if (a.y != null) t.y = +a.y;
      if (a.w != null) t.w = Math.max(8, +a.w);
      if (a.h != null) t.h = Math.max(8, +a.h);
      if (a.rotation != null) t.rotation = +a.rotation;
      if (a.opacity != null) t.opacity = Math.max(0, Math.min(1, +a.opacity));
      t = clampOverlayTransform(t, ctx.canvas?.width || defaultCanvasFor().width, ctx.canvas?.height || defaultCanvasFor().height);
      const patch: Partial<Overlay> = { transform: t };
      if (a.text != null) patch.text = String(a.text);
      if (a.color != null) patch.color = String(a.color);
      if (a.background != null) patch.background = String(a.background);
      if (a.border_radius != null) patch.borderRadius = Math.max(0, +a.border_radius);
      if (a.border_color != null) patch.borderColor = String(a.border_color);
      if (a.border_width != null) patch.borderWidth = Math.max(0, +a.border_width);
      if (a.z_index != null) patch.zIndex = Math.max(0, Math.round(+a.z_index));
      if (a.locked != null) patch.locked = a.locked === true;
      if (a.font_size != null) patch.fontSize = Math.max(8, +a.font_size);
      if (a.start != null) patch.start = Math.max(0, +a.start);
      if (a.end != null) patch.end = Math.max((patch.start ?? o.start) + 0.05, +a.end);
      const nextDuration = (patch.end ?? o.end) - (patch.start ?? o.start);
      if (a.fade_in != null) patch.fadeIn = Math.max(0, Math.min(nextDuration / 2, +a.fade_in));
      if (a.fade_out != null) patch.fadeOut = Math.max(0, Math.min(nextDuration / 2, +a.fade_out));
      const commandError = dispatch(ctx, "overlay.update", { id: o.id, patch });
      if (commandError === "NO_API") ctx.overlays = ovs.map((x, k) => (k === i ? { ...x, ...patch, transform: t } : x));
      else if (commandError) return `שגיאה: ${commandError}`;
      const updated = { ...o, ...patch, transform: t };
      return `שכבה id=${o.id} עודכנה: x=${Math.round(updated.transform.x)}, y=${Math.round(updated.transform.y)}, ${Math.round(updated.transform.w)}×${Math.round(updated.transform.h)}, z=${updated.zIndex}.`;
    },
  },
  {
    name: "delete_clips", label: "מחיקת קליפים", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "delete_clips",
      description: "מוחק כמה קליפים בבת אחת. העבר indices=[16,17,18] או from_index+to_index (כולל). חובה במקום לולאת delete_clip.",
      parameters: {
        type: "object",
        properties: {
          indices: { type: "array", items: { type: "number" }, description: "אינדקסים 1-based למחיקה" },
          from_index: { type: "number", description: "תחילת טווח (1-based, כולל)" },
          to_index: { type: "number", description: "סוף טווח (1-based, כולל)" },
        },
      },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const before = ctx.clips!.length;
      if (Array.isArray(a.indices) && a.indices.length) {
        setClips(ctx, deleteClipsAt(ctx.clips!, a.indices.map((x: any) => +x)));
      } else if (a.from_index != null && a.to_index != null) {
        setClips(ctx, deleteClipRange(ctx.clips!, +a.from_index, +a.to_index));
      } else {
        return "שגיאה: העבר indices או from_index+to_index.";
      }
      const n = before - ctx.clips!.length;
      return n ? `נמחקו ${n} קליפים. ${ctx.clips!.length ? clipsSummary(ctx.clips!) : "אין קליפים."}` : "לא נמחק כלום (אינדקסים לא תקינים?).";
    },
  },
  {
    name: "keep_source_range", label: "שמירת טווח מקור", color: "#f59e0b", icon: "🎯",
    schema: {
      name: "keep_source_range",
      description: "משאיר רק קליפים שחופפים לטווח זמן במקור [start,end] ומקצץ גבולות. שימושי אחרי remove_silence על כל הסרטון — במקום למחוק עשרות קליפים.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "number", description: "התחלה בשניות במקור" },
          end: { type: "number", description: "סוף בשניות במקור" },
          source: { type: "string", description: "מקור (ברירת מחדל הראשי)" },
        },
        required: ["start", "end"],
      },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      const start = +a.start; const end = +a.end;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "שגיאה: טווח לא תקין.";
      setClips(ctx, keepSourceRange(ctx.clips!, start, end, asset?.id));
      return ctx.clips!.length
        ? `נשמר טווח ${start.toFixed(1)}–${end.toFixed(1)}s. ${clipsSummary(ctx.clips!)}`
        : "לא נשאר קליפ בטווח.";
    },
  },
  {
    name: "clear_clips", label: "ניקוי כל הקליפים", color: "#ef4444", icon: "🧹",
    schema: { name: "clear_clips", description: "מוחק את כל הקליפים בבת אחת (לאתחול EDL).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const n = ctx.clips?.length || 0;
      setClips(ctx, []);
      return `נוקו ${n} קליפים.`;
    },
  },
  {
    name: "render_video", label: "ייצוא הווידאו", color: "#22c55e", icon: "🎬",
    schema: { name: "render_video", description: "מרנדר ומייצא את הסרטון הסופי לפי הקליפים (בסדר). הרץ בסוף.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx, report) => {
      if (!ctx.media.length) return "שגיאה: לא נטען סרטון.";
      const err = requireClips(ctx); if (err) return err;
      let renderEDL: typeof import("@/lib/ffmpeg").renderEDL;
      try { ({ renderEDL } = await import("@/lib/ffmpeg")); }
      catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) והרץ ייצוא שוב."); }
      let edl = flattenVideoTracks(ctx.clips!, ctx.tracks || []);
      const aid = audioTrack(ctx.tracks || [])?.id;
      const audioClips = aid ? clipsOnTrack(ctx.clips!, aid, primaryVideoTrackId(ctx.tracks || [])) : [];
      if (!edl.length && audioClips.length) edl = [{ id: uid("g"), sourceId: "__gap__", start: 0, end: totalDur(audioClips), trackId: primaryVideoTrackId(ctx.tracks || []) }];
      const secs = edl.reduce((s, c) => s + (c.end - c.start), 0);
      report(secs > 90 ? `מרנדר ${Math.round(secs)}s בדפדפן — ייקח זמן…` : "מרנדר בדפדפן…");
      const blob = await renderEDL(
        ctx.media, edl,
        (r) => report(`מרנדר… ${Math.min(100, Math.round(r * 100))}%`),
        undefined,
        { audioMuted: audioMuted(ctx.tracks || []), audioClips, overlays: ctx.overlays || [], canvas: ctx.canvas || defaultCanvasFor() },
      );
      ctx.lastRender = blob;
      const base = (mainVideo(ctx)?.name || "video").replace(/\.[^.]+$/, "");
      return {
        text: "הייצוא הושלם — קישור להורדה ותצוגה מקדימה בצ'אט.",
        artifacts: [{ blob, name: `${base}_edited.mp4`, kind: "video" }],
      };
    },
  },
  {
    name: "generate_subtitles", label: "יצירת כתוביות", color: "#8b5cf6", icon: "💬",
    schema: {
      name: "generate_subtitles",
      description:
        "מייצר כתוביות בפעימות של ארבע-שש מילים, שבורות לפי מבנה המשפט (סוף משפט, פסיק, פאוזה, מילת קישור) " +
        "ולעולם לא באמצע צירוף כמו 'בית אלהינו' או 'רבי יוחנן'. כל מילה מופיעה בכתובית אחת בלבד — אין חזרה " +
        "על מילים שכבר הוצגו. אם המשתמש נתן טקסט נקי — חובה להעביר אותו ב-script; הכתיב נלקח ממנו והתזמון מהתמלול.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "טקסט נקי מהמשתמש — מתקן שגיאות כתיב של התמלול ומסלק זבל ASR" },
          words_per_cue: { type: "number", description: "מילים בפעימה (ברירת מחדל 5, טווח 3–8)" },
          max_chars_per_line: { type: "number", description: "אורך שורה מרבי (ברירת מחדל 24)" },
          max_lines: { type: "number", description: "1 או 2 (ברירת מחדל 2)" },
          reveal: {
            type: "string",
            enum: ["phrase", "progressive"],
            description: "phrase=ברירת המחדל, פעימה שלמה בלי חזרות. progressive=חשיפה מצטברת מילה-מילה (מילים חוזרות; רק אם המשתמש ביקש מפורשות)",
          },
        },
      },
    },
    run: async (a, ctx) => {
      if (!ctx.words && !Object.keys(ctx.transcripts || {}).length) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      const main = mainVideo(ctx);
      const clips = ctx.clips?.length ? ctx.clips : main ? [{ id: uid(), sourceId: main.id, start: 0, end: ctx.duration || main.duration }] : [];
      if (!clips.length) return "אין תוכן ליצירת כתוביות.";
      const getWords = (sid: string) => ctx.transcripts[sid] ?? (sid === main?.id ? ctx.words : null);
      const script = String(a.script || ctx.script || "").trim();
      if (script) ctx.script = script;

      // חשיפה מצטברת נשארת אפשרית, אבל רק בבקשה מפורשת — היא חוזרת על מילים
      if (String(a.reveal || "").toLowerCase() === "progressive") {
        const legacy = script
          ? edlToSubsWithScript(clips, getWords, script, 28, { mode: "progressive" })
          : edlToSubs(clips, getWords, 28, { mode: "progressive" });
        setSubs(ctx, legacy);
        return `נוצרו ${legacy.length} כתוביות בחשיפה מצטברת (לפי בקשה מפורשת). שים לב: במצב הזה מילים חוזרות בין כתוביות עוקבות.`;
      }

      const timeline = assembleTranscript(clips, getWords);
      if (!timeline.length) return "אין מילים על הציר. תמלל את המקורות ואז נסה שוב.";
      const built = script
        ? captionTokensFromScript(timeline, script)
        : { tokens: captionTokensFromTranscript(timeline), interpolated: [] as number[], dropped: 0, coverage: 1 };

      const policy = {
        ...CAPTION_POLICY,
        targetWords: Math.max(3, Math.min(8, (a.words_per_cue | 0) || CAPTION_POLICY.targetWords)),
        maxCharsPerLine: Math.max(12, (a.max_chars_per_line | 0) || CAPTION_POLICY.maxCharsPerLine),
        maxLines: a.max_lines === 1 ? 1 : CAPTION_POLICY.maxLines,
      };
      const cues = buildCaptionCues(built.tokens, { policy, limitSec: assembledDuration(clips) });
      setSubs(ctx, cues.map((cue) => ({ id: uid("s"), start: cue.start, end: cue.end, text: cue.text })));

      const audit = auditCaptions(cues, policy);
      const averageWords = cues.length
        ? (cues.reduce((sum, cue) => sum + (cue.tokenTo - cue.tokenFrom), 0) / cues.length).toFixed(1)
        : "0";
      const notes: string[] = [];
      if (built.dropped) notes.push(`${built.dropped} מילות תמלול שאינן בטקסט לא נכנסו`);
      if (built.interpolated.length) {
        notes.push(`${built.interpolated.length} מילים מהטקסט לא נמצאו בתמלול וקיבלו תזמון מוערך`);
      }
      if (!audit.pass) {
        notes.push(`בקרה: חזרות ${audit.repeatedWordPairs}, חפיפות ${audit.overlaps.length}, מהירות מדי ${audit.tooFast.length}`);
      }
      return `נוצרו ${cues.length} כתוביות, ${averageWords} מילים בממוצע לפעימה, שבירה לפי מבנה משפט, אפס חזרות על מילים.`
        + (script ? " הכתיב נלקח מהטקסט שלך והתזמון מהתמלול." : " ללא טקסט נקי — הכתיב הוא של התמלול; העבר script לתיקון.")
        + (notes.length ? `\n${notes.join("; ")}.` : "");
    },
  },
  {
    name: "list_subtitles", label: "רשימת כתוביות", color: "#8b5cf6", icon: "📃",
    schema: { name: "list_subtitles", description: "מחזיר את הכתוביות (אינדקס 1-based, זמן, טקסט).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => ctx.subs?.length ? ctx.subs.map((s, i) => `${i + 1}. [${s.start.toFixed(1)}–${s.end.toFixed(1)}] ${s.text}`).join("\n") : "אין כתוביות. הרץ generate_subtitles.",
  },
  {
    name: "set_caption_style", label: "עיצוב כתוביות", color: "#8b5cf6", icon: "✨",
    schema: {
      name: "set_caption_style",
      description: "מגדיר עיצוב כתוביות אמיתי בתצוגה המקדימה ובצריבה לייצוא. לפרסומת עברית מומלץ: bold=true, bg=box או soft, position=bottom, font_size=5.5.",
      parameters: {
        type: "object",
        properties: {
          font_size: { type: "number", description: "אחוז מהצלע הקצרה, 2..12" },
          color: { type: "string", description: "צבע hex כגון #ffffff" },
          bold: { type: "boolean" },
          position: { type: "string", enum: ["bottom", "center", "top"] },
          bg: { type: "string", enum: ["none", "soft", "box"] },
        },
      },
    },
    run: async (a, ctx) => {
      const patch: Record<string, unknown> = {};
      if (a.font_size != null) patch.fontSize = +a.font_size;
      if (a.color != null) patch.color = String(a.color);
      if (a.bold != null) patch.bold = a.bold === true;
      if (a.position != null) patch.position = String(a.position);
      if (a.bg != null) patch.bg = String(a.bg);
      const commandError = dispatch(ctx, "caption.setStyle", patch);
      if (commandError === "NO_API") return "עיצוב כתוביות אינו זמין בלי עורך פעיל.";
      if (commandError) return `שגיאה: ${commandError}`;
      return "עיצוב הכתוביות עודכן בתצוגה המקדימה ובייצוא.";
    },
  },
  {
    name: "edit_subtitle", label: "עריכת כתובית", color: "#a855f7", icon: "✏️",
    schema: { name: "edit_subtitle", description: "משנה טקסט של כתובית אחת. לתיקון המוני/סנכרון — clear_subtitles + generate_subtitles(script), לא לולאת edit.", parameters: { type: "object", properties: { index: { type: "number", description: "מספר הכתובית (1-based)" }, text: { type: "string" } }, required: ["index", "text"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      const id = ctx.subs[i].id;
      const commandError = dispatch(ctx, "subtitle.edit", { id, text: String(a.text) });
      if (commandError === "NO_API") ctx.subs = ctx.subs.map((s, k) => (k === i ? { ...s, text: String(a.text) } : s));
      else if (commandError) return `שגיאה: ${commandError}`;
      return `כתובית ${i + 1} עודכנה: "${a.text}"`;
    },
  },
  {
    name: "retime_subtitle", label: "תזמון כתובית", color: "#a855f7", icon: "⏲️",
    schema: { name: "retime_subtitle", description: "משנה את זמני ההופעה של כתובית (start/end בשניות על הציר הסופי).", parameters: { type: "object", properties: { index: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["index", "start", "end"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      const id = ctx.subs[i].id;
      const commandError = dispatch(ctx, "subtitle.retime", { id, start: +a.start, end: +a.end });
      if (commandError === "NO_API") ctx.subs = ctx.subs.map((s, k) => (k === i ? { ...s, start: Math.max(0, +a.start), end: Math.max(Math.max(0, +a.start) + 0.2, +a.end) } : s));
      else if (commandError) return `שגיאה: ${commandError}`;
      return `תוזמנה כתובית ${i + 1}.`;
    },
  },
  {
    name: "delete_subtitle", label: "מחיקת כתובית", color: "#ef4444", icon: "🗑️",
    schema: { name: "delete_subtitle", description: "מוחק כתובית.", parameters: { type: "object", properties: { index: { type: "number" } }, required: ["index"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      const id = ctx.subs[i].id;
      const commandError = dispatch(ctx, "subtitle.delete", { id });
      if (commandError === "NO_API") ctx.subs = ctx.subs.filter((_, k) => k !== i);
      else if (commandError) return `שגיאה: ${commandError}`;
      return `נמחקה כתובית ${i + 1}. נשארו ${ctx.subs.length}.`;
    },
  },
  {
    name: "clear_subtitles", label: "מחיקת כל הכתוביות", color: "#ef4444", icon: "🧹",
    schema: { name: "clear_subtitles", description: "מוחק את כל הכתוביות בבת אחת (השתמש בזה במקום למחוק אחת-אחת).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const n = ctx.subs?.length || 0;
      const commandError = dispatch(ctx, "subtitle.clear");
      if (commandError === "NO_API") ctx.subs = [];
      else if (commandError) return `שגיאה: ${commandError}`;
      return `נמחקו כל ${n} הכתוביות.`;
    },
  },
  {
    name: "export_srt", label: "ייצוא SRT", color: "#8b5cf6", icon: "⬇️",
    schema: { name: "export_srt", description: "מייצא את הכתוביות הנוכחיות כקובץ SRT (לא צרוב) — קישור בצ'אט.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות. הרץ generate_subtitles.";
      const { contextualFileName } = await import("@/lib/chat/markdown");
      const sample = (ctx.subs?.[0]?.text || mainVideo(ctx)?.name || "כתוביות").slice(0, 40);
      const name = contextualFileName(sample, "srt", (mainVideo(ctx)?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt");
      const blob = new Blob([subsToSrt(ctx.subs)], { type: "text/plain;charset=utf-8" });
      return {
        text: `יוצא SRT (${ctx.subs.length} כתוביות) — קישור להורדה בצ'אט.`,
        artifacts: [{ blob, name, kind: "srt" }],
      };
    },
  },
  {
    name: "import_srt", label: "ייבוא SRT", color: "#8b5cf6", icon: "📥",
    schema: { name: "import_srt", description: "טוען כתוביות מתוכן SRT שהמשתמש הדביק.", parameters: { type: "object", properties: { content: { type: "string", description: "תוכן קובץ ה-SRT" } }, required: ["content"] } },
    run: async (a, ctx) => {
      const subs = parseSrt(String(a.content || ""));
      if (!subs.length) return "לא זוהו כתוביות בתוכן.";
      setSubs(ctx, subs);
      return `יובאו ${subs.length} כתוביות. אפשר לערוך/לייצא.`;
    },
  },
  {
    name: "list_stt_models", label: "מודלי תמלול", color: "#8b5cf6", icon: "🧬",
    schema: {
      name: "list_stt_models",
      description: "מציג מודלי תמלול זמינים (ElevenLabs Scribe וכו') ואת ברירת המחדל הנוכחית. השתמש כשהמשתמש מבקש מודל אחר או לשאול מה אפשרי.",
      parameters: { type: "object", properties: {} },
    },
    run: async () => {
      const configured = await fetchTranscribeConfigured();
      if (configured.elevenlabs) {
        return "התמלול האיכותי מוכן. Hypescript בוחר ומנהל את המנוע אוטומטית; במקרה של עומס או סיום מכסה יופעל מנוע גיבוי ותוצג אזהרת איכות.";
      }
      if (configured.groq) {
        return "מנוע הגיבוי זמין כרגע. איכות התמלול עשויה להיות נמוכה יותר עד ששירות התמלול האיכותי יחזור.";
      }
      return "שירות התמלול אינו זמין כרגע.";
    },
  },
  {
    name: "list_voices", label: "קולות קריינות", color: "#a855f7", icon: "🎙️",
    schema: {
      name: "list_voices",
      description: "מציג קולות ElevenLabs זמינים (שם, voice_id, קטגוריה, תיאור) כדי שהמשתמש/הסוכן יבחרו קול לקריינות. דורש ELEVENLABS_API_KEY.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "סינון לפי שם/תיאור" },
          limit: { type: "number", description: "כמה קולות להציג (ברירת מחדל 20)" },
        },
      },
    },
    run: async (a) => {
      const qs = new URLSearchParams({ page_size: String(Math.min(50, Math.max(1, +(a.limit || 20)))) });
      if (a.search) qs.set("search", String(a.search));
      const resp = await fetch(`/api/elevenlabs/voices?${qs}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "נכשל בטעינת קולות.");
      const voices = data.voices || [];
      if (!voices.length) return "לא נמצאו קולות. ודא שיש ELEVENLABS_API_KEY ושהמפתח כולל Voices: Read.";
      return `קולות ElevenLabs (${voices.length}${data.has_more ? "+" : ""}):\n` +
        voices.map((v: any, i: number) => {
          const labels = v.labels && typeof v.labels === "object"
            ? Object.entries(v.labels).map(([k, val]) => `${k}=${val}`).join(", ")
            : "";
          return `${i + 1}. ${v.name} · id=${v.voice_id}${v.category ? ` · ${v.category}` : ""}${labels ? ` · ${labels}` : ""}${v.description ? `\n   ${String(v.description).slice(0, 120)}` : ""}`;
        }).join("\n") +
        "\n\nלקריינות: generate_narration(text=..., voice_id=...).";
    },
  },
  {
    name: "generate_background_music", label: "יצירת מוזיקת רקע", color: "#0ea5e9", icon: "🎵",
    schema: {
      name: "generate_background_music",
      description: "יוצר מוזיקת רקע מקורית ומורשית דרך ElevenLabs באורך מדויק לציר. השתמש במקום הורדת שיר מוכר ללא רישיון. התאם מצב רוח, קצב ועוצמה לתוכן, וברירת המחדל אינסטרומנטלית כדי לא להתחרות בדיבור.",
      parameters: { type: "object", properties: {
        prompt: { type: "string", description: "תיאור מוזיקלי מפורט ללא שמות אמנים, שירים או מילים מוגנות" },
        duration_seconds: { type: "number", description: "משך מדויק; ברירת מחדל סוף הציר" },
        instrumental: { type: "boolean", description: "ללא שירה (ברירת מחדל true)" },
      }, required: ["prompt"] },
    },
    run: async (a, ctx, report) => {
      const prompt = String(a.prompt || "").trim();
      if (!prompt) return "שגיאה: חסר תיאור מוזיקלי.";
      if (/(בסגנון של|שיר של|artist\s*:|song by)/i.test(prompt)) return "לא ניתן לחקות אמן או שיר מוגן. תאר ז׳אנר, מצב רוח, כלים וקצב בלי שם מסחרי.";
      const timeline = Math.max(3, projectDuration(ctx.clips || [], ctx.tracks || []), ctx.duration || 0);
      const duration = Math.max(3, Math.min(600, Number(a.duration_seconds) || timeline));
      report(`יוצר מוזיקת רקע מקורית באורך ${duration.toFixed(1)} שניות…`);
      const response = await fetch("/api/elevenlabs/music", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, durationSec: duration, instrumental: a.instrumental !== false }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "יצירת המוזיקה נכשלה."); }
      const blob = await response.blob();
      const { contextualFileName } = await import("@/lib/chat/markdown");
      const name = contextualFileName(prompt, "audio", "background_music.mp3");
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      const asset: MediaAsset = { id: uid("music"), name, kind: "audio", file, duration, url: URL.createObjectURL(file) };
      const { asset: registered } = registerMediaAsset(ctx, asset);
      return { text: `מוזיקת רקע מקורית נוצרה באורך ${duration.toFixed(1)} שניות ונוספה למדיה כ־@media:${registered.id}. אפשר להוסיף אותה לרצועת האודיו ולהנמיך מתחת לדיבור.`, artifacts: [{ blob, name, kind: "audio" }] };
    },
  },
  {
    name: "generate_narration", label: "יצירת קריינות", color: "#a855f7", icon: "🗣️",
    schema: {
      name: "generate_narration",
      description:
        "יוצר קריינות מדויקת בעברית מטקסט דרך ElevenLabs TTS. " +
        "אם אין voice_id — קרא קודם list_voices והצג למשתמש אפשרויות (ask_user), או בחר קול מתאים. " +
        "מודלים: eleven_v3 (רגשי, תגיות [laughs]/[whispers]), eleven_multilingual_v2 (ארוך/יציב), eleven_flash_v2_5 (מהיר).",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "הטקסט לקריינות" },
          voice_id: { type: "string", description: "מזהה הקול מ-list_voices" },
          model_id: { type: "string", description: "מודל TTS (ברירת מחדל eleven_v3)" },
          language_code: { type: "string", description: "קוד שפה (ברירת מחדל he)" },
          stability: { type: "number" },
          similarity_boost: { type: "number" },
          style: { type: "number" },
        },
        required: ["text", "voice_id"],
      },
    },
    run: async (a, ctx, report) => {
      const text = String(a.text || "").trim();
      const voiceId = String(a.voice_id || "").trim();
      if (!text) return "שגיאה: חסר טקסט.";
      if (!voiceId) return "שגיאה: חסר voice_id. הרץ list_voices ובחר קול.";
      report("יוצר קריינות ב-ElevenLabs…");
      const resp = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          model_id: a.model_id || DEFAULT_TTS_MODEL,
          language_code: a.language_code || "he",
          stability: a.stability,
          similarity_boost: a.similarity_boost,
          style: a.style,
        }),
      });
      if (!resp.ok) {
        let err = "יצירת הקריינות נכשלה.";
        try { err = (await resp.json()).error || err; } catch { /* ignore */ }
        throw new Error(err);
      }
      const blob = await resp.blob();
      const modelId = resp.headers.get("X-Model-Id") || a.model_id || DEFAULT_TTS_MODEL;
      const { contextualFileName } = await import("@/lib/chat/markdown");
      const name = contextualFileName(text, "audio", `narration_${voiceId.slice(0, 8)}.mp3`);
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      const url = URL.createObjectURL(file);
      // משך משוער — נטען אסינכרונית אם אפשר
      let duration = 0;
      try {
        duration = await new Promise<number>((resolve, reject) => {
          const audio = new Audio();
          audio.preload = "metadata";
          audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
          audio.onerror = () => reject(new Error("meta"));
          audio.src = url;
        });
      } catch { /* ignore */ }
      const narrationAsset: MediaAsset = {
        id: uid("a"),
        name,
        kind: "audio",
        file,
        duration: duration || Math.max(1, text.length / 12),
        url,
      };
      const { asset: registered } = registerMediaAsset(ctx, narrationAsset);
      // סוף הציר המדויק (מקסימום על פני כל הרצועות — וידאו ואודיו) — הנקודה שבה מתחיל האאוטרו
      const timelineStart = (() => {
        const clips = ctx.clips || [];
        if (!clips.length) return 0;
        const primary = primaryVideoTrackId(ctx.tracks || []);
        const ends = new Map<string, number>();
        for (const c of clips) {
          const tid = clipTrackId(c, primary);
          const start = ends.get(tid) ?? 0;
          ends.set(tid, start + clipDur(c));
        }
        return Math.max(0, ...ends.values());
      })();
      const audioTrackName = audioTrack(ctx.tracks || [])?.name || audioTrack(ctx.tracks || [])?.id || "אודיו";
      return {
        text: formatNarrationResult({
          asset: registered,
          blobSize: blob.size,
          modelId,
          voiceId,
          timelineStart,
          audioTrackName,
        }),
        artifacts: [{ blob, name, kind: "audio" }],
      };
    },
  },
  {
    name: "generate_image", label: "יצירת תמונה (OpenAI)", color: "#f97316", icon: "🎨",
    schema: {
      name: "generate_image",
      description:
        "מייצר תמונה חדשה עם OpenAI GPT Image (gpt-image-1) מתיאור טקסט. " +
        "השתמש רק כשהמשתמש ביקש ויזואל חדש/נוצר ואין נכס קיים שמתאים (בדוק list_media / get_brand_kit קודם). " +
        "התמונה נשמרת במדיה ומחזירה @media:<id> יציב. use_brand=true (ברירת מחדל) מצרף בריף מותג קצר (ארגון/סלוגן/צבעים/ניסוח בלבד — בלי קבצים). " +
        "אל תבקש לצייר לוגו — ללוגו אמיתי השתמש ב-use_brand_asset.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "תיאור התמונה בעברית/אנגלית" },
          size: { type: "string", enum: ["1024x1024", "1536x1024", "1024x1536"], description: "גודל (ברירת מחדל 1024x1024)" },
          quality: { type: "string", enum: ["auto", "low", "medium", "high"], description: "איכות (ברירת מחדל auto)" },
          background: { type: "string", enum: ["auto", "opaque", "transparent"], description: "רקע (ברירת מחדל auto)" },
          use_brand: { type: "boolean", description: "false=בלי בריף מותג (ברירת מחדל true)" },
        },
        required: ["prompt"],
      },
    },
    run: async (a, ctx, report) => {
      const prompt = String(a.prompt || "").trim();
      if (!prompt) return "שגיאה: חסר prompt לתיאור התמונה.";
      const kit = ctx.brandKit ?? (await getActiveBrandKit());
      const useBrand = a.use_brand !== false;
      const finalPrompt = buildImagePrompt(prompt, kit, useBrand);
      report("מייצר תמונה ב-OpenAI GPT Image…");
      const resp = await fetch("/api/openai/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          size: a.size,
          quality: a.quality,
          background: a.background,
        }),
      });
      if (!resp.ok) {
        let err = "יצירת התמונה נכשלה.";
        try { err = (await resp.json()).error || err; } catch { /* ignore */ }
        throw new Error(err);
      }
      const blob = await resp.blob();
      const model = resp.headers.get("X-Image-Model") || "gpt-image-1";
      const size = resp.headers.get("X-Image-Size") || "1024x1024";
      const { contextualFileName } = await import("@/lib/chat/markdown");
      const name = contextualFileName(prompt, "image", `generated_${size.replace("x", "_")}.png`);
      const file = new File([blob], name, { type: blob.type || "image/png" });
      const url = URL.createObjectURL(file);
      const imageAsset: MediaAsset = {
        id: uid("img"),
        name,
        kind: "image",
        file,
        duration: 4,
        url,
      };
      const { asset: registered } = registerMediaAsset(ctx, imageAsset);
      return {
        text: formatImageResult({ asset: registered, model, size }),
        artifacts: [{ blob, name, kind: "image" }],
      };
    },
  },
  {
    name: "audit_edit", label: "בדיקת קבלה", color: "#0f766e", icon: "✅",
    schema: {
      name: "audit_edit",
      description:
        "שער הקבלה לפני ייצוא. בודק ארבעה דברים יחד: (1) שכל מילה מהטקסט שהמשתמש ביקש באמת נמצאת בפלט; " +
        "(2) אינווריאנטות הציר — אין חזרה על זמן-מקור, אין מילה חתוכה, אין קליפ לא תקין; " +
        "(3) איכות המעברים — האם כל קאט נופל בשקט מדוד בגל-הקול; (4) איכות הכתוביות — חזרות, חפיפות, קצב קריאה. " +
        "חובה להריץ לפני render_video. אם יש כשלים — תקן אותם, אל תרנדר.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "הטקסט המקורי לבדיקת כיסוי (ברירת מחדל: זה שנשמר מ-keep_by_script)" },
          measure_audio: { type: "boolean", description: "true=מדוד גם את איכות המעברים בגל-הקול (ברירת מחדל true)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      const missing = requireClips(ctx);
      if (missing) return missing;
      const main = mainVideo(ctx);
      const getWords = (sid: string) => ctx.transcripts[sid] ?? (sid === main?.id ? ctx.words : null);

      const envelopes = new Map<string, Awaited<ReturnType<typeof analysisFor>>>();
      if (a.measure_audio !== false) {
        report("מודד את איכות המעברים…");
        for (const sourceId of [...new Set(ctx.clips!.map((c) => c.sourceId))]) {
          envelopes.set(sourceId, await analysisFor(mediaById(ctx.media, sourceId), report));
        }
      }

      const audit = auditEdit({
        clips: ctx.clips!,
        wordsBySource: getWords,
        scriptText: String(a.script || ctx.script || "") || null,
        subtitles: ctx.subs?.map((s) => ({ start: s.start, end: s.end, text: s.text })) ?? null,
        envelopeBySource: (sourceId) => envelopes.get(sourceId)?.envelope ?? null,
      });
      return formatAudit(audit);
    },
  },
  {
    name: "ask_user", label: "שאלה למשתמש", color: "#eab308", icon: "❓",
    schema: { name: "ask_user", description: "שואל את המשתמש שאלה עם אפשרויות, או מבקש קובץ/מידע חסר.", parameters: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } }, required: ["question", "options"] } },
    run: async (a, ctx) => `המשתמש בחר: ${await ctx.askUser(String(a.question || ""), a.options || [])}`,
  },
];

export const TOOL_SCHEMAS = TOOLS.map((t) => t.schema);
export const TOOL_BY_NAME: Record<string, ToolMeta> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

export const SYSTEM_PROMPT = `אתה סוכן עריכת הווידאו של Hypescript. אתה עורך בשיחה סרטונים מכל סוג — תוכן בעברית, רשתות, עסקים, אירועים, משפחה, הרצאות ופודקאסטים — מחומר גלם ועד ייצוא מוכן.

═══ מה נחשב הצלחה ═══
הפלט מכיל **בדיוק** את הטקסט שהמשתמש ביקש — לא מילה פחות ולא מילה יותר; כל קאט נופל בשקט מדוד ולא באמצע הברה; הכתוביות קריאות ומכובדות. אם אחד מהשלושה לא מתקיים — העבודה לא הסתיימה, גם אם כל הכלים "הצליחו". אל תדווח הצלחה לפני audit_edit.

═══ שלב 0: קריאת הבריף (אל תדלג) ═══
בריף של לקוח מערבב חמישה סוגי טקסט. סיווג שגוי הוא הכשל הנפוץ ביותר — הוא מכניס כותרות ופרסומות לתוך הסרטון או משמיט תוכן אמיתי.
א. **טקסט מדובר לשמירה** — מה שנאמר בהקלטה וצריך להישאר. רק זה נכנס ל-keep_by_script ולכתוביות.
ב. **מטא/כותרות** — "הקלטה ראשונה", "פתיח וכותרת:", תיאור שיווקי של השיעור. לא נכנס לסרטון ולא לכתוביות.
ג. **טקסט מסך** — שורות שמסומנות כציטוט/כרטיס (למשל אחרי ">>>") שנועדו להופיע כשכבה, לא כדיבור.
ד. **הוראות עריכה** — "הסאונד הולך ונחלש", "מעבר לטקסט הבא", "תשים לוגו". פעולות, לא תוכן.
ה. **טקסט חדש שלא נאמר** (CTA/אאוטרו) — נוצר בקריינות/כרטיס בסוף. **אסור** שייכנס ל-keep_by_script.

כלל ההכרעה: קטע הוא "טקסט מדובר" רק אם הוא באמת בתמלול. כשיש ספק — find_in_transcript על 4–6 מילים ממנו. לא נמצא ⇒ אינו טקסט מדובר.
שלילות מפורשות של המשתמש ("אל תשים פופ-אפ", "בלי מוזיקה") הן אילוץ קשיח שגובר על כל ברירת מחדל ועל כל תבנית.
לפני שמתחילים לחתוך, אמור בשורה אחת מה סיווגת כטקסט לשמירה, מה כשכבות/CTA, ומה נדחה לסוף. אם משפט אחד באמת דו-משמעי — ask_user פעם אחת בלבד, ובינתיים המשך בשלבים שאינם תלויים בו.

═══ הזרימה הקנונית ═══
1. transcribe_video — ElevenLabs Scribe עדיף לעברית (חותמות מילה, אירועי שמע, דוברים). keyterms לשמות ומונחים תורניים.
2. keep_by_script(script=הטקסט המדובר בלבד, pacing=...) — **פעולה אחת** שמיישרת, מסירה מה שלא בטקסט, מהדקת פאוזות וממקמת כל קאט בעמק השקט. אל תריץ remove_silence אחריה; זה כבר נעשה.
   pacing: broadcast=שיעור/דרשה (שומר פאוזה רטורית) · natural=ברירת מחדל · tight=פרסומת/רשתות ("בלי שנייה מיותרת").
3. אם keep_by_script דיווח על מילים חסרות — **עצור וטפל**. בדוק אם נאמרו (find_in_transcript); אם לא נאמרו, אמור זאת למשתמש. אל תמשיך כאילו הכל תקין.
4. transcribe_timeline(remap) — לרענון הזמנים על הציר הערוך.
5. generate_subtitles(script=אותו טקסט) — פעימות של 4–6 מילים, שבירה לפי מבנה משפט, בלי חזרות. set_caption_style לעיצוב.
6. שכבות/לוגו/כרטיסים, ואז CTA/אאוטרו (קריינות + כרטיס) אם ביקשו.
7. **audit_edit** — חובה. יש כשלים ⇒ תקן, אל תרנדר.
8. render_video רק בסוף או לפי בקשה.

═══ אינווריאנטות (אסור להפר) ═══
1. **מילה של המשתמש לא נעלמת בשקט.** keep_by_script מדווח בדיוק מה לא נמצא. תמיד העבר את הדיווח הזה למשתמש; לעולם אל תסתיר אותו מאחורי "בוצע".
2. **טקסט CTA/כותרת לעולם לא נכנס ל-keep_by_script.** הוא לא נאמר, ולכן היישור יסמן אותו כחסר וייצור רעש.
3. **אין חזרה על זמן-מקור.** אם קליפ נגמר ב-29.8, הבא מאותו מקור מתחיל ב-29.8 או אחריו.
4. **כתוביות בלי חזרות.** ברירת המחדל היא פעימה שלמה. reveal="progressive" חוזר על מילים בכוונה — רק אם המשתמש ביקש את האפקט הזה מפורשות.
5. **הכתיב מהמשתמש.** תמיד generate_subtitles(script=...). לעולם אל תשאיר שיבוש ASR בכתוביות.
6. **אל תתקן כתוביות בלולאה.** לא מסונכרן/משובש ⇒ clear_subtitles + generate_subtitles(script) פעם אחת. edit_subtitle רק לתיקון נקודתי בודד.
7. **אל תמחק קליפים בלולאה.** delete_clips / keep_source_range / clear_clips. מעל 3 מחיקות בודדות נחסם.
8. **אל תיגע בעבודה שכבר סודרה.** נאמר שתמונת סיום/קריינות/לוגו מסודרים ⇒ אל תשנה ואל תבנה מחדש. עדכון שכבה רק לפי overlay_id + expected_source.
9. **אל תמציא נכסים.** אין לוגו/קול/תמונה ⇒ get_brand_kit, ואם אין — ask_user פעם אחת כשמגיעים לשלב, לא לפניו.
10. **נכס חסר אינו חוסם.** "אביא אחר כך" ⇒ בצע את כל השאר במלואו, ובקש בסוף.

═══ מדידה מול ניחוש ═══
- תווית audio_event מספק התמלול = ראיה ישירה.
- inspect_timeline_evidence(classify_sounds=true) מסווג נשימה / כחכוח / חבטה-גרירת רהיט / צחוק לפי מאפיינים אקוסטיים נמדדים, עם ביטחון. אמור "מאפיינים תואמים ל…", לא "היה שיעול".
- היעדר מילים בתמלול אינו ראיה לשקט. אל תסיק סוג צליל בלי אחד משני המקורות האלה.
- צחוק קהל נשמר כברירת מחדל (keep_laughter). הסר רק אם ביקשו.

═══ פרוטוקולי כשל ═══
- "Loading chunk … failed" ⇒ בקש Ctrl+Shift+R מיד. אל תנסה שוב בלי רענון.
- ספק 503 / "too busy" / Failed to fetch ⇒ עצור, דווח בשורה, אל תלולאה.
- audit_edit נכשל ⇒ תקן את הסיבה שדווחה. כיסוי חסר ⇒ בדוק את הטקסט. מילים חתוכות ⇒ pacing רגוע יותר. חזרות בכתוביות ⇒ בנה מחדש.
- אין ניתוח גל-קול (הכלי מדווח על כך) ⇒ אמור למשתמש שהחיתוך פחות מדויק. אל תתחזה לדיוק שאין.

═══ כלים ═══
- keep_by_script(script, pacing, remove_fillers, keep_laughter, append) — חיתוך+הידוק+מיקום מדויק בפעולה אחת. append לריבוי מקורות.
- remove_silence — רק כשאין טקסט מוגדר, או להידוק נוסף. after keep_by_script: within_existing.
- audit_edit(script) — שער הקבלה. חובה לפני render.
- inspect_timeline_evidence(classify_sounds) / analyze_audio / find_in_transcript / get_transcript(timeline=true) / transcribe_timeline.
- generate_subtitles(script, words_per_cue, max_chars_per_line, reveal) · set_caption_style · clear_subtitles · export_srt · import_srt.
- keep_source_range / delete_clips / clear_clips / trim_clip / split_clip / move_clip.
- add_video_track / move_clip_to_track / list_tracks — מונטאז' ו-B-roll.
- add_clip(placement="timeline"|"overlay", timeline_start) · add_image_overlay(preset="logo_top_left|logo_top_right|fit_canvas", match_clip_id, locked) · add_text_overlay(preset="source_popup|speaker_card|dedication_card") · update_overlay/delete_overlay (overlay_id + expected_source חובה).
- set_clip_audio_fades / set_clip_visual_fades / set_clip_color / set_clip_volume.
- get_brand_kit → use_brand_asset ללוגו אמיתי. generate_image רק כשאין נכס מתאים; לעולם לא לצייר לוגו.
- list_voices → generate_narration(text, voice_id) → add_clip(@media:<id>, timeline_start, track=אודיו). תמונת סיום שחופפת לקריינות: add_clip(image, placement="timeline", timeline_start=אותו זמן, match_source="@media:<id הקריינות>"). כך משך התמונה נלקח מהקריינות בלי ניחוש. ודא ב-list_clips ששני הטווחים זהים.
- generate_background_music(prompt, duration_seconds) יוצר מוזיקה מקורית באורך הציר. אסור להוריד או לחקות שירים מוכרים ללא רישיון; למדיה מסחרית השתמש רק בקטלוג מורשה שהמשתמש חיבר.
- capture_frame(timeline=true) — אימות ויזואלי אחרי שינוי משמעותי. פעם אחת לנקודה, זה רינדור יקר.
- render_video / export_srt — התוצר חוזר ככרטיס בצ'אט; הפנה אליו, אל תמציא נתיב.

═══ סגנון ═══
- עברית, קצר מאוד: משפט מצב אחד לפני הכלים, משפט סיום אחד אחריהם. אל תספר ניסיונות או שרשרת מחשבה.
- markdown קל: **מודגש**, backticks לקוד, מקפים לרשימות, fence לבלוק להעתקה.
- דווח מספרים אמיתיים מהכלים (כיסוי, מספר קליפים, מעברים נקיים) — לא הערכות.
- שאלות: ask_user, ולא יותר מפעם אחת לנושא.`;

// תוספת הנחיה לפי מצב הסוכן. באחריות ה-runtime לא להעביר כלים כלל ב-ask/plan,
// כך שגם אם המודל "ירצה" לשנות — אין לו במה. ההנחיה מיישרת את ההתנהגות.
export const MODE_PROMPTS: Record<import("./types").AgentMode, string> = {
  ask: `\n\nמצב נוכחי: ASK (קריאה בלבד). אין לך כלים במצב זה ואינך יכול לשנות את הפרויקט. ענה על שאלות, הסבר את הפרויקט/התמלול/הציר, והצע צעדים. אם המשתמש מבקש לבצע עריכה — הסבר בקצרה מה צריך לעשות והצע לעבור למצב Act.`,
  plan: `\n\nמצב נוכחי: PLAN (תכנון בלבד). אין לך כלים ואינך משנה דבר. פתח בסיווג הבריף לחמשת הסוגים (טקסט מדובר לשמירה / מטא-כותרות / טקסט מסך / הוראות עריכה / טקסט CTA חדש), ורק אחר כך החזר checklist ב-Markdown, פעולה אחת בשורה בפורמט \"- [ ] ...\". ציין את ה-pacing המתאים (broadcast לשיעור, tight לפרסומת), את שער הקבלה audit_edit לפני הרינדור, מה יימחק, אילו כתוביות/נכסים יושפעו, ואילו החלטות באמת דורשות אישור. כשנאמר \"אביא אחר כך\", אל תהפוך את הנכס החסר לחסם. אל תטען שביצעת — רק תכנן; ממשק המשתמש יציג כפתור אישור שמעביר ל-Act.`,
  act: ``,
};
