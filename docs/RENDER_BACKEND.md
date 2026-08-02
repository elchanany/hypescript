# Render engine — join fix + RenderBackend seam + native plan

## 1. The export stall — root cause & fix (VERIFIED)

The old `renderEDL` already used one `filter_complex` (trim/atrim → setpts → scale/fps →
concat → single encode). It was **not** the concat-demuxer antipattern. The join defect had
**two** causes, both measured with native FFmpeg + ffprobe (not guessed):

1. audio had **no `aresample`** and segments had **mismatched timebases** → `concat` padded
   audio; adding `aresample=async=1` + `settb`/`asettb` shrank it but left a residual.
2. **~0.2 duplicate frame per join** (measured: 316 vs 312 frames, +0.133s over 20 cuts):
   the `fps` resampler emits one extra frame at non-frame-aligned cut boundaries. Fixed by
   locking each segment to exactly `round(len·fps)` frames with `trim=end_frame` and snapping
   the trim window to whole frames (44100/30 = 1470 samples/frame → audio aligns to the sample).

### Old vs new (per segment)
```
# OLD video : [i:v]trim=s:e,setpts=PTS-STARTPTS,scale/pad/setsar,fps,format=yuv420p
# OLD audio : [i:a]atrim=s:e,asetpts=PTS-STARTPTS,aformat=44100:stereo,volume=V
# OLD out   : ... -c:v libx264 ... -c:a aac -b:a 192k out.mp4

# NEW video : [i:v]trim=s:e,setpts=PTS-STARTPTS,fps=30,scale/pad/setsar,format=yuv420p,
#             trim=end_frame=N,setpts=PTS-STARTPTS,settb=1/30      (e snapped to whole frames)
# NEW audio : [i:a]atrim=s:e,asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0,
#             aformat=44100:stereo,volume=V,asettb=1/44100
# NEW out   : ... -c:v libx264 ... -r 30 -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart out.mp4
```
Builder: [`web/lib/render/graph.ts`](../web/lib/render/graph.ts) (`buildConcatGraph`/`toExecArgs`, pure).
Consumed by [`web/lib/ffmpeg.ts`](../web/lib/ffmpeg.ts) `renderEDL` → identical string on wasm & native.

### Verification — measured, not asserted on a string
[`web/lib/render/graph.integration.test.ts`](../web/lib/render/graph.integration.test.ts) synthesizes a
**VFR** source (jittered PTS, 30fps, 48 kHz) + a **25 fps / 44.1 kHz** source, builds a **20-cut**
EDL (mixed sources, non-keyframe offsets, short+long), renders with **native FFmpeg** using the exact
`graph.ts` command, then ffprobes the output. Skips if ffmpeg/ffprobe are absent.

Result on this machine (FFmpeg 8.0.1): `outDur == sumDur` (10.4s, **delta 0**), frames **312 == 312**
(no duplicates), **audio drift 0**, CFR `30/1`, max video packet gap **1 frame**. All acceptance
criteria pass. Re-run: `npx vitest run lib/render/graph.integration.test.ts`.

## 2. RenderBackend seam (shipped)

[`web/lib/render/RenderBackend.ts`](../web/lib/render/RenderBackend.ts) — the single interface the
editor renders through. `BrowserRenderBackend` wraps the current wasm engine; capabilities are
honest (`render:true`, others `false`). `getRenderBackend()` is the swap point. `page.tsx`
export + the agent `render_video` tool both flow through `renderEDL`, so the join fix is global.

## 3. LocalNativeRenderBackend — file plan (next package, not built)

Zero-cost, local-first. No paid cloud. Frontend stays on Vercel; rendering is local native FFmpeg.

```
web/lib/render/LocalNativeRenderBackend.ts   # implements RenderBackend against http://127.0.0.1:<port>
web/lib/render/localServiceClient.ts         # health-check, job submit/poll/cancel, SSE progress
local-service/                               # small Node service (matches existing TS stack)
  package.json                               # express + execa; ffmpeg/ffprobe from PATH
  src/server.ts                              # POST /render (project JSON) -> jobId; GET /jobs/:id (SSE)
  src/ffmpeg.ts                              # reuses the SAME graph string as web/lib/render/graph.ts
  src/probe.ts                               # ffprobe analyze / thumbnails / waveform
  src/jobs.ts                                # in-proc queue, cancel (kill child), temp-dir cleanup
  README.md                                  # Windows install: winget install Gyan.FFmpeg; npm i; npm start
```
Contract: `isAvailable()` = `GET /health` (returns ffmpeg version). If down → surface
“start the local service” with instructions; **never** auto-fallback to wasm or upload media.
Reuse `graph.ts` verbatim so browser preview math and native export stay identical.

## 4. Remaining roadmap (staged, per the spec — not started)

Provider Registry + Capability interfaces + ExecutionPolicy (Zero-cost default) · Storage/Render/
Transcription/LLM/Image/Video providers via generic adapters (OpenAI-compat, S3-compat, REST) ·
Auth (Google) + org/membership/roles + BOOTSTRAP_OWNER_EMAIL · Dashboard/wizard · Asset replicas +
relink · Agent CommandBus + Message Normalizer (DeepSeek tool_calls repair) + idempotency · AppError +
Job Center · Transition/Effect engines. Build package-by-package with tests before advancing.
