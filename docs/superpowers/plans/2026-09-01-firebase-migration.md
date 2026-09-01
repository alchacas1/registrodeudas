# Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with Firebase Authentication and Cloud Firestore, starting with empty data and requiring authentication for every application operation.

**Architecture:** A focused Firebase client module provides Auth and Firestore instances. Authentication and persistence remain behind `src/lib/auth.ts` and `src/lib/db.ts`, while Firestore rules enforce group membership and debt-payment authorization. Vercel continues hosting the Vite application, and a Firebase Admin script owns privileged version updates.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Firebase Web SDK, Firebase Admin SDK, Vitest, Firebase Emulator Suite, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-01-firebase-migration-design.md`

## Global Constraints

- Start Firebase with no Supabase data or user migration.
- Require Firebase Authentication for every application operation.
- Use passwordless email-link authentication.
- Keep Vercel as the application host.
- Do not initialize Firebase Analytics in application startup.
- Never expose `firebaseServiceAccount.json` to frontend code or source control.
- Protect all Firestore data with deny-by-default rules.

---

## File Structure

- Create `src/lib/firebase.ts`: validate Vite variables and initialize Firebase App, Auth, and Firestore.
- Create `src/lib/firebase-config.test.ts`: configuration validation tests.
- Rewrite `src/lib/auth.ts`: email-link authentication, session observation, sign-out, and membership claims.
- Create `src/lib/auth-helpers.ts` and `src/lib/auth-helpers.test.ts`: pure email normalization and email-link continuation decisions.
- Rewrite `src/lib/db.ts`: Firestore transactions, mappings, group/member/debt operations.
- Create `src/lib/db-helpers.ts` and `src/lib/db-helpers.test.ts`: pure mapping and access-code helpers.
- Modify `src/pages/Home.tsx`: authenticated landing state and creator-member input.
- Modify `src/pages/GroupPage.tsx`: authenticated membership behavior and Firebase errors.
- Modify `src/App.tsx`: global authentication gate and email-link completion UI.
- Create `firestore.rules`: authorization policy.
- Create `firestore.indexes.json` and `firebase.json`: deploy and emulator configuration.
- Create `tests/firestore.rules.test.ts`: emulator authorization tests.
- Rewrite `scripts/update-version.js`: Admin SDK metadata update.
- Modify `.env`, `.gitignore`, `package.json`, and `package-lock.json`: Firebase configuration and dependencies.
- Delete `src/lib/supabase.ts`; remove `supabaseServiceKey.json` locally after Firebase functionality is verified.
- Update `README.md`: current architecture and Firebase setup.

### Task 1: Firebase dependencies and client configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env`
- Modify: `.gitignore`
- Create: `src/lib/firebase.ts`
- Create: `src/lib/firebase-config.ts`
- Test: `src/lib/firebase-config.test.ts`

**Interfaces:**
- Produces: `readFirebaseConfig(env: Record<string, unknown>): FirebaseOptions`
- Produces: `firebaseApp`, `auth`, and `firestore`

- [ ] **Step 1: Install dependencies and expose the existing test runner**

Run:

```powershell
npm install firebase firebase-admin
npm install --save-dev @firebase/rules-unit-testing firebase-tools
```

Add `"test": "vitest run"` and `"test:rules": "firebase emulators:exec --only firestore \"vitest run tests/firestore.rules.test.ts\""` to `package.json`.

- [ ] **Step 2: Write configuration tests**

Test that `readFirebaseConfig()` maps all seven `VITE_FIREBASE_*` names and throws a message listing missing required values. The production change that makes these tests pass is creation of `src/lib/firebase-config.ts`.

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- src/lib/firebase-config.test.ts`

Expected: FAIL because `./firebase-config` does not exist.

- [ ] **Step 4: Implement configuration and initialization**

Create a pure reader returning `FirebaseOptions`, then initialize:

```ts
const firebaseApp = initializeApp(readFirebaseConfig(import.meta.env));
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
```

Write the supplied Firebase values to `.env`. Do not initialize Analytics.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm test -- src/lib/firebase-config.test.ts`

Expected: all configuration tests pass.

Commit: `feat: configure Firebase client`

### Task 2: Pure authentication and Firestore mapping helpers

