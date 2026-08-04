# DATA_MODEL

## מצב נוכחי (client-first, אמת)
Hypescript כרגע **local-first ללא backend**. מקור-אמת לעריכה נשמר ב-IndexedDB (`lib/storage.ts`).

### מודל פרויקט בפועל (`lib/editor/`)
- `ProjectState` (`project.ts`): `schemaVersion` (=2), `clips`, `subs`, `tracks`.
- `MediaAsset` (`model.ts`): `id, name, kind(video|image|audio), file, duration, url`.
- `Clip` (EDL): `id, sourceId, start, end, volume?, enabled?` — רצף מסודר = הסרטון הסופי.
- `TrackMeta`: `id, name, type(video|audio|caption), order, height, locked, muted`.
- `Sub` (`subtitlesEdl.ts`): כתובית עם `id/start/end/text`.
- `Word` (`models.ts`): `text/start/end` — תמלול.
- אחסון: `hs:project:<id>:{state,media,chat}` ב-IndexedDB; מטא-פרויקטים ב-`storage.ts`. מפתחות תמלול לפי fingerprint ב-localStorage.
- Migration: `migrate.ts` + `normalizeTracks` (schemaVersion). **כל שינוי schema מחייב bump + migration** (אין לשבור פרויקטים קיימים).

### מגבלות מודל שיש להרחיב (חבילות הבאות)
- אין `VisualElement`/`VisualTransform` (overlays: image/logo/text/sticker/shape) → נדרש לחבילת Canvas.
- אין tracks מרובים מסוג overlay/text/effect; רק video/audio/caption יחידים (המנוע כרגע concat יחיד).
- אין `TransitionInstance`/`EffectInstance`/`PropertyKeyframe`/`AudioEnvelope`.
- אין `contentHash`/`AssetReplica` (local/cloud/hybrid).

## Package A — Auth foundation (Supabase migration קיימת)
קובץ: `supabase/migrations/20260804170000_pkg_a_foundation.sql` (`saas_foundation_schema_version = 1`).

טבלאות עם RLS: `profiles`, `user_settings`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs`, `login_events`, `credit_accounts` (stub ללא ledger מלא), `system_settings`.

הגנות: trigger `protect_system_owner` (אין delete/demote/suspend ל-system_owner), `handle_new_user` ליצירת profile+settings+role, helpers `is_system_owner` / `has_permission`.

## מודל יעד (חבילות B–G)
טבלאות נוספות מתוכננות: `organizations, organization_members, invitations, projects, project_members, project_snapshots, project_events, assets, asset_replicas, brand_kits, brand_assets, templates, template_versions, provider_definitions, provider_connections, provider_policies, agent_threads, agent_messages, agent_tool_runs, agent_checkpoints, jobs, usage_events, credit_grants, credit_reservations, credit_ledger_entries, cost_reservations, notifications, plans, subscriptions, …`.

עקרונות:
- `projects.project_document` (JSONB) = מסמך העריכה (הרחבה של ה-`ProjectState` הנוכחי) + `schema_version`.
- `assets` + `asset_replicas` מפרידים נכס לוגי מהעתקי-אחסון (local/cloud) עם `content_hash`.
- `agent_*` שומרים threads/messages/tool_runs/checkpoints עם `idempotency_key`.
- `credit_*`/`usage_events` — תשתית חיוב עתידית (immutable ledger, reservation→settlement→refund).

## מיגרציה מהמצב הנוכחי
פרויקטים קיימים ב-IndexedDB → ייבוא ל-`projects.project_document` תוך שמירת `schema_version` והרצת migration. אין למחוק נתונים מקומיים אוטומטית.
