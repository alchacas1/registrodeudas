# Google sign-in and My groups implementation plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google authentication and list all groups claimed by the signed-in account without weakening restricted-session isolation.

**Architecture:** Firebase popup authentication feeds the existing auth observer. Firestore collection-group membership lookup uses verified email plus UID, then fetches each parent group. Security rules authorize exactly that query shape for normal sessions.

**Tech Stack:** React 19, TypeScript, Firebase Auth, Cloud Firestore, Vitest, Firestore Rules emulator.

**Spec:** `docs/superpowers/specs/2026-10-23-google-signin-my-groups-design.md`

---

### Task 1: Google authentication

**Files:** `src/lib/auth.ts`, `src/lib/auth-helpers.ts`, `src/lib/auth.test.ts`, `src/components/AuthGate.tsx`, `src/components/AuthGate.test.tsx`

1. Add failing tests for popup sign-in and UI error handling.
2. Add `GoogleAuthProvider` and `signInWithPopup` integration.
3. Add the Google action to the unauthenticated landing screen.
4. Run focused tests.

### Task 2: My groups

**Files:** `src/types.ts`, `src/lib/db.ts`, `src/lib/db.groups.test.ts`, `src/pages/Home.tsx`, `src/pages/Home.test.tsx`

1. Add failing data-access and Home rendering/navigation tests.
2. Add `GroupListItem` and `listMyGroups`.
3. Render loading, empty, error, and group-card states.
4. Run focused tests.

### Task 3: Security and verification

**Files:** `firestore.rules`, `tests/firestore.rules.test.ts`, `.superpowers/firestore-google-groups-analysis.md`

1. Document current query paths and authorization model.
2. Add failing rules tests for own membership, foreign membership, and restricted sessions.
3. Extend the recursive membership rule with verified UID/email ownership.
4. Run rules emulator, dry-run rules deployment, full tests, lint, build, and diff check.
5. Request fresh code review and address important findings.