**Files:**
- Create: `src/lib/auth-helpers.ts`
- Create: `src/lib/auth-helpers.test.ts`
- Create: `src/lib/db-helpers.ts`
- Create: `src/lib/db-helpers.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `normalizeEmail(email: string): string`
- Produces: `getEmailForLink(storedEmail: string | null, suppliedEmail?: string): string | null`
- Produces: `generateAccessCode(length?: number): string`
- Produces: Firestore timestamp-to-domain mappers used by `db.ts`

- [ ] **Step 1: Write failing helper tests**

Cover trimming/lowercasing email, missing cross-device email, five-character unambiguous access codes, Timestamp-to-ISO conversion, nullable descriptions, and numeric debt fields. Name each test after one behavior.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/auth-helpers.test.ts src/lib/db-helpers.test.ts`

Expected: FAIL because the helper modules do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Keep Firebase network calls out of these files. Extend the `Group` type with `ownerId` while preserving existing page-facing property names.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/lib/auth-helpers.test.ts src/lib/db-helpers.test.ts`

Expected: all helper tests pass.

Commit: `feat: add Firebase domain helpers`

### Task 3: Firestore persistence adapter

**Files:**
- Rewrite: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `auth`, `firestore`, mapping helpers, and domain types
- Produces: `createGroup(name, type, creatorName, description?)`
- Produces: `findGroupByCode(code)`, `getFullGroup(id)`, `addMember(...)`, `addDebt(...)`, `markDebtPaid(...)`, and `claimPendingMemberships(user)`

- [ ] **Step 1: Write failing adapter behavior tests**

Inject a narrow Firestore operations interface so tests can verify domain outcomes without mocking the whole Firebase SDK. Cover rejected unauthenticated calls, access-code collision retry, complete group mapping, invitation error propagation, membership claim, debt creation, and payment confirmation.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/db.test.ts`

Expected: FAIL because the Firestore adapter contract is not implemented.

- [ ] **Step 3: Implement Firestore operations**

Use transactions for group/code/creator creation and membership claims. Use subcollection reads for members and debts. Throw typed, user-safe errors for unauthenticated, permission-denied, and not-found outcomes. Check the result of email sending rather than reporting success unconditionally.

- [ ] **Step 4: Verify GREEN and existing utilities**

Run: `npm test -- src/lib/db.test.ts src/lib/utils.test.ts`

Expected: adapter and utility tests pass.

- [ ] **Step 5: Commit**

Commit: `feat: migrate persistence to Firestore`

### Task 4: Firebase email-link authentication

**Files:**
- Rewrite: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: Firebase `auth`, helper functions, and `claimPendingMemberships`
- Produces: `sendMagicLink(email, redirectTo)`, `completeEmailLink(url, suppliedEmail?)`, `signOut()`, and `useCurrentUser()`

- [ ] **Step 1: Write failing authentication tests**

Cover normalized email storage, `ActionCodeSettings.handleCodeInApp: true`, same-device completion, cross-device email requirement, local email cleanup after success, membership claim after authentication, and sign-out.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/auth.test.ts`

Expected: FAIL against the old Supabase implementation.

- [ ] **Step 3: Implement Firebase Auth flow**

Use `sendSignInLinkToEmail`, `isSignInWithEmailLink`, `signInWithEmailLink`, `onAuthStateChanged`, and Firebase `signOut`. Do not treat an email as sent until the Firebase promise resolves.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/lib/auth.test.ts`

Expected: authentication tests pass.

Commit: `feat: migrate authentication to Firebase`

### Task 5: Authenticated React flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/GroupPage.tsx`
- Create: `src/components/AuthGate.tsx`
- Test: `src/components/AuthGate.test.tsx`

**Interfaces:**
- Consumes: `useCurrentUser`, `sendMagicLink`, `completeEmailLink`, and Firestore database functions
- Produces: authenticated routing and email-link UI

- [ ] **Step 1: Add React testing dependencies and write failing AuthGate tests**

Install `@testing-library/react`, `@testing-library/user-event`, and `jsdom`. Test loading state, email submission, sent confirmation, cross-device email completion, authenticated children, and sign-out-visible state.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/components/AuthGate.test.tsx`

Expected: FAIL because `AuthGate` does not exist.

- [ ] **Step 3: Implement authenticated UI changes**

Wrap routes with `AuthGate`. Add creator name to group creation. Remove all unauthenticated operation paths. Translate permission-denied and missing-membership errors into clear Spanish messages. Preserve the existing visual system.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/components/AuthGate.test.tsx`

