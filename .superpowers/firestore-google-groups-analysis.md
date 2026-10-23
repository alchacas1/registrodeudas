# Firestore analysis: Google sign-in and My groups

## Paths and queries

- `groups/{groupId}`: group metadata. Read requires membership document.
- `groups/{groupId}/members/{memberId}`: name, normalized email, `userId`, joined time.
- `groups/{groupId}/userMemberships/{uid}`: direct authorization pointer for group access.
- `groups/{groupId}/debts/{debtId}`: debts; unchanged.
- `accessCodes/{code}`: direct group lookup; unchanged.
- Account claim query: collection group `members`, `email == verified token email`; client migration accepts only `userId == null` or the server-generated `group-[0-9a-f]{32}` identity.
- New group list query: collection group `members`, `email == verified account email`, `userId == account uid`.
- Indexes: composite collection-group `members(email ASC, userId ASC)` for final listing; single-field collection-group `members.email ASC` for account claiming. Collection-scope email indexes remain enabled for the direct-access API.

## Authentication patterns

- Normal Firebase users may use email link or Google.
- Restricted custom-token sessions carry `groupSession == true` and `groupId`; they must never enumerate memberships across groups.
- Membership discovery requires a verified normalized email. Migration to the permanent UID is allowed only from null or the exact server-generated synthetic UID shape.

## Devil's advocate cases

- Unauthenticated collection-group query: deny.
- Different UID with same email: deny claimed membership rows.
- Same UID with different/unverified email: deny.
- Verified email attempting to replace a normal non-synthetic UID: deny.
- Restricted group session with matching UID: deny cross-group listing.
- Broad collection-group query without the verified email equality filter: deny.
- Pending invitation for another verified email: deny.

## Scope ruling

Only the new recursive read path changes. Existing production create/update/delete contracts stay untouched; broad schema hardening is a separate audit because it could break established writes.
