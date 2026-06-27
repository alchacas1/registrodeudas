# Split Bill Debts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Dividir cuenta" modal that creates one debt per selected debtor without changing the database schema.

**Architecture:** Add a pure `buildSplitDebts` helper in `src/lib/utils.ts` and test it first. Extend `src/pages/GroupPage.tsx` with split-bill state, modal UI, validation, and repeated calls to the existing `dbAddDebt` API.

**Tech Stack:** React, TypeScript, Vite, Supabase, Vitest.

## Global Constraints

- Do not change the database schema.
- Use the existing `debts` table via `dbAddDebt`.
- Do not create a debt where debtor and lender are the same member.
- Run `npx vitest run`, `npm run build`, and `npm run lint`.

---

### Task 1: Pure Split Calculation

**Files:**
- Modify: `src/lib/utils.test.ts`
- Modify: `src/lib/utils.ts`

**Interfaces:**
- Produces: `buildSplitDebts(totalAmount: number, lenderId: string, debtorIds: string[]): { debtorId: string; lenderId: string; amount: number }[]`

- [ ] Add a failing test that divides a total evenly across selected debtors.
- [ ] Add a failing test that excludes the lender from selected debtor IDs.
- [ ] Run `npx vitest run src/lib/utils.test.ts` and confirm the new tests fail.
- [ ] Implement `buildSplitDebts`.
- [ ] Run `npx vitest run src/lib/utils.test.ts` and confirm all tests pass.

### Task 2: Split Bill Modal

**Files:**
- Modify: `src/pages/GroupPage.tsx`

**Interfaces:**
- Consumes: `buildSplitDebts`.
- Uses existing `dbAddDebt(groupId, debtorId, lenderId, amount, currency, reason)`.

- [ ] Add `split` to `activeDialog`.
- [ ] Add split amount, currency, lender, debtor IDs, reason, saving state, and error state.
- [ ] Add a "Dividir cuenta" button beside the debt registration area.
- [ ] Render split modal fields for amount, lender, debtor checkboxes, reason, and per-person preview.
- [ ] On save, call `dbAddDebt` once per generated split debt, refresh the group, reset split state, and close the modal.

### Task 3: Verification

**Files:**
- Verify all changed files.

- [ ] Run `npx vitest run`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
