---
title: README
description: Project overview and setup guide.
createdAt: '2026-05-24T08:31:57.577Z'
updatedAt: '2026-05-24T08:36:02.647Z'
tags:
  - core
---

# Badminton Management System

Knowns documentation and resources for the Badminton Management System.

## Project Goal
A comprehensive web application designed to streamline the operations of badminton court facilities, including court bookings, check-ins, inventory tracking (POS), invoicing, and debt/financial management.

## Key Subsystems
- **Court Booking & Check-in**: Manages court schedules, slot availability, and check-in fees. Refer to @doc/workflow/workflow-booking-checkin.
- **Checkout & Payments**: Calculates fees (court + POS items) and integrates VietQR. Refer to @doc/workflow/workflow-checkout-payment.
- **Point of Sale (POS) & Inventory**: Sells items (individual or packs) with automatic trigger-based stock deduction. Refer to @doc/workflow/workflow-pos-service-ordering.
- **Quick Sale**: Sells goods directly to walk-in customers without booking. Refer to @doc/workflow/workflow-quick-sale.
- **Debt & Day-End**: Tracks unpaid invoices and automates day-end closing. Refer to @doc/workflow/workflow-debt-receivables.

## Getting Started
1. Run local Supabase development environment: `supabase start`
2. Create `.env.local` based on Supabase CLI outputs.
3. Install dependencies: `npm install`
4. Run locally: `npm run dev`
