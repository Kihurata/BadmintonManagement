# Expense Tracking Features

## Goal
Implement a new `expenses` table for OPEX (Fixed/Variable costs) and replace the "Báo cáo ngày" button on the Home page with a "Nhập chi phí" pop-up. Finally, add expense analysis to the Dashboard.

## Project Type
WEB

## Success Criteria
- The database schema is updated with the new ENUM and TABLE.
- Users can click "Nhập chi phí" (Data Entry) on the Home page to save an expense (Amount, Type, Note).
- Validating the expense shows up in the database.
- The Dashboard page successfully displays OPEX+COGS.

## Tech Stack
Next.js 14+, Tailwind CSS, Supabase PostgreSQL, Material Icons.

## File Structure
- `supabase/migrations/[timestamp]_create_expenses_table.sql` (New Migration)
- `src/components/home/quick-actions.tsx` (Change button layout)
- `src/components/home/expense-form.tsx` (New form component)
- `src/app/page.tsx` (Include ExpenseForm dialog)
- `src/app/dashboard/page.tsx` (Show expense stats)

## Task Breakdown

### Task 1: Update Database Schema
- **Agent**: `backend-specialist`
- **Skills**: `database-design`
- **Priority**: P0
- **Dependencies**: None
- **INPUT**: `supabase/migrations/`
- **OUTPUT**: Run `npx supabase migration new create_expenses_table` and write the `expense_type` ENUM and `expenses` table definition in the new migration file.
- **VERIFY**: Run `npx supabase db push` locally to apply the migration cleanly.

### Task 2: Build Expense Form UI & Logic
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: Next.js + Tailwind React component.
- **OUTPUT**: `src/components/home/expense-form.tsx` that inputs into the `expenses` table using `supabase` client.
- **VERIFY**: The form validates Amount/Type/Note, and successfully triggers an insert to the database.

### Task 3: Migrate Home Page Actions
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: P1.5
- **Dependencies**: Task 2
- **INPUT**: `src/components/home/quick-actions.tsx` and `src/app/page.tsx`.
- **OUTPUT**: Change the "Báo cáo ngày" button to "Nhập chi phí". Add an `isExpenseOpen` state in `page.tsx` and attach `<ExpenseForm />` within a Dialog.
- **VERIFY**: Clicking the "Nhập chi phí" button on the Home page securely opens the Modal.

### Task 4: Enhance Dashboard with Expenses
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`
- **Priority**: P2
- **Dependencies**: Task 1
- **INPUT**: `src/app/dashboard/page.tsx`
- **OUTPUT**: Add a section to fetch from `expenses` and display the values alongside existing revenue metrics (P&L tracking).
- **VERIFY**: The Dashboard visibly maps Fixed / Variable Expenses.

## Phase X: Verification
- [ ] No purple/violet hex codes
- [ ] No standard template layouts
- [ ] Socratic Gate was respected
- [ ] Lint: Pass
- [ ] Security: No critical issues
- [ ] Build: Success
- [ ] Date: TBD
