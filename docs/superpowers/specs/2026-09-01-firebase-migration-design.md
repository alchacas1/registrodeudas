# Firebase Migration Design

## Objective

Replace Supabase completely with Firebase in the RegistroDeudas web app. Start with an empty Firebase project because the former Supabase data and users were intentionally deleted. Require authentication for every application operation, including creating groups, joining groups, adding members, recording debts, and confirming payments.

## Scope

The migration covers:

- Firebase Authentication with passwordless email links.
- Cloud Firestore for groups, members, debts, access-code reservations, and the current application version.
- Firestore Security Rules and emulator-backed rules tests.
- Firebase client configuration through Vite environment variables.
- Replacement of the Supabase-based version update script.
- Removal of Supabase code, dependencies, credentials, and environment variables.
- Authentication UI and authenticated routing behavior.

Firebase Analytics is outside the operational scope. The supplied measurement ID remains available in configuration, but Analytics will not be initialized because it is unrelated to authentication or persistence and complicates tests and non-browser execution.

## Authentication

The app uses Firebase Authentication email-link sign-in. An unauthenticated visitor sees an email form instead of the application. Sending a link stores the normalized email locally so sign-in can finish on the same device. If the link is opened on another device, the app asks for the email again before completing authentication. Production links use the current deployed origin, and the Firebase console must list that origin as an authorized domain.

Every database read and write requires a Firebase Authentication session. The signed-in user's verified email and Firebase UID establish group membership.

When a user creates a group, the app asks for the creator's display name and creates a member document containing the authenticated UID and email. The creator is also recorded as the group's owner.

An invitation creates a pending member document with a normalized email and `userId: null`, then sends a Firebase email sign-in link. When that person authenticates, the app links only pending membership documents whose stored email equals the verified email claim in the Firebase token. Linking is idempotent.

Signing out returns the user to the authentication screen.

## Firestore Data Model

```text
groups/{groupId}
  name: string
  type: "familia" | "amigos" | "conocidos" | "otros"
  description: string | null
  accessCode: string
  ownerId: string
  memberUserIds: string[]
  createdAt: Timestamp

groups/{groupId}/members/{memberId}
  name: string
  email: string
  userId: string | null
  joinedAt: Timestamp

groups/{groupId}/debts/{debtId}
  debtorId: string
  lenderId: string
  amount: number
  currency: string
  reason: string
  date: string
  status: "pendiente" | "pagada" | "parcial"
  paidAmount: number
  createdAt: Timestamp

accessCodes/{fiveCharacterCode}
  groupId: string
  createdBy: string
  createdAt: Timestamp

appMetadata/current
  version: string
  updatedAt: Timestamp
```

`memberUserIds` is a denormalized authorization field. It lets Firestore Security Rules determine group membership without relying on collection queries. It is updated atomically when a pending member is linked.

Access codes use characters that avoid visually ambiguous values. Group creation reserves the code and creates the group and creator member in one transaction. A collision causes generation of another code. Joining looks up `accessCodes/{code}` and succeeds only when the authenticated user's email matches a pending member in the referenced group. The membership-link transaction then adds the UID to `memberUserIds`.

## Authorization Rules

Firestore denies access by default.

- Authenticated users may create a group only when `ownerId` is their UID and `memberUserIds` initially contains only their UID.
- Only UIDs listed in `memberUserIds` may read a group, its members, or its debts.
- Group members may create pending member records and debts.
- Member records with an assigned `userId` cannot be reassigned by clients.
- A signed-in user may claim a pending member only when the token contains a verified email matching the normalized member email. The same atomic operation adds the UID to the parent group's `memberUserIds`.
- Only the group's owner may change group metadata or remove members. Member removal is not currently exposed in the UI.
- A debt can be marked paid only when the caller's linked member document is the debt's debtor or lender. Immutable debt identity and amount fields cannot change during payment confirmation.
- Access-code documents can only be created as part of valid group creation and cannot be listed. Authenticated clients may fetch an exact code document.
- Application metadata is readable by authenticated users and writable only through the Admin SDK used by the local version-update script.

Rules tests cover denied unauthenticated access, cross-group isolation, valid group-member operations, pending membership claims, invalid email claims, and debtor/lender payment authorization.

## Application Modules

- `src/lib/firebase.ts` initializes Firebase App, Authentication, and Firestore from `VITE_FIREBASE_*` variables.
- `src/lib/auth.ts` owns email-link sending/completion, session observation, sign-out, and pending-membership linking.
- `src/lib/db.ts` owns Firestore mapping and operations while preserving the existing UI-facing `Group`, `Member`, and `Debt` types as far as practical.
- `src/pages/Home.tsx` requires an authenticated user and includes the creator name when creating a group.
- `src/pages/GroupPage.tsx` operates only for authenticated group members and displays access-denied separately from not-found and network errors.
- `scripts/update-version.js` uses `firebase-admin` and a gitignored service-account JSON file to update `appMetadata/current`.

The existing calculation utilities and visual components remain unchanged unless type adjustments require a narrow update.

## Error Handling

Firebase operations return actionable errors to the UI without exposing credentials or internal rule details. Email-link sending reports success only after Firebase confirms the request. Group creation retries access-code collisions a bounded number of times. Multi-document operations that must remain consistent use Firestore transactions or batched writes.

If invitation email delivery fails after a pending member was created, the app reports the failure and leaves the pending member in place so the invitation can be retried. No UI claims that an email was sent when Firebase returned an error.

## Configuration

The `.env` file contains only public Firebase web configuration under these names:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

Firebase web configuration is not a server secret. Firestore Security Rules provide data protection. A separate `firebaseServiceAccount.json`, excluded by `.gitignore`, is required only for the local Admin SDK version-update script and must never enter frontend code or source control.

## Testing and Verification

- Unit tests cover configuration validation, row/document mapping helpers, access-code normalization, and authentication-link decisions.
- Firestore emulator tests validate the complete authorization matrix.
- Existing utility tests remain green.
- Verification runs the unit suite, Firestore rules suite, TypeScript/Vite production build, and ESLint.
- A manual smoke-test checklist covers sending and completing an email link, creating a group, inviting and joining a second member, creating a debt, rejecting an unrelated user's access, confirming a payment, and signing out.

## Firebase Console Prerequisites

The Firebase project `controldeudas-d106f` must have:

- Cloud Firestore created in production mode.
- Email/Password and Email link sign-in enabled.
- The Vercel production domain and any intended development domain added to Authentication authorized domains.
- Firestore rules and indexes deployed after local emulator verification.

The application remains hosted by Vercel; Firebase Hosting is not required.
