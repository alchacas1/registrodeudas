# Google sign-in and My groups design

## Goal

Let a normal user sign in with Google and see every group where their verified Firebase account is already a claimed member. Keep restricted one-group sessions isolated.

## Design

- Add Firebase `GoogleAuthProvider` with popup sign-in to the existing authentication gate.
- Keep email-link and direct restricted group access unchanged.
- Claim pending invitations and migrate prior `group-*` direct-access identities for the verified email, then query the `members` collection group by both `email` and `userId`.
- Resolve each matching member document's parent group and show a compact `Mis grupos` list on Home.
- Extend member reads and claims so a normal verified user can discover their email rows and replace only null or server-shaped synthetic UIDs. Restricted group sessions remain denied.
- Reuse the existing composite collection-group index on `members(email, userId)` and add a single-field collection-group index on `members.email` for account claiming.

## Failure handling

- Popup cancellation/blocking and provider-disabled errors are shown without losing the current screen.
- Missing/deleted group documents are skipped.
- Group listing errors leave create/join actions usable.

## Release boundary

Implementation and local verification only. Enabling Google in Firebase Authentication, reviewing authorized domains, deploying rules, and deploying the app are separate production actions.
