# HANDOFF

## Goal
Dashboard ברמת מוצר + המשך ROADMAP.

## Current State (verified)
- ממוזג ל-`main`: כרטיסי פרויקט עם תפריט ⋮ למעלה, פס זהות, בעלים/סטטיסטיקות
- נשמרו מ-main: BrandLogo, NewProjectWizard, dataMode/aspect badges, Auth PKCE, timeline zoom
- Auth PKCE: `@supabase/ssr` + server `/auth/callback`
- Timeline zoom: true zoom-out below fit (`timelineContentWidth`), range 5%–×400

## Exact Next Steps
1. לאמת `/dashboard` ב-Vercel אחרי deploy
2. Package C — Usage foundation / לפי ROADMAP
3. **לא** שינויי Auth נוספים בלי צורך

## Risks
- סטטיסטיקות כרטיס נטענות מ-IndexedDB לכל פרויקט
