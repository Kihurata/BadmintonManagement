---
id: 5qxrjp
title: Prepaid Invoices Trigger-Based Status Syncing
layer: project
category: pattern
status: proposed
tags:
  - database
  - trigger
  - prepayment
  - invoicing
createdAt: '2026-07-04T18:14:54.148Z'
updatedAt: '2026-07-04T18:14:54.148Z'
---

For prepayment flows where future bookings are paid upfront and items (e.g. products) are added mid-session, introducing a paid_amount column on the invoices table combined with a database BEFORE INSERT OR UPDATE trigger sync_invoice_paid_status enables automated maintenance of the is_paid boolean state. This cleanly separates application-level item mutations from core billing status logic and prevents duplicate payment bugs.
