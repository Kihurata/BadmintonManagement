---
title: data-access-layer-refactor
description: Specification for refactoring database access into a Clean Architecture DAL
createdAt: '2026-05-25T09:54:42.855Z'
updatedAt: '2026-05-25T09:56:28.281Z'
tags:
  - spec
  - approved
---

# Data Access Layer Refactor

## Overview

Refactor the database interaction layer of the Badminton Management System to align with Clean Architecture principles. This involves isolating UI components (Client Components) from direct Supabase query syntax and API interactions, routing write operations (CUD) through Next.js API Routes, using Server Components for read operations, and encapsulating realtime WebSocket listeners inside a dedicated service layer.

## Locked Decisions

Decisions extracted during the exploring phase:
- **D1**: Use standard Next.js REST API Routes (`src/app/api/...`) as the primary bridge for all data mutations (CUD operations) instead of Server Actions.
- **D2**: Refactor all three core modules: Booking & Checkin, Invoices & Checkout, and Quick Sale & Expenses in this scope.
- **D3**: Centralize realtime event handling (WebSocket subscription for court updates) into a dedicated Service layer (`src/lib/services/realtime-service.ts`) instead of direct raw client-side subscriptions.
- **D4**: Fetch data (Read operations) directly on the server in Next.js Server Components for major pages (Dashboard, Schedule, Invoices) using server-side repositories.

## Requirements

### Functional Requirements
- **FR-1**: Components MUST NOT import `supabase` client from `@/lib/supabase` directly to execute `select`, `insert`, `update`, or `delete` queries.
- **FR-2**: All data mutations (CUD) MUST be executed by sending HTTP requests (POST/PUT/PATCH/DELETE) to Next.js API Routes.
- **FR-3**: API Routes MUST perform input validation, authenticate the request, enforce authorization rules, and interact with the database using the server-side Supabase client (`@/utils/supabase/server`).
- **FR-4**: Page-level components for Dashboard, Schedule, and Invoices MUST be Server Components that load data from server-side repositories, rendering UI on the server.
- **FR-5**: Realtime WebSocket subscriptions for court updates MUST be handled by a centralized React Hook or Service class that maps PostgreSQL changes to clean UI events.

### Non-Functional Requirements
- **NFR-1 (Security)**: Database schema details, table names, and raw SQL queries MUST NOT be exposed or built on the client-side JavaScript bundle.
- **NFR-2 (Testability)**: All repository methods and API routes MUST be unit-testable in isolation using Jest without requiring complex client-side Supabase mocking.

## Acceptance Criteria

- [ ] AC-1: Zero occurrences of `supabase.from` imports or usage in Client Components located in `src/components/` and `src/app/` (except inside the centralized Client Repository layer).
- [ ] AC-2: Existing unit tests run and pass without mock failures, showing that components interact correctly with the new API Routes.
- [ ] AC-3: Verify court booking status updates instantly on the homepage in response to realtime PostgreSQL change events through the centralized realtime service.
- [ ] AC-4: Dashboard, Schedule, and Invoices page-level files do not contain `"use client"` at the top level and perform server-side fetching.

## Scenarios

### Scenario 1: Booking Check-in Flow (Mutation)
**Given** A user is viewing the Booking Details dialog on the frontend for booking `booking_123`
**When** The user clicks the "Check-in" button
**Then** The frontend sends a POST request to `/api/bookings/check-in` with body `{ bookingId: 'booking_123' }`
**And** The API Route calls the server-side repository to invoke the database RPC `check_in_booking`
**And** The API Route returns a 200 OK success response with the updated booking and invoice data
**And** The frontend updates the local UI state using the API response

### Scenario 2: Realtime Court Status Update
**Given** The homepage court layout is open on two different browsers
**When** A booking check-in is performed on Browser A
**Then** Browser B's centralized realtime service detects the postgres change event for `bookings` table
**And** The realtime service pushes the updated court state to the component via React state
**And** Browser B's court layout updates automatically to show the court is "In Use"

## Technical Notes

### Proposed Folder Structure:
- `src/server/repositories/`: Server-side data access functions (only imported by API Routes or Server Components).
  - `booking-repository.ts`
  - `invoice-repository.ts`
  - `product-repository.ts`
- `src/app/api/`: Next.js REST API routes.
  - `api/bookings/check-in/route.ts`
  - `api/bookings/checkout/route.ts`
  - `api/bookings/route.ts`
  - `api/invoices/route.ts`
  - `api/products/route.ts`
- `src/lib/services/`: Centralized client-side service layer.
  - `realtime-service.ts`: Manages WebSocket connections to Supabase.