Expected: AuthGate tests pass.

Commit: `feat: require authentication in application UI`

### Task 6: Firestore Security Rules

**Files:**
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `firebase.json`
- Create: `tests/firestore.rules.test.ts`

**Interfaces:**
- Consumes: the exact Firestore document model in the spec
- Produces: deny-by-default database authorization

- [ ] **Step 1: Write failing emulator tests**

Use `@firebase/rules-unit-testing` to assert denial of unauthenticated access and cross-group access; valid owner group creation; exact access-code lookup; verified-email pending claim; rejection of mismatched email; member debt creation; and debtor/lender-only payment confirmation.

- [ ] **Step 2: Verify RED against deny-all rules**

Run: `npm run test:rules`

Expected: authorization-success cases fail while denial cases pass.

- [ ] **Step 3: Implement minimum rules and indexes**

Use helper functions for signed-in state, parent-group membership, owner identity, verified email matching, and immutable fields. Permit exact access-code reads but reject list queries.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:rules`

Expected: every authorization test passes.

Commit: `feat: enforce Firestore authorization rules`

### Task 7: Firebase Admin version updater and Supabase removal

**Files:**
- Rewrite: `scripts/update-version.js`
- Modify: `scripts/version-utils.test.js`
- Modify: `.gitignore`
- Delete: `src/lib/supabase.ts`
- Remove locally after verification: `supabaseServiceKey.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `firebaseServiceAccount.json`, `src/data/version.json`, and `compareVersions`
- Produces: `appMetadata/current` update through Firebase Admin

- [ ] **Step 1: Write failing script tests**

Extract testable credential validation and update-decision functions. Test missing credentials, invalid credentials, create, update, equal-version no-op, and older-local-version warning.

- [ ] **Step 2: Verify RED**

Run: `npm test -- scripts/version-utils.test.js scripts/update-version.test.js`

Expected: FAIL because the Firebase updater helpers do not exist.

- [ ] **Step 3: Implement Admin SDK updater and remove Supabase**

Initialize `firebase-admin/app` with `cert(serviceAccount)` and update `appMetadata/current` through `firebase-admin/firestore`. Remove `@supabase/supabase-js`, Supabase environment variables, imports, client file, and credential references. Add `firebaseServiceAccount.json` to `.gitignore`.

- [ ] **Step 4: Update documentation**

Replace the stale Express/Supabase README sections with Firebase console prerequisites, environment variables, emulator commands, build commands, and Vercel deployment notes.

- [ ] **Step 5: Verify tests and commit**

Run: `npm test -- scripts/version-utils.test.js scripts/update-version.test.js`

Expected: updater tests pass.

Commit: `chore: remove Supabase integration`

### Task 8: Full verification and manual handoff

**Files:**
- Modify only if verification exposes a tested defect.

**Interfaces:**
- Consumes: completed Firebase application and configuration
- Produces: verified production build and deployment checklist

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm test
npm run test:rules
npm run lint
npm run build
```

Expected: every command exits with code 0 and no test failures or lint errors.

- [ ] **Step 2: Scan for residual Supabase references and secrets**

Run:

```powershell
rg -n -i "supabase|serviceRoleKey|VITE_SUPABASE" -g '!docs/superpowers/**' -g '!node_modules/**' .
git ls-files | Select-String -Pattern 'firebaseServiceAccount|supabaseServiceKey|^\.env$'
```

Expected: no runtime Supabase references and no tracked credential files.

- [ ] **Step 3: Review the requirements checklist**

Confirm Firebase-only dependencies, email-link auth, authenticated operations, Firestore data model, rules coverage, empty-start behavior, `.env` values, Admin version update, and current README.

- [ ] **Step 4: Provide the console/deployment handoff**

Report commands run and exact results. List manual Firebase Console actions that cannot be performed from the repository: enable email-link sign-in, create Firestore, add authorized domains, and deploy rules/indexes. Do not claim live email delivery without a real console-enabled smoke test.

- [ ] **Step 5: Commit final verified adjustments**

Commit only files changed by evidence-backed fixes using: `fix: complete Firebase migration verification`.
