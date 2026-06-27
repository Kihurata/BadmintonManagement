---
title: CONVENTIONS
description: Development guidelines, code style, state management practices, and API design conventions.
createdAt: '2026-05-24T08:36:44.396Z'
updatedAt: '2026-05-25T08:19:55.768Z'
tags:
  - core
---

# Development Conventions

This document outlines the coding standards, patterns, and conventions used throughout the Badminton Management System project.

## 1. Code Style & TypeScript

* **Strict Typing**: All new code must be fully typed. Avoid the use of `any`. Declare explicit interfaces or types for component props and API responses.
* **Component Patterns**: 
  * Prefer functional components with React hooks.
  * Structure components cleanly into layout, state management, and presentational sub-components.
* **Imports**: Use absolute import paths configured in `tsconfig.json` (e.g., `@/components/...`, `@/lib/...`).

## 2. Next.js 14 App Router & Routing

* **Route Organization**:
  * Pages and Layouts go under `src/app/`.
  * Group routes logically (e.g., `/customers`, `/dashboard`, `/invoices`, `/products`).
  * Backend API Route Handlers must go in `route.ts` inside their corresponding folder under `src/app/api/`.
* **Server vs. Client Components**:
  * Default to Server Components for data fetching where interactivity is not required.
  * Use `"use client"` at the top of files that require state, hooks, or event listeners (e.g., dialog forms, interactive charts).

## 3. Styling & UI Components

* **Tailwind CSS**: Use Tailwind CSS for all styling. Avoid custom styles in CSS files unless they represent global design tokens.
* **shadcn/ui**: Leverage standard shadcn UI components (Radix UI primitives). Customizations should be done by extending Tailwind classes or using the components' built-in variant properties.
* **Formatters**: Use formatting utilities like `formatCurrency` in `@/lib/utils` and `date-fns` for consistent date display (DD/MM/YYYY).

## 4. Database & State Management

* **React State**:
  * Use local state (`useState`, `useReducer`) for client-only UI flows (e.g., local cart item changes before checkout).
  * Sync client state with the database only when the user commits an action (e.g., clicking "Thanh toán").
* **Database Logic Location**:
  * **Triggers**: Always place inventory updates, auditing logs, and automatic synchronization in PostgreSQL triggers (defined in SQL migration files under `supabase/migrations/`).
  * **RPCs**: Perform complex atomic transactions (such as checking in a booking and creating an invoice simultaneously) via database RPC functions to guarantee transactional consistency.
* **Client SDK**: Use the Supabase JS client (`@/lib/supabase`) for querying and standard CRUD operations.

## 5. Documentation & Task Management

* **Knowns First**:
  * Refer to `KNOWNS.md` for overall repo rules.
  * Link related tasks, documentation, and specs using references like task-123 or @doc/workflow/workflow-booking-checkin
  * Never manually edit Knowns metadata block (frontmatter) in `.knowns/` markdown files without using the CLI tools or keeping formatting intact.
* **Validation**: Run `knowns validate` after making changes to documentation, templates, or tasks.


## 6. Access Control & Authorization

* **User Roles**: The system separates users into `OWNER` / `MANAGER` (Managers) and `STAFF` (Employees).
* **Role Hook**: Client components must use the `useUserRole` hook from `@/components/auth-provider` to access the user role and email.
* **Client Gating**: Hide write buttons, tabs, or forms if the user role is `STAFF`.
* **Route Protection**: Sensitive routes (like `/dashboard` and `/onboarding`) must redirect `STAFF` users to `/` with an error message in the query params.


## 7. API Testing & Documentation (Bruno)

* **Mandatory Bruno requests**: Every time you write, modify, or add a Next.js API Route Handler under `src/app/api/`, you **must** create or update a corresponding `.bru` request file inside the [bruno/](file:///d:/BadmintonManagement/bruno) folder.
* **CLI verification**: Always verify your API endpoints locally before committing by running the Bruno CLI runner:
  ```bash
  npx @usebruno/cli run bruno/ --env Local
  ```
  Ensure all requests (including authentication and database CRUD assertions) succeed with green status codes.
