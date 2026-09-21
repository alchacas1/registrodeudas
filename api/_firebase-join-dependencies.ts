import { createHash } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  advanceRateLimit,
  buildMemberUid,
  joinGroup,
  type JoinContext,
  type JoinCredentials,
  type JoinDependencies,
  type MembershipMatch,
  type RateLimitState,
} from "./_join-service";

let adminApp: App | undefined;

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function firebaseAdminApp() {
  if (adminApp) return adminApp;
  const existing = getApps().find((app) => app.name === "join-auth");
  if (existing) {
    adminApp = existing;
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert({
      projectId: requireEnvironment("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnvironment("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnvironment("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  }, "join-auth");
  return adminApp;
}

function parseRateLimit(data: FirebaseFirestore.DocumentData | undefined): RateLimitState | null {
  if (!data || !Number.isInteger(data.count) || typeof data.windowStartedAt !== "number") {
    return null;
  }
  return { count: data.count as number, windowStartedAt: data.windowStartedAt };
}

function createDependencies(firestore: Firestore): JoinDependencies {
  return {
    async consumeRateLimit(scope, value, limit, windowMs) {
      const key = createHash("sha256").update(`${scope}:${value}`).digest("hex");
      const reference = firestore.collection("joinRateLimits").doc(key);
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const { allowed, next } = advanceRateLimit(
          parseRateLimit(snapshot.data()),
          Date.now(),
          limit,
          windowMs,
        );
        transaction.set(reference, {
          count: next.count,
          windowStartedAt: next.windowStartedAt,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return allowed;
      });
    },

    async findMembership(code, email) {
      const codeSnapshot = await firestore.collection("accessCodes").doc(code).get();
      if (!codeSnapshot.exists) return null;
      const groupId = codeSnapshot.get("groupId");
      if (typeof groupId !== "string" || !groupId) return null;

      const members = await firestore.collection("groups").doc(groupId)
        .collection("members").where("email", "==", email).limit(2).get();
      if (members.size !== 1) return null;
      const member = members.docs[0];
      const userId = member.get("userId");
      return {
        groupId,
        memberId: member.id,
        userId: typeof userId === "string" && userId ? userId : null,
      };
    },

    async establishMembership(match: MembershipMatch, email: string) {
      const group = firestore.collection("groups").doc(match.groupId);
      const member = group.collection("members").doc(match.memberId);
      return firestore.runTransaction(async (transaction) => {
        const freshMember = await transaction.get(member);
        if (!freshMember.exists || freshMember.get("email") !== email) {
          throw new Error("Membership changed during authentication");
        }
        const storedUserId = freshMember.get("userId");
        const uid = typeof storedUserId === "string" && storedUserId
          ? storedUserId
          : buildMemberUid(match.groupId, match.memberId);
        if (!storedUserId) transaction.update(member, { userId: uid });
        transaction.set(group.collection("userMemberships").doc(uid), {
          memberId: match.memberId,
          email,
        }, { merge: true });
        return uid;
      });
    },

    async createToken(uid, claims) {
      return getAuth(firebaseAdminApp()).createCustomToken(uid, claims);
    },
  };
}

export async function joinGroupWithFirebase(
  credentials: JoinCredentials,
  context: JoinContext,
) {
  const app = firebaseAdminApp();
  return joinGroup(credentials, context, createDependencies(getFirestore(app)));
}
