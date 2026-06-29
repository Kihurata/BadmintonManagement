---
id: 3yi31b
title: Always run npm run build before commit
layer: project
category: convention
tags:
  - verification
createdAt: '2026-05-25T10:03:00.411Z'
updatedAt: '2026-05-25T10:03:00.411Z'
---

Running npm run build catches build-time Next.js static generation errors (like useSearchParams without Suspense) that unit tests skip. Full reference: @doc/learnings/learning-build-verification-before-commit
