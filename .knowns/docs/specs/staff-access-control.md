---
title: Staff Access Control
description: Specification for staff access control
createdAt: '2026-05-24T09:29:30.167Z'
updatedAt: '2026-05-24T09:34:33.571Z'
tags:
  - spec
  - approved
---

# Staff Access Control Specification

## Overview
This specification defines the access control system for the Badminton Management System, establishing authorization boundaries between two user roles: **Manager** (roles `OWNER` or `MANAGER` in the database) and **Employee** (role `STAFF` in the database).
The goal is to prevent unauthorized access to sensitive financial figures, opex records, inventory adjustments, and billing management.

## Locked Decisions
- **D1**: Redirect unauthorized `STAFF` users from restricted routes (like `/dashboard`, `/onboarding`) to the home page `/` and show a Toast error notification.
- **D2**: Show the logged-in user's email directly as their display name and their resolved role description ("Quản lý" or "Nhân viên") in the Sidebar profile widget.
- **D3**: For the initial release, access restrictions are enforced client-side (hiding UI items/buttons, client-side route redirection). Server-side check specifications are documented in Technical Notes for future phases.

## Requirements

### Functional Requirements
- **FR-1**: Retrieve the logged-in user's role and email from Supabase authentication and the `user_roles` table.
- **FR-2**: Implement a React Context provider or a custom React hook (e.g. `useUserRole`) to fetch, store, and expose the user's role (`STAFF` | `MANAGER` | `OWNER`), email, and loading state to client components.
- **FR-3**: Sidebar Navigation Filtering
  - If user is `STAFF`, hide the "Báo cáo" (Dashboard) link from the sidebar menu.
  - Show the user profile section at the bottom of the sidebar with their logged-in email and translated role name ("Nhân viên" for `STAFF`, "Quản lý" for `OWNER` or `MANAGER`).
- **FR-4**: Bottom Navigation Filtering (Mobile UI)
  - If user is `STAFF`, hide the "Báo cáo" (Dashboard) navigation icon.
- **FR-5**: Home Page Quick Actions Gating
  - If user is `STAFF`, hide the "Nhập chi phí" (Add expense) action card.
- **FR-6**: Products Page Gating
  - If user is `STAFF`, hide the "Lịch sử kho" (Inventory History) tab.
  - If user is `STAFF`, hide the stock adjustment icon button (`swap_vert`).
- **FR-7**: Invoices Page & Debt Management Gating
  - If user is `STAFF`, block / hide any option to close day-end (`Kết thúc ngày` / chốt sổ) or adjust customer debt.
- **FR-8**: Client-Side Route Protection
  - Intercept direct page access to `/dashboard` and `/onboarding` for `STAFF` users. If visited, redirect to the home page `/` and trigger a Toast notification with the message "Bạn không có quyền truy cập vào trang này".

### Non-Functional Requirements
- **NFR-1**: Smooth UI transitions when checking role state (avoid content flashing or layout shifts). Show a loading spinner if the role state is still being determined.
- **NFR-2**: Strict TypeScript typings for all role states.

## Acceptance Criteria
- [ ] **AC-1**: Exposes `useUserRole` hook providing `role`, `email`, and `loading`.
- [ ] **AC-2**: Logged-in `STAFF` user has the "Báo cáo" navigation links removed from both the Sidebar and the Bottom Navigation.
- [ ] **AC-3**: Direct navigation to `/dashboard` or `/onboarding` as `STAFF` redirects to `/` with a Toast error message: "Bạn không có quyền truy cập vào trang này".
- [ ] **AC-4**: Logged-in `STAFF` user sees their email and "Nhân viên" in the Sidebar's profile widget.
- [ ] **AC-5**: Logged-in `STAFF` user does not see the "Nhập chi phí" button on the Home page.
- [ ] **AC-6**: Logged-in `STAFF` user only sees the "Sản phẩm" list on the `/products` page. The "Lịch sử kho" tab and stock adjustment icon are hidden.
- [ ] **AC-7**: Logged-in `OWNER` or `MANAGER` user sees all tabs, actions, and reports without restrictions, showing "Quản lý" in the Sidebar.

## Scenarios

### Scenario 1: Staff Home & Navigation Gating
- **Given** an authenticated user with the role `STAFF` is on the home page `/`
- **When** the Sidebar and BottomNav load
- **Then** the "Báo cáo" navigation option is completely hidden
- **And** the "Nhập chi phí" quick action card is not displayed
- **And** the user profile widget at the bottom displays the user's email and role as "Nhân viên"

### Scenario 2: Direct URL Intrusion
- **Given** an authenticated user with the role `STAFF`
- **When** they manually type `http://localhost:3000/dashboard` in the browser address bar
- **Then** the page redirects them to `/`
- **And** a Toast message is displayed: "Bạn không có quyền truy cập vào trang này"

### Scenario 3: Manager Access
- **Given** an authenticated user with the role `MANAGER` or `OWNER`
- **When** they navigate the application
- **Then** all navigation options, pages (including `/dashboard` and `/onboarding`), tabs, and quick actions are fully visible and functional
- **And** the user profile widget displays their email and role as "Quản lý"

## Technical Notes
- Role query from database:
  ```ts
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  ```
- Protect client routes by wrapping `/dashboard/page.tsx` and `/onboarding/page.tsx` in a layout check or page-level check using the custom hook, showing a loading indicator before redirecting via `next/navigation`'s `useRouter()`.

### Future Scope (Server-Side Protections)
For future development phases, check-ins, and database transactions:
- Intercept and validate the user's role on Server Actions and API routes (e.g. `setupCourts` in onboarding actions, expense actions, stock adjustments, and day-end closing transactions).
- Reject the request with a `403 Forbidden` error if the authenticated user's role is `STAFF`.

## Open Questions
- None.
