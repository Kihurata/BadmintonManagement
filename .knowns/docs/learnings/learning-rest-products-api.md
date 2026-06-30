---
title: 'Learning: REST Products API'
description: Learnings from implementing the REST products API
createdAt: '2026-06-23T17:31:30.163Z'
updatedAt: '2026-06-23T17:31:46.559Z'
tags:
  - learning
  - product
  - nextjs
  - zod
---

# Learning: REST Products API

Learnings from implementing the REST products API, focusing on Zod validation, Next.js route constraints, and PATCH defaults.

## Patterns

### Inline Zod validation in Next.js Route Handlers
- **What:** Define Zod schemas directly inside Next.js `route.ts` files (e.g., `productSchema`) rather than exporting them from shared helper files.
- **When to use:** In Next.js route handlers (`route.ts`) to avoid Next.js compilation/static generation errors due to strict route handler export limitations.
- **Source:** @task-0gih9b

### Explicit Property Mapping
- **What:** Map Zod validation results explicitly to database payloads (e.g., `product_name: validData.product_name`, `base_unit: validData.base_unit ?? null`) rather than using object destructuring or spreading (`const { ... } = validData` or `{ ...validData }`).
- **When to use:** When writing to a database repository where Zod optional inputs can be `undefined`, but the database expects specific `null` values or defaults, and during partial (`PATCH`) updates to prevent default values from overriding omitted fields.
- **Source:** @task-0gih9b

### Conditional Cross-Field Validation (Zod Refine)
- **What:** Use Zod `.refine()` (or `.superRefine()`) to enforce conditional requirements where the presence or value of one field mandates validation of other fields (e.g., if `is_packable === true`, then `pack_unit`, `units_per_pack`, and `pack_price` must be provided).
- **When to use:** When schema attributes have dependent validations that cannot be modeled as simple field types.
- **Source:** @task-0gih9b

## Decisions

### Inline Schemas over Shared Validator Helper File
- **Chose:** Defining Zod schemas in-line inside `route.ts`.
- **Over:** Exporting schemas/helpers from a shared `src/lib/product-validator.ts` file.
- **Tag:** GOOD_CALL
- **Outcome:** Avoids Next.js App Router static compilation errors which prevent exporting non-handler functions or variables from `route.ts` files.
- **Recommendation:** Keep validation schemas inside the route files or import them from external, non-route helper files.

### Explicit Property Assignment over Object Destructuring for Optional/PATCH Inputs
- **Chose:** Assigning properties explicitly with nullish coalescing `??` defaults or mapping `undefined` to `null`.
- **Over:** Destructuring with default parameters (e.g., `const { units_per_pack = null } = validData`).
- **Tag:** TRADEOFF
- **Outcome:** Destructuring defaults (like `units_per_pack = null`) evaluate when a property is omitted in a partial `PATCH` request, causing the omitted field to be updated to `null` in the DB instead of remaining unchanged. Explicit assignment or conditional properties prevent this.
- **Recommendation:** Avoid destructuring defaults in partial updates; map attributes individually and explicitly.

### Local Try-Catch for Request JSON Parsing
- **Chose:** Wrapping `await req.json()` in a local try-catch to return 400 Bad Request if the JSON is malformed or empty.
- **Over:** Allowing parsing errors to propagate to the global catch block, returning a 500 error.
- **Tag:** GOOD_CALL
- **Outcome:** Correctly exposes request formatting errors to clients (400) rather than reporting them as system faults (500).
- **Recommendation:** Always wrap `await req.json()` in a try-catch block in Next.js Route Handlers.

### Product Status field for Soft Deactivation
- **Chose:** Adding a `status` column (`'ACTIVE' | 'INACTIVE'`) to products to support soft deactivation.
- **Over:** Relying solely on physical DELETE (which returns 409 Conflict when products are linked to historic invoices).
- **Tag:** GOOD_CALL
- **Outcome:** Allows frontend to deactivate/hide products without causing Foreign Key constraint violations on historical invoice records.
- **Recommendation:** Always include a `status` field or soft-delete timestamps on entities that are likely to be referenced by financial or transactional records.

## Failures

### Zod Partial on Refined Schema
- **What went wrong:** Attempting to call `.partial()` on a schema that was refined using `.refine()` failed because `.refine()` returns a `ZodEffects` object, which does not have a `.partial()` method.
- **Root cause:** `ZodEffects` wraps the base schema and does not expose object-level modifiers like `.partial()`.
- **Time lost:** ~10 minutes.
- **Prevention:** Construct the base object schema, call `.partial()` to make fields optional, and then apply `.refine()` on the resulting schema.

### Zod Schema Defaults Overwriting PATCH Omissions
- **What went wrong:** When fields in a Zod schema had `.default(false)`, calling `.partial()` and parsing a PATCH body with omitted fields resulted in Zod populating the default values, which overwrote existing database values.
- **Root cause:** Zod treats omitted partial fields as `undefined`, and defaults are applied when a field is `undefined`.
- **Time lost:** ~15 minutes.
- **Prevention:** Avoid `.default()` in schemas used for partial updates. Use `.optional()` without defaults, and handle fallbacks in the database or repository layer during inserts.

### Zod Optional Field Logic Vulnerability (Missing Cross-Field Constraints)
- **What went wrong:** We defined pack unit, price, and count fields as optional in the Zod schema. A client could send `is_packable: true` but omit the pack details, leading to incomplete or invalid business data in the database.
- **Root cause:** Defining fields as independent optional properties instead of modeling the cross-field dependency.
- **Time lost:** ~20 minutes.
- **Prevention:** Use `.refine()` or `.superRefine()` on the base object schema to assert cross-field constraints.
