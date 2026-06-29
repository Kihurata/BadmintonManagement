---
title: Recurring Bookings
description: Specification for recurring bookings feature
createdAt: '2026-06-29T05:30:34.695Z'
updatedAt: '2026-06-29T06:12:01.862Z'
tags:
  - spec
  - approved
---

## Overview

Implement a recurring bookings feature allowing users to rent courts on multiple recurring days of the week (e.g., Monday, Wednesday, Friday) over a duration of time (up to 3 months).

## Locked Decisions

- **D1 (Conflict Resolution):** If there are scheduling conflicts during creation, the system will prompt the user with a list of conflicts, allowing them to choose whether to skip the conflicted slots or (if admin) overwrite them by canceling/deleting the existing bookings.
- **D2 (Series Modification):** 
  - A new "Recurring" management tab in the navigation menu allows users to manage recurring rules. Modifying or deleting here will prompt: "This and all future bookings" or "All bookings in the series".
  - Editing or deleting a single booking instance from the calendar/details page will show a warning: "This booking belongs to a recurring rule. Are you sure you want to change it?" and will only modify/delete that specific instance.
- **D3 (Scheduling Limit):** A recurring rule can span a maximum of 3 months from the start date.
- **D4 (DB Schema):** The database schema for `recurring_rules` will be modified to replace `day_of_week` (single integer) with `days_of_week` (integer array `integer[]`) to keep multiple days grouped under a single master rule.

## Requirements

### Functional Requirements

- **FR-1:** Database migration to:
  - Add `days_of_week integer[]` and drop `day_of_week` in `recurring_rules`.
  - Ensure RLS policies and triggers are properly attached to `recurring_rules` (already configured in our multi-tenant fix, but verified).
- **FR-2:** API endpoint (`/api/v1/bookings/recurring`) to handle creation of a recurring rule:
  - Detect conflicts with existing bookings.
  - Return a conflict list if any exist.
  - Create the recurring rule and generate individual `bookings` rows in a transaction when confirmed.
- **FR-3:** API endpoint to delete/update recurring rules and their associated bookings based on D2 choices.
  - `/api/v1/bookings/recurring` or `/api/v1/bookings/recurring/[ruleId]`
- **FR-4:** Front-end "Recurring Bookings" management page/tab to list all active recurring rules and allow updating/deleting them.
- **FR-5:** Front-end "Recurring Bookings" tab updated to include a dedicated form to create new recurring rules:
  - Fields for selecting Customer, Court, Start/End times.
  - Checkboxes to select days of the week (Mon-Sun).
  - Start date and End date fields (limited to max 3 months duration).
  - *Note: Normal booking forms (like AddBookingDialog) will stay the same and will not support creating recurring rules.*
- **FR-6:** Front-end Conflict Resolution modal/warning to display conflicts and allow the user to select "Skip" or "Overwrite" (admin only).

### Non-Functional Requirements

- **NFR-1:** Transaction integrity: Creation of a recurring rule and all of its individual bookings must run inside a database transaction to prevent partial states on error.
- **NFR-2:** Tenant isolation: RLS policies on `recurring_rules` and `bookings` must isolate data per tenant.

## Acceptance Criteria

- [ ] **AC-1:** Database schema updated to store multiple days of the week (`days_of_week integer[]`).
- [ ] **AC-2:** Booking a recurring court (e.g., Mon/Wed, 18:00 - 20:00 for 1 month) successfully generates all individual bookings.
- [ ] **AC-3:** If scheduling conflicts occur, the UI displays a list of conflicted dates and prompts the user to skip them or overwrite them (admin only).
- [ ] **AC-4:** Modifying a single booking instance from the main calendar shows a warning and only modifies that instance.
- [ ] **AC-5:** Deleting a series from the "Recurring" tab prompts the user and deletes either all future bookings or the entire series.
- [ ] **AC-6:** The UI restricts the end date of a recurrence to a maximum of 3 months from the start date.

## Scenarios

### Scenario 1: Happy Path (No conflicts)
- **Given** Court 1 has no bookings in October.
- **When** User creates a recurring booking for Court 1 on Mon and Wed, 18:00 - 20:00, from Oct 1 to Oct 31.
- **Then** System creates a `recurring_rules` row and generates 9 individual booking instances.

### Scenario 2: Overlap Conflict (User skips)
- **Given** Court 1 is already booked on Wednesday, Oct 15th, 18:00 - 19:00.
- **When** User tries to book Court 1 on Mon and Wed, 18:00 - 20:00, from Oct 1 to Oct 31.
- **Then** System returns a conflict on Oct 15th. User selects "Skip Conflict".
- **And** System creates all bookings except for Wednesday, Oct 15th.

### Scenario 3: Single Booking Edit
- **Given** A recurring series is created.
- **When** User opens the booking details for Oct 13th (Monday) on the calendar and changes the time to 19:00 - 21:00.
- **Then** System shows a warning, and only updates the booking for Oct 13th, leaving the rest of the series unchanged.
