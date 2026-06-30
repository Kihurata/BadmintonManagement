---
title: 'Learning: Supabase Online for Local Verification'
description: Decision to use online Supabase instance instead of local Docker for local verification.
createdAt: '2026-06-29T05:13:36.660Z'
updatedAt: '2026-06-29T05:13:36.660Z'
tags:
  - learning
  - supabase
  - env
---

# Learning: Supabase Online for Local Verification

## Decisions

### Local Verification Environment
- **Chose:** Online Supabase project instance (via `.env.local`)
- **Over:** Local Supabase docker environment (`supabase start` / `http://127.0.0.1:54321`)
- **Tag:** TRADEOFF
- **Outcome:** Local development, API verification, and Bruno tests run against the live online Supabase staging/development instance instead of local Docker. This avoids local Docker resource usage but requires stable internet access and active remote credentials.
- **Recommendation:** Keep `.env.local` updated with the online project credentials and avoid running `supabase start` if using the remote instance.
