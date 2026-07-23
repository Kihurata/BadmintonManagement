---
title: "Learning: Supabase Migration Troubleshooting"
description: "Resolving out-of-sync remote migration tracking table issues when local files are renamed or missing."
tags: ["learning", "supabase", "database", "troubleshooting"]
---

## Patterns

### Repairing Remote Schema History
- **What:** Using the `supabase migration repair` command to manually mark missing/deleted migrations as `reverted` and consolidated/replaced migrations as `applied` on the remote database.
- **When to use:** When the remote database migration tracking table contains versions that are no longer present in local files, or when local migrations were applied out-of-order and fail to push.
- **Source:** Migration sync triage

## Decisions

### Mark renamed/missing migrations as reverted and applied
- **Chose:** Aligning the migration history table using `supabase migration repair` commands.
- **Over:** Attempting to force-rebuild the production schema or manually modifying `supabase_migrations.schema_migrations`.
- **Tag:** GOOD_CALL
- **Outcome:** The remote database tracking aligned perfectly with the local file state, enabling subsequent deployments to push successfully.
- **Recommendation:** Always use `npx supabase migration repair` for remote migration metadata issues.

## Failures

### Renaming and consolidating local migrations after remote push
- **What went wrong:** `supabase db push` failed due to missing migration files and out-of-order timestamps.
- **Root cause:** Changing local migration filenames or squashing/deleting migrations after they had already been applied to the remote staging/production databases.
- **Time lost:** 30 minutes.
- **Prevention:** Treat applied migrations as immutable. Never edit, rename, or delete local migration files once pushed. Always apply future changes via new migrations using `supabase migration new`.
