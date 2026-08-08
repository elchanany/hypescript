# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
Media placement parity על main ב־`69397c9` ו-Graphify sync ב־`9710720`. מקומית clip opacity עובר UI/Agent דרך clip.setOpacity, מופיע בנגן ומיוצא ב-FFmpeg מול שחור; flatten לא מאחד גבולות opacity/volume. PiP/alpha בין רצועות אינו נטען. tsc, 207/207 tests, production build ו-Graphify update (1592/3392) עברו; native 20-cut עם opacity שומר durationDelta=0/audioDrift=0. להשלים commit+push, ואז commandize bulk workflow mutations. Package C רק אחרי login עובד.
