# Hypescript Design Constitution

Hypescript uses shadcn/ui **Rhea** as its structural baseline and the Brain+Play brand palette as its visual language: deep navy structure, smoky blue depth, turquoise action, and lime AI emphasis. Controls stay compact, surfaces calm, radii medium, motion restrained, and hierarchy explicit.

## Foundation

- Font: Geist Sans for UI and Geist Mono for timecodes, metrics, and technical values.
- Icons: Phosphor Regular through `web/components/icons.tsx`. Selected or emphasized states may use a heavier weight; external brand marks are the only exception.
- Grid: 4px. Prefer compact gaps of 4/8/12/16/24px.
- Radius: 6/10/14/18px via `--r-sm` through `--r-xl`. Pills are reserved for tags, statuses, and binary segmented controls.
- Motion: 120–220ms, no bounce for routine actions, and always disabled by `prefers-reduced-motion`.

## Semantic tokens

All screens consume the tokens in `web/app/globals.css`: `--bg`, `--panel`, `--panel-2`, `--elevated`, `--text`, `--text-2`, `--text-3`, `--border`, `--border-strong`, `--accent`, `--success`, `--warning`, `--danger`, and `--focus`. The shadcn token names map to the same source of truth. Do not introduce page-local theme colors.

Brand roles are fixed: navy is structure, turquoise is the primary action, lime marks AI guidance or a deliberate highlight, and smoky blue supports secondary data. Purple and generic SaaS indigo are not part of the product palette. Light and dark themes change contrast, not brand meaning.

## Language and direction

Hebrew is the product fallback. English, Russian, and Hindi use LTR; Hebrew and Arabic use RTL. UI direction comes from `I18nProvider` and `data-locale`, while timelines and time rulers remain physically LTR. New user-facing text belongs in `web/lib/i18n/messages.ts`, never inline in a shared surface. Prefer neutral nouns and infinitives; use the saved address form only where a sentence genuinely needs grammatical agreement.

## Canonical components

Use `web/components/ui.tsx` for buttons, icon buttons, toggles, collapsible sections, and context menus. Use `web/components/icons.tsx` for every product icon. Reuse `.card`, `.panel-header`, `.panel-empty`, `.skeleton-shimmer`, and toast/status classes instead of creating screen-specific equivalents.

Every interactive control needs default, hover, active, focus-visible, disabled, loading, selected, and error behavior when applicable. Icon-only actions require an accessible name and a tooltip.

## Migration audit

The prior UI mixed Lucide icons, system fonts, blue-gray and indigo surfaces, oversized radii, page-local hardcoded colors, nested cards, and bounce/scale effects. The Rhea and Brain+Play migration centralizes font, icons, tokens, focus, surfaces, brand color, direction, and motion. Remaining intentionally unique colors are limited to media previews, track identity, destructive/warning/success meaning, and Hypescript brand assets.
