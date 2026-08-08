# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 Track context menu על main ב־`5ee7f61`. מקומית UI+Agent subtitle edit/delete עברו ל-CommandBus ונוסף Caption delete context-menu דינמי; right-click בתוך שדה הטקסט שומר את תפריט העריכה הטבעי. tsc, 196/196 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא Asset CommandBus/data-safety audit. Package C רק אחרי login עובד.
