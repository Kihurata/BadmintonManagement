---
id: ke4vld
title: Next.js strict compilation dead code failures
layer: project
category: failure
status: active
confidence: high
lastVerified: '2026-06-30T01:26:33.047Z'
ttlDays: 365
sources:
  - '@doc/learnings/learning-typescript-strict-compilation'
tags:
  - typescript
  - build
createdAt: '2026-06-29T14:44:36.800Z'
updatedAt: '2026-06-30T01:26:33.048Z'
---

Dead code like unused imports and destructured variables block Next.js builds under strict rules. Clean them up and run npm run build. Full reference: @doc/learnings/learning-typescript-strict-compilation
