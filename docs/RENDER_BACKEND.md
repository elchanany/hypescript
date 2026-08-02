# Render engine — join fix + RenderBackend seam + native plan

## 1. The export stall — root cause & fix

The old `renderEDL` already used one `filter_complex` (trim/atrim → setpts → scale/fps →
concat → single encode). It was **not** the concat-demuxer antipattern. The stall at each
join came from three omissions on VFR (e.g. WhatsApp) sources:

- audio segments had **no `aresample`** → timestamp gaps/drift → `concat` padded audio;
- segments carried **mismatched timebases** (no `settb`/`asettb`) → boundary misalignment;
- output lacked `-movflags +faststart`.

### Old vs new (per segment)
```
# OLD video : [i:v]trim=s:e,setpts=PTS-STARTPTS,scale/pad/setsar,fps,format=yuv420p
# OLD audio : [i:a]atrim=s:e,asetpts=PTS-STARTPTS,aformat=44100:stereo,volume=V
# OLD out   : ... -c:v libx264 ... -c:a aac -b:a 192k out.mp4

# NEW video : [i:v]trim=s:e,setpts=PTS-STARTPTS,fps=30,scale/pad/setsar,format=yuv420p,settb=1/30
# NEW audio : [i:a]atrim=s:e,asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0,
#             aformat=44100:stereo,volume=V,asettb=1/44100
# NEW out   : ... -c:v libx264 ... -r 30 -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart out.mp4
```
Builder: [`web/lib/render/graph.ts`](../web/lib/render/graph.ts) (`buildConcatGraph` / `toExecArgs`, pure & unit-tested).
Consumed by [`web/lib/ffmpeg.ts`](../web/lib/ffmpeg.ts) `renderEDL` → identical string works on native FFmpeg.

### Acceptance (run on a real ≥20-cut export — needs the output file)
```bash
# duration should equal the sum of clip durations within one frame (±1/fps)
ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4
# CFR check: avg_frame_rate == r_frame_rate, no VFR
ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate,r_frame_rate -of csv=p=0 out.mp4
# no frozen frames / no injected silence: scan for large gaps between packet PTS
ffprobe -v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 out.mp4 | \
  awk -F, 'NR>1{d=$1-p; if(d>1.5/30) print "video gap "d" at "$1} {p=$1}'
ffprobe -v error -select_streams a:0 -show_entries packet=pts_time -of csv=p=0 out.mp4 | \
  awk -F, 'NR>1{d=$1-p; if(d>0.05) print "audio gap "d" at "$1} {p=$1}'
```
Reproduction: any project with ≥20 alternating cuts across ≥2 sources (mirror of `graph.test.ts`).

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
