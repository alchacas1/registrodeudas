# SDD ledger — plan: docs/superpowers/plans/2026-10-23-google-signin-my-groups.md

## Rulings

- Work in the active `main` checkout because the user explicitly requested implementation here. No commits and no deployment. Cost if wrong: changes remain local and uncommitted.
- Preserve existing email-link and restricted `groupSession` flows. Cost if wrong: authentication compatibility or group isolation could regress.
- Reuse the existing `members(email, userId)` collection-group index. Cost if wrong: production query requires a different index.

## Preflight interfaces

- `useCurrentUser()` remains `{ user, loading, groupSession }`.
- New `signInWithGoogle(): Promise<User>` is called only from `AuthGate`.
- New `listMyGroups(user): Promise<GroupListItem[]>` claims verified pending invitations, then returns readable parent-group summaries.
- Firestore recursive member reads allow only verified normal sessions reading their own claimed member rows or their own pending invitations.

## Progress

- [x] Design and implementation plan recorded.
- [x] Task 1: Google authentication. Focused tests: 17/17.
- [x] Task 2: My groups. Focused tests: 10/10.
- [x] Task 3: Rules and full verification. Emulator rules tests: 15/15; app tests: 105/105; lint, build, rules/index dry-runs, diff check passed.

## Review follow-up

- Fresh review found prior direct-access memberships used synthetic `group-*` UIDs and Google could finish before claims. Added verified migration limited to the exact synthetic UID shape and made Google await claims. Focused tests: 12/12; rules tests: 15/15.
- Follow-up review found the email-only collection-group query needed its own single-field index. Added `members.email` with collection-group ascending scope while preserving collection-scope ascending/descending indexes.
- Final independent re-review: no remaining Critical or Important findings.
