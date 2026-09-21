# Direct Group Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow invited members to enter a group immediately with its code and their email, while retaining email-link authentication for group creation.

**Architecture:** A Vercel server function validates the code/email pair with Firebase Admin, enforces rate limits, repairs the member-to-user mapping, and returns a Firebase custom token scoped by claims to one group. The client signs in with that token, and Firestore rules enforce the group scope and remove owner privileges from this kind of session.

**Tech Stack:** React 19, TypeScript, Vite, Firebase Web/Admin SDKs, Firestore Security Rules, Vitest, Firebase Emulator, Vercel Functions.

**Spec:** `docs/superpowers/specs/2026-09-20-direct-group-auth-design.md`

## Global constraints

- Preserve the existing email-link flow for creating groups.
- Never expose Admin SDK credentials to `VITE_*` variables or client bundles.
- Return generic authentication failures so the API does not reveal whether a code or email exists.
- A `groupSession` may access only its claimed group and never receive owner-only permissions.
- Do not configure secrets or deploy remote infrastructure as part of this plan.
- Preserve unrelated working-tree changes, including `src/data/version.json`.

---

## Task 1: Add the tested server-side join service

**Files:**

- Create: `api/_join-service.ts`
- Create: `api/_join-service.test.ts`
- Create: `api/_join-handler.ts`
- Create: `api/_join-handler.test.ts`
- Create: `api/_firebase-join-dependencies.ts`
- Create: `api/join-group.ts`
- Create: `tsconfig.api.json`
- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Write service tests for input normalization, invalid input, both rate-limit scopes, unknown/duplicate membership, pending membership, linked membership, token claims, and internal failures.
- [x] Run the service tests and confirm they fail because the implementation does not exist.
- [x] Implement a dependency-injected service with typed public errors and a pure fixed-window rate-limit helper.
- [x] Write handler tests for non-POST requests, invalid JSON, successful no-store responses, generic errors, and status mapping.
- [x] Run the handler tests and confirm they fail for the expected missing behavior.
- [x] Implement the Web `Request`/`Response` handler and the `/api/join-group` entry point.
- [x] Implement Firebase Admin dependencies: environment validation, hashed rate-limit documents, exact access-code lookup, unique email lookup, transactional UID/membership repair, and custom-token creation.
- [x] Add API TypeScript and ESLint coverage and ensure `firebase-admin` is a production dependency.
- [x] Run the focused server tests and API typecheck.

## Task 2: Authenticate directly from the join screen

**Files:**

- Modify: `src/lib/auth.ts`
- Create or modify: `src/lib/auth.test.ts`
- Modify: `src/components/AuthGate.tsx`
- Modify: `src/components/AuthGate.test.tsx`

- [x] Write client tests proving that the API result is validated, `signInWithCustomToken` is called, and HTTP failures map to safe UI error categories.
- [x] Run the client tests and confirm the new expectations fail.
- [x] Implement `joinGroupWithCredentials(code, email)` in the auth module.
- [x] Update `AuthGate` tests so joining uses the direct helper, never sends a magic link, changes the URL to `/group/{groupId}`, and never displays the email-sent state.
- [x] Run the component tests and confirm the direct-join expectations fail before the UI change.
- [x] Update the join form button, loading state, success transition, and generic error messages while leaving the create flow unchanged.
- [x] Run the focused auth and `AuthGate` tests.

## Task 3: Enforce group-scoped sessions in Firestore rules

**Files:**

- Modify: `firestore.rules`
- Modify: `tests/firestore.rules.test.ts`

- [x] Add emulator tests proving same-group member access succeeds and cross-group access fails even when that UID has another membership.
- [x] Add tests proving a group session cannot read access codes, create a group, or exercise owner-only updates.
- [x] Run the rules tests and confirm the new security cases fail under the current rules.
- [x] Add `isGroupSession`, `sessionAllows`, and claim-aware membership helpers.
- [x] Require normal sessions for group creation, access-code operations, ownership, and self-provisioning membership claims.
- [x] Run all Firestore rules tests.

## Task 4: Document local and Vercel configuration

**Files:**

- Create: `.env.example`
- Modify: `README.md`
- Modify: `vercel.json`

- [x] Add only the three server-side environment variable names to `.env.example`.
- [x] Document the direct join flow, server credentials, local limitations, and Vercel setup without including credential values.
- [x] Update the SPA rewrite so `/api/*` reaches server functions and all other application routes fall back to `index.html`.
- [x] Inspect the final configuration for accidental `VITE_*` secrets.

## Task 5: Full verification and handoff

- [x] Run `npm test`.
- [x] Run `npm run test:rules`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Inspect `git status --short` and the complete diff, separating the pre-existing version change from this implementation.
- [x] Report exactly what passed, any non-blocking warnings, and the environment variables the user must configure before deployment.
