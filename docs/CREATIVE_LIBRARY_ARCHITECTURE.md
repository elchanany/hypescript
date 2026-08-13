# Creative library architecture

Hypescript should match the breadth and speed of modern editors without copying a vendor-owned catalog or showing controls that only simulate an edit.

## Product contract

Every catalog item has a stable ID, localized name, thumbnail/preview, parameters, supported media kinds and two implementations: interactive Preview and deterministic Export. An item is hidden until both paths pass a parity fixture.

## Sources and licensing

- Built-in CSS/canvas/FFmpeg primitives remain the safest baseline for color looks, fades, motion, crop and text styles.
- Remotion transitions are a candidate for richer scene transitions, subject to package and paid-transition licensing review and a server-rendering performance benchmark.
- dotLottie/Lottie can supply motion-template playback through open runtimes; each animation asset still needs its own verified commercial license.
- GIPHY may supply an optional sticker/GIF browser through its documented API and attribution requirements; it is a provider, not a bundled asset dump.
- Open-source GLSL transition ports may be imported only when their license is compatible and the same shader can be reproduced by the export worker. Custom FFmpeg builds are avoided unless cloud and browser render paths remain supportable.
- CapCut is a UI/product reference only. No CapCut-owned templates, effects or media are copied, and no dependency is built on an undocumented/private endpoint.

## Shipped catalog (2026-08-13)

`web/lib/creative/` holds the data layer, with `catalog.test.ts` enforcing the
product contract above:

| Module | Items | Preview impl | Export impl |
|---|---|---|---|
| `effects.ts` | 52 looks, 8 categories | CSS `filter` | FFmpeg `eq`/`colorbalance`/`curves`/`unsharp`/`gblur`/`vignette`/`noise` |
| `transitions.ts` | 57 transitions, 7 categories | `PreviewKind` geometry descriptor | FFmpeg `xfade` |
| `textPresets.ts` | 18 templates, 6 categories | percent-of-canvas box + style | same values through `overlayBurn` |

Every filter string was executed against real FFmpeg, not assumed valid — 52/52
effects and 57/58 transitions pass. Two findings came out of that run:

- `curves` with a point list requires spaces inside quotes, which is fragile
  inside a `filter_complex`. Those looks use FFmpeg's built-in curve presets.
- **`squeezev` segfaults FFmpeg 8.0.1 at every resolution tested** while
  `squeezeh` is fine. It is excluded via `BLOCKED_XFADE` with the reason
  recorded, and a test fails if it is ever added back. Re-validate against live
  FFmpeg before removing that block.

Not yet wired: applying a catalog item from the UI or the agent. The data and
both implementations exist and are verified; the render-graph and CommandBus
wiring is the next step. Until then the catalog is deliberately not exposed in
the UI, per the "no controls that only simulate an edit" rule above.

## Delivery order

1. Shared effect/transition schema and fixture renderer.
2. More native looks, fades, wipes, slide/push and zoom using existing render primitives.
3. Search, categories, favorites, recently used and parameter controls.
4. Optional licensed provider adapters for stickers and motion assets.
5. Curated template packs with explicit license metadata, versioning and rollback.
