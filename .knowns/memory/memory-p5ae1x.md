---
id: p5ae1x
title: PATCH Updates and Zod Defaults
layer: project
category: failure
status: active
confidence: high
lastVerified: '2026-06-30T01:26:35.126Z'
ttlDays: 365
sources:
  - '@doc/learnings/learning-rest-products-api'
tags:
  - zod
  - patch
  - database
createdAt: '2026-06-23T17:31:53.608Z'
updatedAt: '2026-06-30T01:26:35.127Z'
---

Using .default() in Zod schemas for partial updates (PATCH) populates default values for omitted properties, overwriting DB fields. Use .optional() without defaults, and map values explicitly. Reference: @doc/learnings/learning-rest-products-api
