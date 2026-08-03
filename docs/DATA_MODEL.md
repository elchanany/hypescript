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

## מודל יעד (Supabase Postgres — חבילת מעטפת מוצר B/6, לא ממומש)
טבלאות (RLS בכל טבלה חשופה): `profiles, organizations, organization_members, invitations, projects, project_members, project_snapshots, project_events, assets, asset_replicas, brand_kits, brand_assets, templates, template_versions, provider_definitions, provider_connections, provider_policies, agent_threads, agent_messages, agent_tool_runs, agent_checkpoints, jobs, usage_events, credit_accounts, credit_ledger, cost_reservations, audit_logs, notifications`.

עקרונות:
- `projects.project_document` (JSONB) = מסמך העריכה (הרחבה של ה-`ProjectState` הנוכחי) + `schema_version`.
- `assets` + `asset_replicas` מפרידים נכס לוגי מהעתקי-אחסון (local/cloud) עם `content_hash`.
- `agent_*` שומרים threads/messages/tool_runs/checkpoints עם `idempotency_key`.
- `credit_*`/`usage_events` — תשתית חיוב עתידית (immutable ledger, reservation→settlement→refund).

## מיגרציה מהמצב הנוכחי
פרויקטים קיימים ב-IndexedDB → ייבוא ל-`projects.project_document` תוך שמירת `schema_version` והרצת migration. אין למחוק נתונים מקומיים אוטומטית.
