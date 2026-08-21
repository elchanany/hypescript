# Cloud / SaaS Audit — Hypescript

**Date:** 2026-08-21 · **Scope:** B-23 (cloud-first SaaS), B-24 (Lemon Squeezy live), B-25 (Brand Kit cloud)
**Method:** static reading of the repository at `main` (c9d4197). Nothing was executed against production, no
purchases were made, no payment settings were touched.

Every claim below is tagged:

- **VERIFIED** — read directly in the code, file:line given. It is what the code does.
- **SUSPECT** — a plausible consequence I could not prove without running the live system.

Out of scope by instruction (other agents own them): `web/lib/agent/**`, `web/components/Chat.tsx`
(read only), `web/lib/creative/**`, `web/components/VideoPreview.tsx`, `web/components/Timeline.tsx`.

---

## 0. Executive summary

| Area | Verdict |
|------|---------|
| Project creation → Supabase | **Works.** Cloud-first and blocking. Real gaps are for guests and for one auto-created fallback project. |
| Timeline edits → cloud | **Works.** Debounced 500 ms PATCH of the whole editor state. |
| Chat conversations → cloud | **Works.** Stored inside `editor_state.chatStore`. Has a last-write-wins race with the editor autosave. |
| Brand Kit → cloud | **Broken.** Local-only in practice. The one sync call writes to a Supabase table that does not exist in any migration. |
| Second device | **Mostly works** for timeline/chat/media playback. Loses: brand kit, fps/aspect policy, caption-burn preference; signed media URLs expire after 10 min; deletions do not propagate. |
| Cloud render wired? | **Yes, fully — worker, queue, callbacks, quotas all exist.** |
| Cloud render actually used? | **Almost never.** One boolean (`burnCaptions`, default `true`) disables it for every project that has captions. That is the 30-minutes-for-5-minutes cause. |
| Lemon Squeezy | **Hard-locked to TEST MODE in source code at four places.** No env var, no flag. A real customer cannot pay, and if they did the webhook would reject the event with HTTP 409. |

---

## A. Cloud persistence

### A1. When a signed-in user creates a project, is it written to Supabase or only IndexedDB?

**VERIFIED: it is written to Supabase, and creation fails loudly if Supabase refuses.**

Trace:

1. `web/components/NewProjectWizard.tsx:30` seeds the wizard with `DEFAULT_POLICY()`.
2. `web/lib/projects/types.ts:73-77` — `preferredDataMode()` reads `localStorage["hypescript_default_data_mode"]`
   and **defaults to `"cloud"`** when unset. `types.ts:89-98` then sets `storageBackend: "r2"`,
   `processingPreset: "cloud_fast"`, `capabilities.render = { providerId: "cloud-run-ffmpeg", execution: "cloud" }`.
3. `web/app/dashboard/page.tsx:283` (and `web/app/page.tsx:719`) call `createProjectWithPolicy(result)`.
4. `web/lib/projects/create.ts:17` — a local IndexedDB row is created first (`createProject`).
5. `web/lib/projects/create.ts:37-52` — because `dataMode === "cloud"`, it calls `createCloudProject(name)`
   → `web/lib/cloud/client.ts:21-25` → `POST /api/cloud/projects`.
6. `web/app/api/cloud/projects/route.ts:13-23` — `requireCloudUser()` then
   `supabase.rpc("cloud_create_project", { p_name })`, defined in
   `supabase/migrations/20260810120000_enforce_cloud_quotas.sql:28`, inserting into `public.cloud_projects`
   (`supabase/migrations/20260810050000_cloud_saas.sql:44-52`).
7. `web/lib/projects/create.ts:53-60` — **on any failure the local project is deleted again** and the error is
   rethrown. So there is no "silently local" outcome on this path. Good.

**Two real holes on adjacent paths:**

- **Guests cannot create a project at all.** `ALLOW_GUEST_EDITOR` is set in production
  (`web/.env.vercel.prod`), and `web/middleware.ts:15,77` lets an unauthenticated visitor reach `/`.
  But `DEFAULT_POLICY()` still returns `dataMode: "cloud"`, so `createProjectWithPolicy` calls the cloud API,
  `requireCloudUser` returns `401 authentication_required`
  (`web/lib/cloud/auth.ts:15-17`), the local row is deleted (`create.ts:54`) and the user sees
  "יצירת הפרויקט נכשלה · authentication_required". The dashboard guards this by forcing sign-in first
  (`web/app/dashboard/page.tsx:343-347`); the **editor's own "new project" dialog does not**
  (`web/app/page.tsx:717-730`). — **VERIFIED** (code paths), **SUSPECT** only as to whether
  `ALLOW_GUEST_EDITOR` is actually truthy in prod (the Vercel pull masks the value).
