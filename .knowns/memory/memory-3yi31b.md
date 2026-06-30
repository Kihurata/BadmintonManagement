---
id: 3yi31b
title: Always run npm run build before commit
layer: project
category: convention
status: active
confidence: high
lastVerified: '2026-06-30T01:26:25.229Z'
ttlDays: 365
sources:
  - '@doc/learnings/learning-build-verification-before-commit'
tags:
  - verification
createdAt: '2026-05-25T10:03:00.411Z'
updatedAt: '2026-06-30T01:26:25.229Z'
---

Running npm run build catches build-time Next.js static generation errors (like useSearchParams without Suspense) that unit tests skip. Full reference: @doc/learnings/learning-build-verification-before-commit
