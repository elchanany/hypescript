import express from "express";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "CLOUD_RENDER_TOKEN", "CLOUD_RENDER_CALLBACK_SECRET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const app = express();
app.use(express.json({ limit: "2mb" }));
const active = new Map();
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

function authorized(req, res, next) {
  if (req.headers.authorization !== `Bearer ${process.env.CLOUD_RENDER_TOKEN}`) return res.status(401).json({ error: "unauthorized" });
  next();
}

function run(command, args, signal, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let progressBuffer = "";
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr = (stderr + text).slice(-8000);
      if (!onProgress) return;
      progressBuffer += text;
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || "";
      for (const line of lines) {
        const match = line.match(/^out_time_(?:us|ms)=(\d+)$/);
        if (match) onProgress(Number(match[1]) / 1_000_000);
      }
    });
    const abort = () => child.kill("SIGKILL");
    signal.addEventListener("abort", abort, { once: true });
    child.on("error", reject);
    child.on("close", (code) => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
      else if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr}`));
    });
  });
}

async function hasAudio(path, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", path]);
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    const abort = () => child.kill("SIGKILL");
    signal.addEventListener("abort", abort, { once: true });
    child.on("error", reject);
    child.on("close", () => { signal.removeEventListener("abort", abort); resolve(output.trim().length > 0); });
  });
}

async function callback(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-render-callback-secret": process.env.CLOUD_RENDER_CALLBACK_SECRET },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`callback_${response.status}`);
}

function validJob(body) {
  if (!body || typeof body.jobId !== "string" || typeof body.bucket !== "string" || typeof body.callbackUrl !== "string" || typeof body.outputKey !== "string") return false;
  if (!Array.isArray(body.inputs) || !Array.isArray(body.clips) || body.clips.length < 1 || body.clips.length > 1000) return false;
  const ids = new Set(body.inputs.map((input) => input.id));
  const audio = Array.isArray(body.audioClips) ? body.audioClips : [];
  const overlays = Array.isArray(body.overlays) ? body.overlays : [];
  return body.inputs.every((input) => typeof input.id === "string" && typeof input.objectKey === "string")
    && body.clips.every((clip) => (clip.gap === true || ids.has(clip.assetId)) && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.start >= 0 && clip.end > clip.start)
    && audio.every((clip) => ids.has(clip.assetId) && Number.isFinite(clip.start) && Number.isFinite(clip.end) && Number.isFinite(clip.timelineStart))
    && overlays.every((overlay) => ids.has(overlay.assetId) && Number.isFinite(overlay.start) && Number.isFinite(overlay.end));
}

async function render(body, controller) {
  const startedAt = Date.now();
  const renderedSeconds = body.clips.reduce((total, clip) => total + clip.end - clip.start, 0);
  const work = await mkdtemp(join(tmpdir(), "hypescript-render-"));
  try {
    await callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress: 0.01 });
    const inputPaths = new Map();
    const inputMeta = new Map(body.inputs.map((input) => [input.id, input]));
    for (const [index, input] of body.inputs.entries()) {
      const path = join(work, `input-${index}`);
      const object = await s3.send(new GetObjectCommand({ Bucket: body.bucket, Key: input.objectKey }), { abortSignal: controller.signal });
      await pipeline(object.Body, createWriteStream(path), { signal: controller.signal });
      inputPaths.set(input.id, path);
      await callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress: 0.01 + 0.03 * ((index + 1) / Math.max(1, body.inputs.length)) });
    }

    const width = Math.max(320, Math.min(3840, Math.floor(body.target?.width || 1920)));
    const height = Math.max(240, Math.min(2160, Math.floor(body.target?.height || 1080)));
    const fps = Math.max(12, Math.min(60, Math.floor(body.target?.fps || 30)));
    const audioPresence = new Map();
    await Promise.all(body.inputs.map(async (input) => {
      if (String(input.mimeType || "").startsWith("image/")) { audioPresence.set(input.id, false); return; }
      audioPresence.set(input.id, await hasAudio(inputPaths.get(input.id), controller.signal));
    }));

    const args = ["-hide_banner", "-loglevel", "error"];
    const inputIndex = new Map();
    for (const [index, input] of body.inputs.entries()) {
      inputIndex.set(input.id, index);
      if (String(input.mimeType || "").startsWith("image/")) args.push("-loop", "1");
      args.push("-i", inputPaths.get(input.id));
    }
    const filters = [];
    const concatLabels = [];
    for (const [index, clip] of body.clips.entries()) {
      const duration = clip.end - clip.start;
      const frames = Math.max(1, Math.round(duration * fps));
      if (clip.gap) {
        filters.push(`color=c=black:s=${width}x${height}:r=${fps}:d=${duration.toFixed(6)},trim=end_frame=${frames},setpts=PTS-STARTPTS[v${index}]`);
        filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${duration.toFixed(6)},asetpts=PTS-STARTPTS[a${index}]`);
      } else {
        const source = inputIndex.get(clip.assetId);
        const image = String(inputMeta.get(clip.assetId)?.mimeType || "").startsWith("image/");
        const videoTrim = image ? `trim=duration=${duration.toFixed(6)}` : `trim=start=${clip.start.toFixed(6)}:end=${clip.end.toFixed(6)}`;
        filters.push(`[${source}:v:0]${videoTrim},setpts=PTS-STARTPTS,fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,trim=end_frame=${frames},setpts=PTS-STARTPTS[v${index}]`);
        if (audioPresence.get(clip.assetId)) filters.push(`[${source}:a:0]atrim=start=${clip.start.toFixed(6)}:end=${clip.end.toFixed(6)},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0,aformat=sample_rates=48000:channel_layouts=stereo[a${index}]`);
        else filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${duration.toFixed(6)},asetpts=PTS-STARTPTS[a${index}]`);
      }
      concatLabels.push(`[v${index}][a${index}]`);
    }
    filters.push(`${concatLabels.join("")}concat=n=${body.clips.length}:v=1:a=1[basev][basea]`);

    const audioClips = Array.isArray(body.audioClips) ? body.audioClips : [];
    const overlays = Array.isArray(body.overlays) ? body.overlays : [];
    const audioEnd = audioClips.reduce((max, clip) => Math.max(max, clip.timelineStart + clip.end - clip.start), 0);
    const overlayEnd = overlays.reduce((max, overlay) => Math.max(max, overlay.end), 0);
    const totalDuration = Math.max(renderedSeconds, audioEnd, overlayEnd);
    const extension = Math.max(0, totalDuration - renderedSeconds);
    let videoLabel = "basev";
    let audioLabel = "basea";
    if (extension > 0.001) {
      filters.push(`[basev]tpad=stop_mode=clone:stop_duration=${extension.toFixed(6)}[vpad]`);
      filters.push(`[basea]apad=pad_dur=${extension.toFixed(6)},atrim=duration=${totalDuration.toFixed(6)}[apad]`);
      videoLabel = "vpad"; audioLabel = "apad";
    }

    const extraAudioLabels = [];
    for (const [index, clip] of audioClips.entries()) {
      const source = inputIndex.get(clip.assetId);
      const duration = clip.end - clip.start;
      const fadeIn = Math.min(duration / 2, Math.max(0, Number(clip.fadeIn) || 0));
      const fadeOut = Math.min(duration / 2, Math.max(0, Number(clip.fadeOut) || 0));
      const fades = `${fadeIn ? `,afade=t=in:st=0:d=${fadeIn.toFixed(3)}` : ""}${fadeOut ? `,afade=t=out:st=${Math.max(0, duration - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}` : ""}`;
      const delay = Math.max(0, Math.round(clip.timelineStart * 1000));
      const volume = Number.isFinite(Number(clip.volume)) ? Math.max(0, Number(clip.volume)) : 1;
      filters.push(`[${source}:a:0]atrim=start=${clip.start.toFixed(6)}:end=${clip.end.toFixed(6)},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0,aformat=sample_rates=48000:channel_layouts=stereo,volume=${volume.toFixed(3)}${fades},adelay=${delay}|${delay}[ax${index}]`);
      extraAudioLabels.push(`[ax${index}]`);
    }
    if (extraAudioLabels.length) {
      filters.push(`[${audioLabel}]${extraAudioLabels.join("")}amix=inputs=${extraAudioLabels.length + 1}:duration=longest:dropout_transition=0,atrim=duration=${totalDuration.toFixed(6)}[mixa]`);
      audioLabel = "mixa";
    }

    for (const [index, overlay] of overlays.entries()) {
      const source = inputIndex.get(overlay.assetId);
      const duration = overlay.end - overlay.start;
      const opacity = Math.max(0, Math.min(1, Number(overlay.opacity) || 1));
      const fadeIn = Math.min(duration / 2, Math.max(0, Number(overlay.fadeIn) || 0));
      const fadeOut = Math.min(duration / 2, Math.max(0, Number(overlay.fadeOut) || 0));
      const alphaFades = `${fadeIn ? `,fade=t=in:st=0:d=${fadeIn.toFixed(3)}:alpha=1` : ""}${fadeOut ? `,fade=t=out:st=${Math.max(0, duration - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}:alpha=1` : ""}`;
      const rotation = Number(overlay.rotation) || 0;
      const rotate = Math.abs(rotation) > 0.01 ? `,rotate=${(rotation * Math.PI / 180).toFixed(8)}:ow=rotw(iw):oh=roth(ih):c=none` : "";
      filters.push(`[${source}:v:0]scale=${Math.max(8, Math.round(overlay.width))}:${Math.max(8, Math.round(overlay.height))},format=rgba,colorchannelmixer=aa=${opacity.toFixed(3)}${rotate},trim=duration=${duration.toFixed(6)}${alphaFades},setpts=PTS-STARTPTS+${overlay.start.toFixed(6)}/TB[ov${index}]`);
      const next = `vo${index}`;
      const x = (overlay.x - overlay.width / 2).toFixed(2), y = (overlay.y - overlay.height / 2).toFixed(2);
      filters.push(`[${videoLabel}][ov${index}]overlay=x=${x}:y=${y}:enable='between(t,${overlay.start.toFixed(6)},${overlay.end.toFixed(6)})'[${next}]`);
      videoLabel = next;
    }

    const output = join(work, "output.mp4");
    args.push("-filter_complex", filters.join(";"), "-map", `[${videoLabel}]`, "-map", `[${audioLabel}]`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-threads", "0", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", totalDuration.toFixed(6), "-progress", "pipe:2", "-nostats", "-y", output);
    let lastProgressAt = 0;
    await run("ffmpeg", args, controller.signal, (encodedSeconds) => {
      const now = Date.now();
      if (now - lastProgressAt < 1200) return;
      lastProgressAt = now;
      const progress = 0.05 + 0.88 * Math.max(0, Math.min(1, encodedSeconds / Math.max(0.1, totalDuration)));
      void callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress }).catch(() => {});
    });
    await callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress: 0.95 });
    const bytes = await readFile(output);
    await s3.send(new PutObjectCommand({ Bucket: body.bucket, Key: body.outputKey, Body: bytes, ContentType: "video/mp4" }), { abortSignal: controller.signal });
    const info = await stat(output);
    await callback(body.callbackUrl, {
      jobId: body.jobId, status: "completed", progress: 1, sizeBytes: info.size,
      renderedSeconds: totalDuration, processingSeconds: (Date.now() - startedAt) / 1000,
    });
  } catch (error) {
    const cancelled = controller.signal.aborted;
    await callback(body.callbackUrl, {
      jobId: body.jobId, status: cancelled ? "cancelled" : "failed", progress: 0,
      errorCode: cancelled ? "cancelled" : "render_failed",
      errorMessage: cancelled ? "Render cancelled" : String(error?.message || error).slice(0, 1000),
      processingSeconds: (Date.now() - startedAt) / 1000,
    }).catch(() => {});
  } finally {
    active.delete(body.jobId);
    await rm(work, { recursive: true, force: true });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, activeJobs: active.size }));
app.post("/jobs", authorized, (req, res) => {
  if (!validJob(req.body)) return res.status(400).json({ error: "invalid_job" });
  if (active.has(req.body.jobId)) return res.status(409).json({ error: "job_exists" });
  const controller = new AbortController();
  active.set(req.body.jobId, controller);
  render(req.body, controller);
  res.status(202).json({ jobId: req.body.jobId, status: "accepted" });
});
app.delete("/jobs/:id", authorized, (req, res) => {
  const controller = active.get(req.params.id);
  if (!controller) return res.status(404).json({ error: "job_not_running" });
  controller.abort();
  res.status(202).json({ status: "cancelling" });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => console.log(`Hypescript render worker listening on ${port}`));
