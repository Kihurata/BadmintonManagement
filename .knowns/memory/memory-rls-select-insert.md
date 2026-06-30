---
id: rls-select-insert
title: Supabase RLS SELECT Policy Blocking INSERT ... RETURNING
layer: project
category: failure
status: active
confidence: high
lastVerified: '2026-06-30T01:26:37.005Z'
ttlDays: 365
sources:
  - '@doc/conventions'
tags:
  - supabase
  - rls
  - database
createdAt: '2026-06-24T12:00:00.000Z'
updatedAt: '2026-06-30T01:26:37.005Z'
---

Supabase client libraries (like `insert().select().single()`) translate to `INSERT ... RETURNING *`. PostgreSQL requires that the newly inserted row must satisfy both the INSERT policy AND the SELECT policy. If the user does not satisfy the SELECT policy (e.g. they don't have a linked user role yet), the insert will fail with an RLS policy violation. Resolve by allowing public SELECT access on the table if it doesn't leak sensitive data, or avoid using returning/select on the insert if not needed.
