---
id: q3rmn1
title: Bruno API testing and CLI validation
layer: project
category: convention
status: active
confidence: high
lastVerified: '2026-06-30T01:26:35.992Z'
ttlDays: 365
sources:
  - '@doc/learnings/learning-bruno-api-testing'
tags:
  - testing
  - bruno
  - api
createdAt: '2026-06-27T08:52:46.544Z'
updatedAt: '2026-06-30T01:26:35.992Z'
---

Every Next.js API route handler must have a corresponding .bru request in the bruno/ folder. Run npx @usebruno/cli run bruno/ --env Local to validate APIs locally. Reference: @doc/learnings/learning-bruno-api-testing
