---
id: tywroe
title: Create central invoice helpers in invoice-utils.ts
status: done
priority: medium
labels:
  - from-spec
  - go-mode
createdAt: '2026-05-24T09:30:45.577Z'
updatedAt: '2026-05-24T09:41:03.287Z'
timeSpent: 79
spec: specs/optimize-and-unify-invoice-components
fulfills:
  - AC-4
---
# Create central invoice helpers in invoice-utils.ts

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/invoice-utils.ts to implement helper functions for generating VietQR URLs and formatting sharing text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement generateVietQrUrl helper
- [x] #2 Implement formatInvoiceShareText helper
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/lib/invoice-utils.ts
2. Implement generateVietQrUrl and formatInvoiceShareText
3. Export helpers
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created src/lib/invoice-utils.ts containing VietQR and sharing formatter helpers.
<!-- SECTION:NOTES:END -->

