# Registrodeudas Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the project around the active React/Vite/Supabase app and archive the legacy Express/vanilla app.

**Architecture:** Legacy code moves to `_legacy/`. Active React code is split into route, page, UI component, type, and pure utility modules. Tests cover the pure utility behavior before extraction.

**Tech Stack:** React, Vite, TypeScript, Supabase, Vitest.

## Global Constraints

- Preserve current React app behavior.
- Do not delete archived legacy code in this pass.
- Keep the active app under `src/`.
- Use TDD for new extracted utility behavior.
- Verify with `npm run build` and `npm run lint`.

---

### Task 1: Utility Tests and Extraction

**Files:**
- Create: `src/lib/utils.test.ts`
- Create: `src/lib/utils.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `computeSummaries(group: Group)`, `computeDebtBetween(debtorId: string, lenderId: string, debts: Debt[])`, `avatarColors(name: string)`, `currencySymbol(currency: string)`, `fmt(value: number)`.

- [ ] Write failing Vitest tests for debt summaries, pairwise debt, avatar colors, currency symbols, and formatting.
- [ ] Run `npx vitest run src/lib/utils.test.ts` and confirm it fails because `src/lib/utils.ts` does not exist.
- [ ] Create `src/lib/utils.ts` with the extracted pure functions.
- [ ] Update `src/App.tsx` to import these functions.
- [ ] Run `npx vitest run src/lib/utils.test.ts` and confirm it passes.

### Task 2: Archive Legacy Code

**Files:**
- Move: `src/index.tsx` to `_legacy/src/index.tsx`
- Move: `src/routes.tsx` to `_legacy/src/routes.tsx`
- Move: `public/index.html` to `_legacy/public/index.html`
- Move: `public/js/app.js` to `_legacy/public/js/app.js`
- Move: `public/css/style.css` to `_legacy/public/css/style.css`
- Move: `public/css/style.src.css` to `_legacy/public/css/style.src.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: active Vite entry point `src/main.tsx`.
- Produces: clean active `src/` and `public/` paths.

- [ ] Move legacy files to `_legacy/`.
- [ ] Remove `build:public` from `package.json`.
- [ ] Change `build` to `tsc -b && vite build`.

### Task 3: Split React Modules

**Files:**
- Create: `src/components/ui.tsx`
- Create: `src/pages/Home.tsx`
- Create: `src/pages/GroupPage.tsx`
- Modify: `src/App.tsx`
- Move: `src/types.tsx` to `src/types.ts`
- Modify: imports in `src/lib/db.ts` and React modules.

**Interfaces:**
- Produces: `Home`, `GroupPage`, and shared UI components.
- `src/App.tsx` renders only `BrowserRouter`, `Routes`, and route definitions.

- [ ] Extract design tokens and shared UI components to `src/components/ui.tsx`.
- [ ] Extract the `Home` component to `src/pages/Home.tsx`.
- [ ] Extract the `GroupPage` component to `src/pages/GroupPage.tsx`.
- [ ] Replace `src/App.tsx` with route setup imports.
- [ ] Rename `src/types.tsx` to `src/types.ts` and update imports.

### Task 4: Final Verification

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: buildable, linted project.

- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Fix any TypeScript, bundling, or lint errors without changing behavior.