- **The auto-created fallback project is local-only until a later effect rescues it.**
  `web/app/page.tsx:471-474` calls `ensureProject()` (plain IndexedDB, `web/lib/storage.ts:109`) when the
  list is empty — no cloud row, no policy. The rescue is `ensureCloudProjectId`
  (`web/lib/projects/create.ts:160-192`), invoked from `web/app/page.tsx:646` and `:779`. But its failure
  handler is `console.warn` + `return null` (`create.ts:188-191`) — **no toast, no retry, no UI state**.
  If that call fails (quota, offline, 401) the project stays permanently device-local and the user is
  never told. — **VERIFIED**

### A2. Are project timeline edits synced to the cloud?

**VERIFIED: yes.** `web/app/page.tsx:591-634` — a 500 ms debounced effect that:

- builds `state = { schemaVersion, words, clips, subs, tracks, overlays, canvas, captionStyle, chatStore, media, mediaMeta }` (`page.tsx:605-617`);
- writes it to IndexedDB (`page.tsx:618`);
- if `policy.cloudProjectId && policy.dataMode !== "local"`, PATCHes it to Supabase
  (`page.tsx:620-622` → `saveCloudProjectState`, `web/lib/cloud/client.ts:36-42` →
  `web/app/api/cloud/projects/[id]/route.ts:20-54`, which writes `cloud_projects.editor_state`).
- On failure it shows a toast once per session (`page.tsx:624-629`) — this part is honest.

**Risks on this path:**

- **A hard 4 MB cap that returns 413.** `web/app/api/cloud/projects/[id]/route.ts:4`
  (`MAX_EDITOR_STATE_BYTES = 4 * 1024 * 1024`) and `:24` return
  `413 project_state_too_large`. The payload includes the **full word-level transcript** (`words`) **and the
  entire chat history** (`chatStore`). Vercel's own serverless request-body limit (4.5 MB) sits just above it.
  — **VERIFIED** that the cap exists and what it contains; **SUSPECT** that this is a second, independent
  source of the B-22 "413" the owner saw. Worth checking before blaming `/api/agent` alone.
- **The client never re-tries after a failed cloud save.** The 500 ms effect only re-fires when the
  dependency array changes (`page.tsx:634`). If the last edit of a session fails to reach the cloud, it is
  lost for other devices. — **VERIFIED**

### A3. Are chat conversations synced to the cloud?

**VERIFIED: yes**, as a nested field, not as its own table.

- Write: `web/components/Chat.tsx:333-345` (`syncChatToCloud`), called from `persistConversationStore`
  (`Chat.tsx:347-354`), `deleteThread` (`Chat.tsx:367-370`) and a 700 ms debounce on message changes
  (`Chat.tsx:404-419`). It reads the current `p:<id>:state` from IndexedDB and PATCHes
  `{...rawState, chatStore}`.
- Read: `web/components/Chat.tsx:383-402` prefers `cloud.project.editor_state.chatStore` over the local copy.
- Also mirrored on project sync: `web/lib/projects/create.ts:99-102` and `:132-135`.

**Race — VERIFIED as a code shape, SUSPECT as to real-world frequency:** two independent writers PATCH the
same `editor_state` row with no version/ETag. `web/app/page.tsx:622` sends
`{...timeline, chatStore: <from IndexedDB>}` on a 500 ms debounce; `web/components/Chat.tsx:339` sends
`{...<state from IndexedDB>, chatStore}` on a 700 ms debounce. The route is last-write-wins
(`projects/[id]/route.ts:44-51`). If a chat message lands between an editor change and its IndexedDB flush,
the chat writer can push a stale timeline back to the server.

### A4. Is the Brand Kit cloud or local?

**VERIFIED: local-only. The owner's suspicion is correct, and it is worse than "not wired" — the one sync
call targets a table that does not exist.**

- Storage is IndexedDB via the kv adapter: `web/lib/brand/kit.ts:63-65` (`brand.kits`, `brand.kit:<id>`),
  `createBrandKit` `kit.ts:252-255`, `updateBrandKit` `kit.ts:277-284`, `deleteBrandKit` `kit.ts:288-299`.
  The file header states it outright (`kit.ts:1-8`): binary assets are Blobs and "NEVER leave the browser".
