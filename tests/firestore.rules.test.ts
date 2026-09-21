import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collectionGroup, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "registrodeudas-rules-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterAll(async () => env.cleanup());

async function createGroupAsOwner() {
  const db = env.authenticatedContext("owner", { email: "owner@example.com", email_verified: true }).firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "groups/group-1"), { name: "Viaje", type: "amigos", description: null, accessCode: "ABCDE", ownerId: "owner", createdAt: serverTimestamp() });
  batch.set(doc(db, "groups/group-1/members/member-owner"), { name: "Owner", email: "owner@example.com", userId: "owner", joinedAt: serverTimestamp() });
  batch.set(doc(db, "groups/group-1/userMemberships/owner"), { memberId: "member-owner", email: "owner@example.com" });
  batch.set(doc(db, "accessCodes/ABCDE"), { groupId: "group-1", createdBy: "owner", createdAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
}

async function seedGroupSessionData() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "groups/group-1"), { ownerId: "owner", name: "Grupo uno" });
    await setDoc(doc(db, "groups/group-1/members/member-1"), {
      name: "Invitada",
      email: "guest@example.com",
      userId: "group-user",
    });
    await setDoc(doc(db, "groups/group-1/userMemberships/group-user"), {
      memberId: "member-1",
      email: "guest@example.com",
    });
    await setDoc(doc(db, "groups/group-2"), { ownerId: "other-owner", name: "Grupo dos" });
    await setDoc(doc(db, "groups/group-2/userMemberships/group-user"), {
      memberId: "member-2",
      email: "guest@example.com",
    });
    await setDoc(doc(db, "accessCodes/ABCDE"), { groupId: "group-1" });
  });
}

function groupSession(groupId = "group-1", uid = "group-user") {
  return env.authenticatedContext(uid, {
    groupSession: true,
    groupId,
    memberId: "member-1",
  }).firestore();
}

describe("Firestore rules", () => {
  it("denies unauthenticated group reads", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "groups/group-1")));
  });
  it("allows an owner to atomically create and read a group", async () => {
    await createGroupAsOwner();
    await assertSucceeds(getDoc(doc(env.authenticatedContext("owner").firestore(), "groups/group-1")));
  });
  it("isolates a group from another authenticated user", async () => {
    await env.clearFirestore(); await createGroupAsOwner();
    await assertFails(getDoc(doc(env.authenticatedContext("stranger").firestore(), "groups/group-1")));
  });
  it("allows only the verified invited email to claim membership", async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "groups/group-1"), { ownerId: "owner" });
      await setDoc(doc(db, "groups/group-1/members/invite-1"), { name: "Invitada", email: "guest@example.com", userId: null });
    });
    const guest = env.authenticatedContext("guest", { email: "guest@example.com", email_verified: true }).firestore();
    await assertSucceeds(getDocs(query(collectionGroup(guest, "members"), where("email", "==", "guest@example.com"), where("userId", "==", null))));
    const batch = writeBatch(guest);
    batch.update(doc(guest, "groups/group-1/members/invite-1"), { userId: "guest" });
    batch.set(doc(guest, "groups/group-1/userMemberships/guest"), { memberId: "invite-1", email: "guest@example.com" });
    await assertSucceeds(batch.commit());

    const impostor = env.authenticatedContext("impostor", { email: "other@example.com", email_verified: true }).firestore();
    const invalid = writeBatch(impostor);
    invalid.set(doc(impostor, "groups/group-1/userMemberships/impostor"), { memberId: "invite-1", email: "other@example.com" });
    await assertFails(invalid.commit());
  });
  it("allows a debt participant and rejects another member when confirming payment", async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "groups/group-1"), { ownerId: "owner" });
      await setDoc(doc(db, "groups/group-1/members/debtor"), { userId: "debtor-user" });
      await setDoc(doc(db, "groups/group-1/members/lender"), { userId: "lender-user" });
      await setDoc(doc(db, "groups/group-1/userMemberships/debtor-user"), { memberId: "debtor" });
      await setDoc(doc(db, "groups/group-1/userMemberships/other-user"), { memberId: "other" });
      await setDoc(doc(db, "groups/group-1/debts/debt-1"), { debtorId: "debtor", lenderId: "lender", amount: 10, status: "pendiente", paidAmount: 0 });
    });
    const debtor = env.authenticatedContext("debtor-user").firestore();
    await assertSucceeds(updateDoc(doc(debtor, "groups/group-1/debts/debt-1"), { status: "pagada", paidAmount: 10 }));
    const other = env.authenticatedContext("other-user").firestore();
    await assertFails(updateDoc(doc(other, "groups/group-1/debts/debt-1"), { status: "pagada", paidAmount: 10 }));
  });
  it("allows a group session to read its claimed group", async () => {
    await env.clearFirestore(); await seedGroupSessionData();
    await assertSucceeds(getDoc(doc(groupSession(), "groups/group-1")));
  });
  it("denies a group session access to another group even when its UID has membership", async () => {
    await env.clearFirestore(); await seedGroupSessionData();
    await assertFails(getDoc(doc(groupSession(), "groups/group-2")));
  });
  it("denies group sessions direct access to group codes", async () => {
    await env.clearFirestore(); await seedGroupSessionData();
    await assertFails(getDoc(doc(groupSession(), "accessCodes/ABCDE")));
  });
  it("denies group sessions from creating groups", async () => {
    await env.clearFirestore();
    const db = groupSession("group-1", "owner");
    await assertFails(setDoc(doc(db, "groups/new-group"), { ownerId: "owner", name: "Nuevo" }));
  });
  it("does not grant owner privileges to a group session with the owner's UID", async () => {
    await env.clearFirestore(); await seedGroupSessionData();
    const db = groupSession("group-1", "owner");
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "groups/group-1/userMemberships/owner"), {
        memberId: "member-owner",
      });
    });
    await assertFails(updateDoc(doc(db, "groups/group-1"), { name: "Nombre alterado" }));
  });
});
