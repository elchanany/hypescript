# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
Inspector/timeline parity על main ב־`972ebac` ו-Graphify sync ב־`58b4c94`. מקומית video/audio add עוברים דרך clip.add ותמונות דרך overlay.addImage ב-UI ובסוכן; generic add_clip מנתב תמונה לשכבה ו-resolveAsset תומך id/שם/אינדקס. File probe/object URL נשארים בגבול I/O מחוץ לחוזה JSON. tsc, 203/203 tests, production build ו־Graphify update (1592/3386) עברו; להשלים commit+push, ואז clip opacity Preview+Export. Package C רק אחרי login עובד.