- The UI says the same to the user: `web/app/settings/page.tsx:106` — "נשמר מקומית במכשיר בלבד".
- The **only** cloud call is `syncActiveBrandKitToCloud` (`web/lib/brand/kit.ts:329-341`), and it is invoked
  from exactly one place: `setActiveBrandKit` (`kit.ts:323-325`). Creating or editing a kit never syncs.
- It sends only `summarizeBrandKit(kit)` (`kit.ts:176-193`) — colors, tagline, guidelines and asset
  *metadata*. **Logos and reference images are never uploaded.**
- The endpoint writes to `public.user_profiles` (`web/app/api/cloud/brand/route.ts:8` and `:25`).
  **That table does not exist.** Grepping `supabase/migrations/*.sql` finds `profiles`, `user_settings`,
  `cloud_*`, `analytics_events`, `credit_ledger`, `user_provider_secrets` — no `user_profiles`, and no
  `brand_kit` column anywhere. `user_profiles` appears in exactly two places in the whole repo, both in that
  one route file.
- The failure is invisible three times over: the PUT returns `500 brand_sync_failed`
  (`brand/route.ts:28-30`), the caller swallows it with `.catch(() => {})` (`kit.ts:337`) inside a `try`
  that also swallows (`kit.ts:338-340`); and the GET masks the missing-table error as
  `{ brandKit: null }` (`brand/route.ts:12-14`).
- **Nothing ever calls the GET.** There is no client code that reads `/api/cloud/brand`, so even if the
  table existed the kit would never come back on a second device. The agent reads only
  `getActiveBrandKit()` from IndexedDB (`web/lib/agent/tools.ts:1886`, `:1913`, `:2646`).

### A5. On a second device after login, what exactly would be missing?

The load path is: `web/app/page.tsx:450-487` (`listCloudProjects` → `syncCloudProjects`) and
`web/app/page.tsx:489-583` (fetch `editor_state`, then resolve media). `web/lib/projects/create.ts:104-137`
creates a fresh local mirror + cloud policy for a project seen for the first time.

**Arrives correctly:** project list and names; clips, subs, tracks, overlays, canvas, captionStyle, `words`;
the whole chat history; media *metadata*; and playable media via a signed R2 URL
(`page.tsx:546-552` → `/api/cloud/assets/[id]/download` → `web/lib/cloud/r2.ts:44-51`).

**Missing or degraded — all VERIFIED:**

1. **Brand Kit — entirely.** See A4. New device = no kits, no logo, no writing guidelines for the agent.
2. **Every media file is a 0-byte `File` object.** `web/app/page.tsx:555` —
   `const restoredFile = file || new File([], m.name || "media", { type: "" })`. Playback works (it uses the
   signed `url`), but anything that reads `asset.file` gets an empty file. That includes
   **transcription** (`page.tsx:1271`, `transcribeMediaFile({ file: main.file, … })`), audio analysis
   (`web/lib/audio/source.ts:49`) and the browser ffmpeg fallback (`web/lib/render/RenderBackend.ts:58-68`).
   So on device 2 the local render path and re-transcription silently operate on nothing.
   *(This is the single most dangerous cross-device defect after the Brand Kit.)*
3. **Signed media URLs expire after 10 minutes and are never refreshed.** `web/lib/cloud/r2.ts:50`
   (`expiresIn: 10 * 60`). They are minted once at project open (`page.tsx:548`); there is no re-sign
   anywhere in the codebase. After ~10 minutes of editing, any reload of a `<video>` source 403s.
4. **Project render settings revert to defaults.** `aspectRatio`, `resolution` and especially `fps` live in
   the *local* policy (`web/lib/projects/types.ts:44-58`), not in `editor_state`. The mirror on device 2 is
   built from `DEFAULT_POLICY()` (`create.ts:120-127`), so `fps` becomes 30. Export uses
   `fps: policy.fps` (`page.tsx:1332`) — a 24 fps project re-renders at 30 fps on the second device.
   (Aspect survives indirectly because `canvas` is in `editor_state`.)
5. **Caption burn-in preference resets to ON.** `web/app/page.tsx:292` + `:304-313`, `localStorage["hs_burnCaptions"]`.
6. **Default data mode preference resets.** `localStorage["hypescript_default_data_mode"]`
   (`web/lib/keys.ts:9`, `web/lib/projects/types.ts:75`).
7. **Deletions never propagate.** `syncCloudProjects` (`create.ts:74-145`) only adds and updates:
   `const nextList = [...list]` (`:84`) and nothing is ever removed. A project deleted on device A stays
   visible forever on device B, and opening it hits `project_not_found`.
