---
id: o2vxlz
title: Next.js Hybrid Data Loading Pattern
layer: project
category: convention
status: active
lastVerified: '2026-06-30T04:33:33.923Z'
tags:
  - nextjs
  - architecture
  - api
createdAt: '2026-06-30T03:51:19.773Z'
updatedAt: '2026-06-30T04:33:33.924Z'
---

Use a hybrid loading pattern: fetch read-only data directly via repositories in Server Components, perform writes via relative fetches to /api/v1/ Route Handlers, and sync state via router.refresh(). Full reference: @doc/learnings/learning-nextjs-hybrid-data-loading
