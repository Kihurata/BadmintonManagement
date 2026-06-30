---
id: browser-subagent-testing
title: Proactive Browser Subagent Verification
layer: project
category: pattern
status: active
confidence: high
lastVerified: '2026-06-30T01:26:31.004Z'
ttlDays: 365
sources:
  - '@doc/guides/e2e-booking-workflow-test'
tags:
  - verification
  - testing
  - subagent
createdAt: '2026-06-24T12:35:00.000Z'
updatedAt: '2026-06-30T01:26:31.004Z'
---

After completing interactive user flows, proactively spawn a Browser Subagent to click through and test them in a clean, SW-free browser profile. This immediately isolates and separates local browser cache conflicts (like PWA Service Workers on localhost:3000) from actual RLS/database and server action logic bugs. Full reference: @doc/guides/e2e-booking-workflow-test