8. **Empty cloud list falls back to the stale local list.** `web/app/dashboard/page.tsx:222-230` only uses
   the cloud result `if (cloud.length > 0)`; otherwise it shows `listProjects()`.

---

## B. Cloud render

### B1. What is `CLOUD_RENDER_URL`, and is cloud render wired to the export button?

**VERIFIED: the whole cloud render stack exists and is real.**

- `CLOUD_RENDER_URL` points at a **Google Cloud Run service named `hypescript-render`** in region
  `me-west1`, deployed from `cloud-render-worker/`:
  `docs/SETUP_CLOUD.md:56` and `scripts/setup-cloud.ps1:131` —
  `gcloud run deploy hypescript-render --source .\cloud-render-worker --region me-west1
  --allow-unauthenticated --cpu 2 --memory 4Gi --timeout 3600 --concurrency 1 --max-instances 3`.
  (The literal value in `web/.env.vercel.prod` is masked as `[SENSITIVE]` by the Vercel CLI, so I could not
  read the exact hostname — but the deploy target is unambiguous.)
- The worker is a real Express + native FFmpeg service: `cloud-render-worker/server.mjs`
  (`POST /jobs` `:222-229`, `DELETE /jobs/:id` `:230-235`, `GET /health` `:221`), `Dockerfile` installs
  `ffmpeg`, and encoding is `libx264 -preset veryfast -crf 22` (`server.mjs:190`). It pulls inputs from R2
  (`server.mjs:100-104`), builds a full `filter_complex` concat graph with gaps, audio mix, fades and image
  overlays (`server.mjs:122-187`), uploads the MP4 back to R2 (`server.mjs:201`) and reports progress and
  completion through the callback (`server.mjs:69-76`, `:192-206`).
- The Next.js side is complete: dispatch `web/app/api/cloud/render/route.ts:36-97`, secret-checked callback
  `web/app/api/cloud/render/callback/route.ts:12-58`, job polling and cancel
  `web/app/api/cloud/jobs/[id]/route.ts`, quota reservation via `cloud_reserve_render` /
  `cloud_complete_render` (`supabase/migrations/20260810120000_enforce_cloud_quotas.sql:105`, `:203`).
- The export button does reach it: `web/components/TopBar.tsx:124` → `web/app/page.tsx:1759` → `render()`
  (`page.tsx:1290`), which tries `renderCloudProject` first (`page.tsx:1311-1333`).
- Config is present in production: `getRendererConfig()` (`web/lib/cloud/config.ts:39-47`) needs
  `CLOUD_RENDER_URL`, `CLOUD_RENDER_TOKEN`, `CLOUD_RENDER_CALLBACK_SECRET` and a callback URL derived from
  `NEXT_PUBLIC_SITE_URL` — all four are present in `web/.env.vercel.prod`. **No missing-env gap here.**

### B2. Is the browser path still the default, and is it the cause of "30 minutes for a 5-minute video"?

**VERIFIED — CONFIRMED, with the exact line.**

`web/app/page.tsx:1305-1309`:

```ts
const cloudCapable = policy?.capabilities.render?.execution === "cloud" && !!policy.cloudProjectId
  && edl.every((clip) => isGapClip(clip) || !!mediaById(media, clip.sourceId)?.cloudAssetId)
  && audioClips.every((clip) => isGapClip(clip) || !!mediaById(media, clip.sourceId)?.cloudAssetId)
  && overlays.every((overlay) => overlay.kind === "image" && !!mediaById(media, overlay.assetId || "")?.cloudAssetId)
  && !(burnCaptions && subs?.length);          // ← line 1309
```

And `web/app/page.tsx:292`:

```ts
const [burnCaptions, setBurnCaptions] = useState(true);   // default ON
```

So: **any project that has subtitles renders in the browser.** For a Hebrew-lesson editor whose core output
is captioned video, that is essentially every export. When `cloudCapable` is false, `page.tsx:1341-1350`
falls through to `getRenderBackend()` → `BrowserRenderBackend` (`web/lib/render/RenderBackend.ts:47-70`,
`:77-79`) → `renderEDL` in `web/lib/ffmpeg.ts`, which loads
**single-threaded `@ffmpeg/core@0.12.6` UMD** (`web/package.json:20`, `web/scripts/prepare-ffmpeg.mjs`,
`web/lib/ffmpeg.ts:50-60`, whose own comment says "ליבה חד-תהליכית"). Single-threaded WASM x264 on one core
runs roughly 5-15× slower than realtime for 1080p — 5 minutes in, 30+ minutes out. The arithmetic matches
the owner's report exactly.

