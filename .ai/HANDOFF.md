# HANDOFF

## main (after merge)
- Auth PKCE: `@supabase/ssr` + server `/auth/callback`
- Timeline zoom: true zoom-out below fit (`timelineContentWidth`), range 5%–×400

## Zoom (merged)
- Removed viewport lock (`Math.max(portW,…)` + `min-width:100%`)
- `nextZoom(..., portWidth)` respects effective min for viewport

## Next
Package C — Usage foundation. Verify zoom pinch/wheel on production after deploy.
