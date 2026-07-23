---
id: mww387
title: Supabase Remote Migration History Repair
layer: project
category: decision
status: proposed
tags:
  - database
  - supabase
  - migration
createdAt: '2026-07-05T08:09:26.365Z'
updatedAt: '2026-07-05T08:09:26.365Z'
---

Use 'supabase migration repair' with --status reverted (for missing files) and --status applied (for local replacements) to resolve out-of-sync remote schema tables without redeploying. Full reference: @doc/learnings/learning-supabase-migration-troubleshooting