Three further conditions on the same expression push work to the browser:

- **Any text overlay** disqualifies cloud render (`overlay.kind === "image"` only; `web/lib/editor/overlay.ts:109`
  creates `kind: "text"` overlays). The worker has no `drawtext` support at all.
- **Any asset without a finished `cloudAssetId`** disqualifies it — including one still uploading in the
  background (`page.tsx:637-678`).
- `policy.capabilities.render.execution` must be `"cloud"`, which is only true for projects created under
  cloud/`cloud_fast` policy (`types.ts:96`, `create.ts:50`, `create.ts:126`).

**And the failure is invisible.** `web/app/page.tsx:1334-1338` catches *any* cloud render error
(503 not configured, 402 quota, 502 dispatch, worker down) and does `console.warn` + `blob = null`, then
renders locally — while `web/components/ExportDialog.tsx:160` still displays
"מייצאים את הסרטון בענן" and `:174` still says "הרינדור מתבצע על שרתי הענן של Google". The user is told the
cloud is doing the work while their laptop grinds through ffmpeg.wasm.

### B3. What must change for cloud render to become the default

In priority order (details and file list in §D):

1. **Give the worker subtitle burn-in**, then delete the `!(burnCaptions && subs?.length)` clause.
   `cloud-render-worker/server.mjs` — accept a `subs` + `captionStyle` payload, write an `.ass`/`.srt` into
   the temp dir and append a `subtitles=` filter to the chain built at `server.mjs:122-190`. The client
   already owns the styling logic in `web/lib/render/captionBurn.ts`; the ASS/`drawtext` generation should be
   moved to shared code so browser and cloud produce the same frame.
2. **Give the worker text overlays** (`drawtext` / rendered PNG), then relax
   `overlay.kind === "image"` at `web/app/page.tsx:1308`. Rendering text overlays to PNG client-side and
   uploading them as assets is the cheaper first step and reuses the existing image-overlay path.
3. **Stop silently falling back.** `web/app/page.tsx:1334-1338` must distinguish "cloud is unavailable"
   (offer the browser path explicitly) from "cloud refused for quota/plan reasons" (surface the upgrade
   message) and must never leave `ExportDialog` claiming cloud while rendering locally.
4. **Block export until uploads finish** instead of quietly downgrading. Today an in-flight background
   upload (`page.tsx:637-678`) silently sends a 5-minute video to ffmpeg.wasm.
5. **Send `fps` from the project, not from a device-local policy** — see A5 item 4.
6. **Raise Cloud Run capacity.** `--concurrency 1 --max-instances 3` means three renders platform-wide.
   Fine today; it is a hard ceiling the moment there are paying users.

---

## C. Lemon Squeezy / billing

### C1. Test or live, and where is that decided?

**VERIFIED: TEST, decided in source code — not in an env var, not in an API flag, not in a store setting.
There are four independent hard-coded locks.**

| # | File:line | Code | Effect |
|---|-----------|------|--------|
| 1 | `web/lib/billing/lemon.ts:70` | `if (variant.attributes.test_mode !== true) throw new Error("live_billing_blocked_while_in_review");` | Any **live** product variant is rejected during resolution. A live catalogue resolves to zero purchasable plans. |
| 2 | `web/lib/billing/lemon.ts:91` | `test_mode: true,` in the `POST /checkouts` body | Every checkout session is created as a **test** checkout — no real card is ever charged. |
| 3 | `web/app/api/billing/lemon/webhook/route.ts:27` | `if (attrs.test_mode !== true) return NextResponse.json({ error: "live_event_blocked" }, { status: 409 });` | A **real** `subscription_created` webhook is rejected with 409. Lemon retries, then gives up. **Money taken, no access granted.** |
| 4 | `web/app/api/billing/lemon/webhook/route.ts:51` | `provider: "lemonsqueezy_test",` | Even a successful row is stamped as a test subscription. |

Two more places report the state rather than enforce it:
`web/app/api/billing/checkout/route.ts:42` returns `testMode: true` unconditionally, and
`web/app/api/billing/catalog/route.ts:17-19` labels the catalogue `"live-blocked"` if any product is not
`test_mode`.

