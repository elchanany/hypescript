import express from "express";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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

function run(command, args, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-8000); });
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
  return body.inputs.every((input) => typeof input.id === "string" && typeof input.objectKey === "string")
    && body.clips.every((clip) => ids.has(clip.assetId) && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.start >= 0 && clip.end > clip.start);
}

async function render(body, controller) {
  const startedAt = Date.now();
  const renderedSeconds = body.clips.reduce((total, clip) => total + clip.end - clip.start, 0);
  const work = await mkdtemp(join(tmpdir(), "hypescript-render-"));
  try {
    await callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress: 0.01 });
    const inputPaths = new Map();
    for (const [index, input] of body.inputs.entries()) {
      const path = join(work, `input-${index}`);
      const object = await s3.send(new GetObjectCommand({ Bucket: body.bucket, Key: input.objectKey }), { abortSignal: controller.signal });
      await pipeline(object.Body, createWriteStream(path), { signal: controller.signal });
      inputPaths.set(input.id, path);
    }

    const width = Math.max(320, Math.min(3840, Math.floor(body.target?.width || 1920)));
    const height = Math.max(240, Math.min(2160, Math.floor(body.target?.height || 1080)));
    const fps = Math.max(12, Math.min(60, Math.floor(body.target?.fps || 30)));
    const rendered = [];
    for (const [index, clip] of body.clips.entries()) {
      const input = inputPaths.get(clip.assetId);
      const output = join(work, `clip-${String(index).padStart(4, "0")}.mp4`);
      const duration = clip.end - clip.start;
      const audio = await hasAudio(input, controller.signal);
      const args = ["-hide_banner", "-loglevel", "error", "-i", input];
      if (!audio) args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
      const videoFilter = `[0:v:0]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v]`;
      const audioFilter = audio
        ? `[0:a:0]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS,aresample=48000[a]`
        : `[1:a:0]atrim=duration=${duration},asetpts=PTS-STARTPTS[a]`;
      args.push("-filter_complex", `${videoFilter};${audioFilter}`, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-y", output);
      await run("ffmpeg", args, controller.signal);
      rendered.push(output);
      await callback(body.callbackUrl, { jobId: body.jobId, status: "running", progress: 0.05 + 0.8 * ((index + 1) / body.clips.length) });
    }

    const concatFile = join(work, "concat.txt");
    await writeFile(concatFile, rendered.map((path) => `file '${path.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
    const output = join(work, "output.mp4");
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", "-y", output], controller.signal);
    const bytes = await readFile(output);
    await s3.send(new PutObjectCommand({ Bucket: body.bucket, Key: body.outputKey, Body: bytes, ContentType: "video/mp4" }), { abortSignal: controller.signal });
    const info = await stat(output);
    await callback(body.callbackUrl, {
      jobId: body.jobId, status: "completed", progress: 1, sizeBytes: info.size,
      renderedSeconds, processingSeconds: (Date.now() - startedAt) / 1000,
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
