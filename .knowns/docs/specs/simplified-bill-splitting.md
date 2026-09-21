---
title: Simplified Bill Splitting & Item Allocation
description: Specification for decoupled member roster, inline attendant selection, direct POS item allocation, and checkout bill split breakdown
createdAt: '2026-08-08T07:40:00.000Z'
updatedAt: '2026-08-08T07:40:00.000Z'
tags:
  - spec
  - draft
---

## Overview

Refactor the court fee and bill splitting feature into a streamlined, high-usability workflow:
1. Remove host-customer dependency in favor of a facility-wide `members` roster.
2. Allow staff to check off attending members directly within the booking/invoice.
3. Prompt staff with a quick choice when adding consumable items (e.g., shuttlecocks vs. personal drinks): **Dùng chung cả sân** vs. **Riêng cho thành viên**.
4. Automatically compute the bill split and display each member's breakdown inside the checkout flow.

## Locked Decisions

- **D1 (Decoupled Roster):** Group members are not owned by any single host customer; they are tenant-level `members` who can attend any court session or booking.
- **D2 (Direct Attendant Selection):** Staff selects attending members from a dialog inside Booking Details, with an in-place "+ Thêm người chơi mới" input.
- **D3 (Immediate POS Allocation):** When attendant members are active on a booking, clicking a product in the Menu opens a 1-tap allocation modal:
  - Option A: 🏸 **Dùng chung cả sân** (`allocation_type = 'SHARED'`) for shared items like shuttlecocks, court water.
  - Option B: 👤 **Riêng cho thành viên** (`allocation_type = 'INDIVIDUAL'`) selecting one attending member for personal drinks.
- **D4 (Checkout Integration):** The Checkout Form embeds a dynamic **Bảng chia tiền nhóm** calculating:
  - $\text{Shared Pool} = \text{Court Fee} + \sum \text{Shared Items}$
  - $\text{Base Share} = \text{Shared Pool} / N_{\text{attendees}}$
  - $\text{Member Total} = \text{Base Share} + \sum \text{Individual Items}$
  - A formatted "Sao chép Zalo" button for customer communication.

## Requirements

### Database Layer
- **FR-1:** Create `public.members` table with `id`, `tenant_id`, `name`, `phone`, `zalo`, `is_active`.
- **FR-2:** Update foreign keys on `invoice_split_attendance` and `invoice_items.assigned_member_id` to reference `public.members(id)`.
- **FR-3:** Recreate `invoice_split_summary` view to join `public.members` and calculate `shared_share`, `individual_total`, and `total_due`.

### Backend Layer
- **FR-4:** Create `src/server/repositories/member-repo.ts` for tenant member CRUD operations.
- **FR-5:** Update `split-repo.ts` to query members and compute shared pool vs. personal item splits.
- **FR-6:** Update `invoice-repo.ts` (`addInvoiceItem`) and `POST /api/invoices/items` to accept `allocationType` and `assignedMemberId`.
- **FR-7:** Create RESTful route `GET / POST /api/v1/members`.

### Frontend Layer
- **FR-8:** Create `AttendantSelectorDialog.tsx` for searching, checking, and adding attending members in Booking Details.
- **FR-9:** Create `ItemAllocationDialog.tsx` pop-up triggered upon selecting products from Menu in `booking-details.tsx`.
- **FR-10:** Update `checkout-form.tsx` to render the dynamic Split Breakdown card and Zalo text copy button.

## Acceptance Criteria

- [ ] **AC-1 (DB):** Migration `20260808000000_simplified_members_and_splitting.sql` creates `members` and links attendance and items tables.
- [ ] **AC-2 (DAL):** `member-repo.ts` fetches and creates members; `split-repo.ts` returns accurate per-member split summaries.
- [ ] **AC-3 (API):** `POST /api/invoices/items` persists `allocation_type` and `assigned_member_id`.
- [ ] **AC-4 (UI-Attendance):** Staff can check off attending players and quickly add new players from Booking Details.
- [ ] **AC-5 (UI-POS):** Clicking a product when attendants are present prompts "Dùng chung cả sân" vs. "Riêng cho thành viên".
- [ ] **AC-6 (UI-Checkout):** Checkout displays per-member breakdown (court fee + shuttlecocks divided by N + personal drinks).
- [ ] **AC-7 (Verification):** Production build `npm run build` compiles with 0 TypeScript/ESLint errors.

## Scenarios

### Scenario 1: Mixed Session (Court Fee + Shared Shuttlecocks + Individual Drinks)
**Given** a checked-in booking with a 200,000 VND court fee and 4 attending members (Huy, Nam, Dung, Tuan).
**When** staff adds 1 tube of shuttlecocks (240,000 VND) marked **Dùng chung** and 1 Revive (15,000 VND) assigned to **Huy**.
**Then**:
- Shared Pool = 200,000 + 240,000 = 440,000 VND.
- Base share per person = 110,000 VND.
- Huy's total = 110,000 + 15,000 = 125,000 VND.
- Nam, Dung, Tuan totals = 110,000 VND each.
- Total invoice = 455,000 VND.

### Scenario 2: Standard Walk-in Without Attendants Checked
**Given** a booking with no attendant members selected.
**When** staff adds products from the Menu.
**Then** items are added directly without prompting the allocation modal, behaving as standard booking items.