There is **no** `LEMONSQUEEZY_TEST_MODE` / `BILLING_MODE` env var anywhere in the repo — I grepped the whole
`web/` tree for `test_mode|testMode|LEMON` and the ten hits above are all of them. The comment in
`web/.env.example` ("Lemon Squeezy (Test Mode עד אישור החנות)") documents the intent: this was a deliberate
guard for the store-review period, and the guard was never removed.

### C2. Are checkout, webhook and subscription state implemented end to end?

**VERIFIED: yes — the plumbing is complete and reasonably careful. Only the mode lock is missing.**

- **Checkout:** `web/app/api/billing/checkout/route.ts:8-45` — auth, plan validation, duplicate-subscription
  guard (`:24-26`), admin-overridable pricing (`:29-30`, `web/lib/admin/server.ts:16`), trial eligibility from
  `trial_used_at` (`:37`), redirect back to `/account?checkout=success` (`:36`).
  `createCheckout` (`web/lib/billing/lemon.ts:75-113`) passes `custom: { user_id, plan_id, interval }` — the
  identity the webhook later relies on.
- **Variant resolution** (`lemon.ts:53-73`) is strict in a good way: it matches plan name, interval,
  **exact price** against `BILLING_PLANS` (`web/lib/billing/plans.ts:12-40`), `is_subscription === true`,
  and requires a 1-month/30-day free trial (`hasRequiredTrial`, `plans.ts:61-67`). It throws
  `billing_variant_ambiguous` / `billing_variant_missing` when the store does not match exactly.
- **Webhook:** `web/app/api/billing/lemon/webhook/route.ts` — HMAC-SHA256 signature check with
  `timingSafeEqual` (`:8-14`, `:20-22`), raw-body read (`:19`), `runtime = "nodejs"` (`:6`), event filter
  (`:25`), status mapping (`web/lib/billing/lemon.ts:125-131`), grace period for a cancelled-but-not-expired
  subscription (`:39-40`), trial bookkeeping (`:36-38`, `:56-57`), upsert on `user_id` (`:45-59`).
- **State + entitlement:** `web/app/api/billing/status/route.ts:4-18` normalizes `trial` into the target plan
  and returns a `usage` snapshot; quotas are enforced **server-side in Postgres** — storage
  (`20260810050000_cloud_saas.sql:113-120`), project count / render seconds / concurrency
  (`20260810120000_enforce_cloud_quotas.sql`), global caps
  (`20260810124500_global_storage_hard_cap.sql`). Plan limits live in `cloud_plans`
  (`20260810050000_cloud_saas.sql:21-28`) and match `web/lib/billing/plans.ts`.
- **Portal:** `web/app/api/billing/portal/route.ts:5-24` returns Lemon's `urls.customer_portal`.
- **Schema:** `cloud_subscriptions` (`20260810050000_cloud_saas.sql:30-42`) plus
  `target_plan_id` / `trial_ends_at` / `trial_used_at`
  (`20260811134052_limited_trial_entitlements.sql:26-28`). All columns the webhook writes exist.

### C3. What precisely is missing for a real customer to pay and get an active subscription?

1. **Remove the four hard-coded test locks** listed in C1 and replace them with a single explicit switch, e.g.
   `BILLING_LIVE_MODE=1`, read once and threaded through `resolveVariant`, `createCheckout` and the webhook.
   Do **not** simply delete the checks — an explicit mode makes it possible to keep a test store working in
   preview deployments and prevents a live event ever being processed by a preview build.
2. **Store `provider` honestly** — `"lemonsqueezy"` in live mode, `"lemonsqueezy_test"` in test
   (`webhook/route.ts:51`), so support can tell real customers from test rows.
3. **Return the true mode from the checkout API** instead of `testMode: true`
   (`checkout/route.ts:42`) — the account UI reads this.
4. **Confirm the LIVE store actually satisfies `resolveVariant`.** This is the most likely thing to break on
   the day of the switch, because the check is strict (`lemon.ts:57-72`). For each of the four
   plan×interval combinations the live store must have exactly one variant that: infers to `creator`/`pro`
   from its name (`plans.ts:54-59` matches `creator|יוצר` and `\bpro\b|professional|מקצועי`), has
   `interval` `month`/`year`, has price exactly **49 / 490 / 119 / 1190 ILS** (`plans.ts:22-39`), is a
   subscription, and has a **1-month or 30-day free trial**. `GET /api/billing/catalog` already reports this
   per-combination via its `readiness` array (`catalog/route.ts:8-15`) — run it first, before flipping
   anything. *(I did not call the Lemon API; verifying the live catalogue is an owner action.)*
