# Hypescript Design Constitution

Hypescript uses shadcn/ui **Rhea** as its structural baseline: compact controls, dense but calm surfaces, medium radii, restrained motion, and clear hierarchy. This is a visual-system refactor only; product workflows and data contracts remain unchanged.

## Foundation

- Font: Geist Sans for UI and Geist Mono for timecodes, metrics, and technical values.
- Icons: Phosphor Regular through `web/components/icons.tsx`. Selected or emphasized states may use a heavier weight; external brand marks are the only exception.
- Grid: 4px. Prefer compact gaps of 4/8/12/16/24px.
- Radius: 6/10/14/18px via `--r-sm` through `--r-xl`. Pills are reserved for tags, statuses, and binary segmented controls.
- Motion: 120–220ms, no bounce for routine actions, and always disabled by `prefers-reduced-motion`.

## Semantic tokens

All screens consume the tokens in `web/app/globals.css`: `--bg`, `--panel`, `--panel-2`, `--elevated`, `--text`, `--text-2`, `--text-3`, `--border`, `--border-strong`, `--accent`, `--success`, `--warning`, `--danger`, and `--focus`. The shadcn token names map to the same source of truth. Do not introduce page-local theme colors.

## Canonical components

Use `web/components/ui.tsx` for buttons, icon buttons, toggles, collapsible sections, and context menus. Use `web/components/icons.tsx` for every product icon. Reuse `.card`, `.panel-header`, `.panel-empty`, `.skeleton-shimmer`, and toast/status classes instead of creating screen-specific equivalents.

Every interactive control needs default, hover, active, focus-visible, disabled, loading, selected, and error behavior when applicable. Icon-only actions require an accessible name and a tooltip.

## Migration audit

The prior UI mixed Lucide icons, system fonts, blue-gray surfaces, oversized radii, page-local hardcoded colors, nested cards, and bounce/scale effects. The Rhea migration centralizes font, icons, tokens, focus, surfaces, and motion. Remaining intentionally unique colors are limited to media previews, waveform/track identity, destructive/warning/success meaning, and Hypescript brand assets.
