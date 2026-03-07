# Invoice Dual-Mode Architecture

## Overview
Implement a dual-mode invoice page to separate transaction history (date-based auditing) from receivables/debt (customer-based unpaid balances), aligning with the real-world operational needs of the sports facility.

## Project Type
WEB

## Success Criteria
- Users can toggle between "Lịch Sử Giao Dịch" (Transaction History: chronological feed) and "Công Nợ" (Receivables: customer debt tracker).
- Transaction History allows filtering by a specific date range (From Date - To Date) to view past months and specific days.
- Receivables tab lists customers with outstanding balances, grouping unpaid invoices, and allows generating a consolidated monthly statement.
- The UI follows brutalist, sharp geometry (1px-2px border radius maximum) for a dense, professional financial ledger aesthetic, avoiding generic SaaS clichés.

## Tech Stack
- Frontend: Next.js (App Router), React, Tailwind CSS (Sharp edges, brutalist style, high-contrast indicators)
- Database/Backend: Supabase (SQL queries for debt grouping)
- Components: Custom UI, brutalist segmented control, date range picker

## File Structure
- `src/app/invoices/page.tsx` (Main layout and Tab State logic)
- `src/components/invoices/transaction-history.tsx` (New component for date-filtered list)
- `src/components/invoices/receivables-ledger.tsx` (New component for debt tracking)
- `src/components/ui/segmented-control.tsx` (New brutalist toggle component)

## Task Breakdown
- [ ] Task 1: Create `segmented-control.tsx` (brutalist style) → Agent: `frontend-specialist` (Skill: `frontend-design`) → Verify: Renders toggle with sharp edges and clear active states.
- [ ] Task 2: Build `transaction-history.tsx` with Date Range Picker → Agent: `frontend-specialist` (Skill: `frontend-design`) → Verify: Date range correctly filters Supabase `invoices` query.
- [ ] Task 3: Build `receivables-ledger.tsx` fetching aggregated unpaid debt per customer → Agent: `backend-specialist` (Skill: `database-design`) → Verify: Displays grouped customers with total unpaid amounts properly calculated.
- [ ] Task 4: Integrate tabs into `src/app/invoices/page.tsx` → Agent: `frontend-specialist` (Skill: `react-best-practices`) → Verify: Switching tabs conditionally renders the correct component without losing state.
- [ ] Task 5: Add Generate Consolidated Receipt logic in Receivables tab → Agent: `backend-specialist` (Skill: `api-patterns`) → Verify: Clicking a customer generates a merged view of all their unpaid invoices.

## Phase X: Verification
- [ ] Lint & Type Check: `npm run lint && npx tsc --noEmit`
- [ ] UX Audit: `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] Build Check: `npm run build`
- [ ] Rule Compliance check: No purple/violet hex codes, no standard template layouts used.
