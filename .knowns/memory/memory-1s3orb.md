---
id: 1s3orb
title: ZodEffects and Partial Limitation
layer: project
category: failure
status: active
confidence: high
lastVerified: '2026-06-30T01:26:16.820Z'
ttlDays: 365
sources:
  - '@doc/learnings/learning-rest-products-api'
tags:
  - zod
  - refinement
createdAt: '2026-06-23T17:31:54.867Z'
updatedAt: '2026-06-30T01:26:16.821Z'
---

Zod .refine() returns a ZodEffects wrapper, which lacks the .partial() method. Call .partial() on the base schema first, then apply refinements. Reference: @doc/learnings/learning-rest-products-api