5. **Register the LIVE webhook endpoint** at `https://<site>/api/billing/lemon/webhook` in the Lemon Squeezy
   dashboard, subscribed to `subscription_*` events, and set `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel to
   **that** webhook's signing secret. Live and test webhooks are separate objects with separate secrets — if
   the current secret belongs to the test webhook, every live event will fail signature validation
   (`webhook/route.ts:20-22`) and look identical to "nothing happened". — **SUSPECT**: I cannot see which
   webhook the configured secret belongs to.
6. **Minor hardening:** `getStore()` (`lemon.ts:38-44`) silently falls back to `result.data[0]` when
   `LEMONSQUEEZY_STORE_ID` does not match any store — in a two-store account that would create checkouts
   against the wrong store. Make the mismatch an error.

**Not blocking payments, but note:** the checkout duplicate guard (`checkout/route.ts:24-26`) blocks a user
whose status is `active|trialing|past_due` from starting a new checkout. Combined with `provider` being
stamped `lemonsqueezy_test`, any user who went through a test checkout already has a row that will block
their first real purchase until it is cleaned up.

---

## D. Prioritised changes

Ordered by "how much of the owner's stated goal it unblocks per unit of risk". Files named per item.

### P0 — a paying customer cannot pay

| # | Change | Files |
|---|--------|-------|
| 1 | Introduce an explicit `BILLING_LIVE_MODE` switch and remove the four hard-coded test locks: the live-variant rejection, the `test_mode: true` checkout attribute, the webhook 409, and the `lemonsqueezy_test` provider stamp. Return the real mode to the client. | `web/lib/billing/lemon.ts` (`:70`, `:91`), `web/app/api/billing/lemon/webhook/route.ts` (`:27`, `:51`), `web/app/api/billing/checkout/route.ts` (`:42`), `web/app/api/billing/catalog/route.ts` (`:17-19`), `web/.env.example` |
| 2 | Before flipping: call `GET /api/billing/catalog` against the live store and confirm all four `readiness` entries are `ready: true`; register the live webhook and set its own signing secret in Vercel. | (operational — no code) |
| 3 | Make a `LEMONSQUEEZY_STORE_ID` mismatch a hard error instead of falling back to the first store. | `web/lib/billing/lemon.ts:38-44` |

### P0 — export is 10× slower than it needs to be

| # | Change | Files |
|---|--------|-------|
| 4 | Add subtitle burn-in to the cloud worker (write an ASS file from `subs` + `captionStyle`, append a `subtitles=` filter), then remove the `!(burnCaptions && subs?.length)` clause from `cloudCapable`. This one change moves the majority of real exports to the cloud. | `cloud-render-worker/server.mjs` (`:115-190`), `web/app/api/cloud/render/route.ts` (payload + validation), `web/lib/cloud/client.ts` (`renderCloudProject` input type), `web/app/page.tsx:1309`, shared style logic extracted from `web/lib/render/captionBurn.ts` |
| 5 | Support text overlays in the cloud path — either `drawtext` in the worker, or rasterise text overlays to PNG client-side and upload them as ordinary image assets. Then relax `overlay.kind === "image"`. | `cloud-render-worker/server.mjs:173-187`, `web/app/page.tsx:1308`, `web/lib/render/materializeOverlays.ts` |
| 6 | Stop the silent cloud→browser downgrade. Distinguish unavailable / quota-exceeded / dispatch-failed, surface each honestly, and never let `ExportDialog` claim "בענן" while rendering locally. | `web/app/page.tsx:1334-1350`, `web/components/ExportDialog.tsx:160`, `:174` |
| 7 | Do not start an export while a background asset upload is still running — wait or tell the user, instead of silently choosing ffmpeg.wasm. | `web/app/page.tsx:637-678`, `:1290-1310` |

### P1 — cloud persistence holes the owner will hit

| # | Change | Files |
|---|--------|-------|
| 8 | **Brand Kit → cloud, for real.** Create the missing table/column (`profiles.brand_kit jsonb`, or a dedicated `user_brand_kits`) in a new migration; point the route at it; sync on *create* and *update*, not only on activate; upload logo/reference blobs to R2 as cloud assets and store their ids; and actually **read** the kit back on load. | new `supabase/migrations/*_brand_kit.sql`, `web/app/api/cloud/brand/route.ts:8`, `:25`, `web/lib/brand/kit.ts:239-341`, `web/app/settings/brand/*`, and the copy at `web/app/settings/page.tsx:106` |
| 9 | **Re-sign expiring media URLs.** Refresh signed R2 URLs before the 10-minute expiry (or raise `expiresIn` and refresh on `error`/`stalled`). | `web/lib/cloud/r2.ts:44-51`, `web/app/page.tsx:546-552` |
| 10 | **Stop fabricating 0-byte `File` objects.** Either mark cloud-only assets explicitly and make consumers fetch bytes from the signed URL on demand, or fetch-and-cache lazily. Anything reading `asset.file` must not silently receive an empty file. | `web/app/page.tsx:555-567`, `web/lib/editor/model.ts` (`MediaAsset`), consumers at `web/app/page.tsx:1271`, `web/lib/audio/source.ts:49`, `web/lib/render/RenderBackend.ts:57-69` |
| 11 | **Propagate deletions.** Remove local mirrors whose `cloudProjectId` is absent from (or `deleting` in) the cloud list, and trust an empty cloud list for a signed-in user. | `web/lib/projects/create.ts:74-145`, `web/app/dashboard/page.tsx:222-230` |
| 12 | **Move render settings into `editor_state`** (`fps`, `aspectRatio`, `resolution`) so a second device does not silently re-render at 30 fps. | `web/app/page.tsx:605-617`, `web/lib/projects/create.ts:104-137`, `web/lib/projects/types.ts` |
| 13 | **Fix the two-writer race** on `editor_state`. Either give the PATCH route a field-level merge (`chatStore` alone) or add an `updated_at`/version precondition. | `web/app/api/cloud/projects/[id]/route.ts:37-51`, `web/lib/cloud/client.ts:36-42`; the Chat side is owned by another agent — coordinate before touching `web/components/Chat.tsx:333-345` |
| 14 | **Handle the 4 MB `editor_state` cap.** Split `chatStore` and `words` out of the project row (own tables or R2 objects) instead of pushing the whole document each save; today a long project silently stops syncing with a 413. Check this against B-22. | `web/app/api/cloud/projects/[id]/route.ts:4`, `:24`, `web/app/page.tsx:605-622` |
| 15 | **Never leave a project silently local.** `ensureCloudProjectId` must surface its failure and retry, not `console.warn`. | `web/lib/projects/create.ts:188-191`, `web/app/page.tsx:646`, `:779`, `:799-801` |

### P2 — friction the owner explicitly asked to remove

| # | Change | Files |
|---|--------|-------|
| 16 | Guest users hitting "new project" in the editor get `authentication_required` and a deleted project. Either force sign-in first (as the dashboard does) or make guest projects explicitly local with honest copy. | `web/app/page.tsx:717-730`, `web/lib/projects/create.ts:37-60`, `web/middleware.ts:77` |
| 17 | The local/hybrid/cloud radio group is the "toggle" the owner does not want on the happy path. Cloud is already the default; consider demoting the choice to an advanced setting rather than a prominent card. | `web/app/settings/page.tsx:115-133`, `web/components/NewProjectWizard.tsx:75-82` |
| 18 | Raise Cloud Run capacity before launch — `--concurrency 1 --max-instances 3` caps the whole platform at three simultaneous renders. | `docs/SETUP_CLOUD.md:56`, `scripts/setup-cloud.ps1:131` |

---

## E. Things I could not verify from the code

State these as unknowns, not as facts:

- The literal value of `CLOUD_RENDER_URL` (Vercel masks it as `[SENSITIVE]`), and whether the Cloud Run
  service is currently up. `GET $CLOUD_RENDER_URL/health` (`cloud-render-worker/server.mjs:221`) answers this
  in one call; `GET /api/cloud/status` (`web/app/api/cloud/status/route.ts`) does a live R2 + Supabase check
  but only reports the renderer as "configured", never live.
- Whether the R2 bucket's CORS policy allows `PUT` from the production origin. The presigned-upload design
  (`web/app/api/cloud/uploads/route.ts`, `web/lib/cloud/client.ts:80-91`) is correct, but a missing CORS rule
  would surface as `cloud_upload_network_error` — which the code swallows into a `console.warn`
  (`web/app/page.tsx:800`).
- Whether every migration in `supabase/migrations/` has actually been applied to the production database.
  Several routes already defend against schema drift (`web/app/api/account/route.ts:26-35`,
  `web/app/api/cloud/projects/route.ts:9`), which suggests it has bitten before.
- Whether the configured `LEMONSQUEEZY_WEBHOOK_SECRET` belongs to a test or a live webhook object.
- Whether `ALLOW_GUEST_EDITOR` is truthy in production.
