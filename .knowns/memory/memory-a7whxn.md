---
id: a7whxn
title: Next.js Route Handler Export Restriction
layer: project
category: convention
tags:
  - nextjs
  - route
  - compilation
createdAt: '2026-06-23T17:31:52.328Z'
updatedAt: '2026-06-23T17:31:52.328Z'
---

Next.js App Router route handlers (route.ts) restrict exporting non-handler functions or schemas, which breaks static compilation. Define schemas inline or import from non-route helper files. Reference: @doc/learnings/learning-rest-products-api
