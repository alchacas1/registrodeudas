import type { User } from "firebase/auth";
import { sendSignInLinkToEmail } from "firebase/auth";
import { addDoc, collection, collectionGroup, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, type DocumentReference } from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { EMAIL_STORAGE_KEY, normalizeEmail } from "./auth-helpers";
import { generateAccessCode, timestampToIso } from "./db-helpers";
import type { Debt, DebtStatus, Group, GroupListItem, GroupType, Member } from "../types";

type Data = Record<string, unknown>;
function requireUser(): User { const user = auth.currentUser; if (!user) throw new Error("Debes iniciar sesión."); return user; }
function mapMember(id: string, row: Data): Member { return { id, name: String(row.name), email: row.email ? String(row.email) : null, userId: row.userId ? String(row.userId) : undefined, avatar: "", joinedAt: timestampToIso(row.joinedAt as never) }; }
function mapDebt(id: string, row: Data): Debt { return { id, debtorId: String(row.debtorId), lenderId: String(row.lenderId), amount: Number(row.amount), currency: String(row.currency), reason: String(row.reason ?? ""), date: String(row.date ?? timestampToIso(row.createdAt as never).slice(0, 10)), status: String(row.status) as DebtStatus, paidAmount: Number(row.paidAmount ?? 0), createdAt: timestampToIso(row.createdAt as never) }; }

export async function createGroup(name: string, type: GroupType, creatorName: string, description?: string): Promise<Group> {
  const user = requireUser(); if (!user.email) throw new Error("Tu cuenta no tiene un correo disponible.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const accessCode = generateAccessCode(), groupRef = doc(collection(firestore, "groups")), codeRef = doc(firestore, "accessCodes", accessCode), memberRef = doc(collection(groupRef, "members")), membershipRef = doc(groupRef, "userMemberships", user.uid);
    try {
      await runTransaction(firestore, async (tx) => {
        if ((await tx.get(codeRef)).exists()) throw new Error("ACCESS_CODE_COLLISION");
        tx.set(groupRef, { name, type, description: description ?? null, accessCode, ownerId: user.uid, createdAt: serverTimestamp() });
        tx.set(memberRef, { name: creatorName, email: normalizeEmail(user.email!), userId: user.uid, joinedAt: serverTimestamp() });
        tx.set(membershipRef, { memberId: memberRef.id, email: normalizeEmail(user.email!) });
        tx.set(codeRef, { groupId: groupRef.id, createdBy: user.uid, createdAt: serverTimestamp() });
      });
      return { id: groupRef.id, ownerId: user.uid, name, type, description, members: [], debts: [], createdAt: new Date().toISOString(), accessCode };
    } catch (error) { if (!(error instanceof Error) || error.message !== "ACCESS_CODE_COLLISION") throw error; }
  }
  throw new Error("No se pudo generar un código de acceso único.");
}
export type JoinGroupResult =
  | { status: "joined"; id: string }
  | { status: "invalid-code" }
  | { status: "not-invited" };

export async function findGroupByCode(code: string): Promise<JoinGroupResult> {
  const user = requireUser();
  const snap = await getDoc(doc(firestore, "accessCodes", code.trim().toUpperCase()));
  if (!snap.exists()) return { status: "invalid-code" };

  const groupId = String(snap.data().groupId);
  await claimPendingMemberships(user);
  const membership = await getDoc(doc(firestore, "groups", groupId, "userMemberships", user.uid));
  if (!membership.exists()) return { status: "not-invited" };
  return { status: "joined", id: groupId };
}
export async function getFullGroup(id: string): Promise<Group | null> {
  requireUser(); const groupRef = doc(firestore, "groups", id);
  const [groupSnap, membersSnap, debtsSnap] = await Promise.all([getDoc(groupRef), getDocs(collection(groupRef, "members")), getDocs(collection(groupRef, "debts"))]);
  if (!groupSnap.exists()) return null; const row = groupSnap.data();
  return { id, ownerId: String(row.ownerId), name: String(row.name), type: String(row.type) as GroupType, description: row.description ? String(row.description) : undefined, accessCode: String(row.accessCode), createdAt: timestampToIso(row.createdAt), members: membersSnap.docs.map((item) => mapMember(item.id, item.data())), debts: debtsSnap.docs.map((item) => mapDebt(item.id, item.data())).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
}
export async function listMyGroups(user: User): Promise<GroupListItem[]> {
  if (!user.email || !user.emailVerified) return [];
  await claimPendingMemberships(user);

  const email = normalizeEmail(user.email);
  const memberships = await getDocs(query(
    collectionGroup(firestore, "members"),
    where("email", "==", email),
    where("userId", "==", user.uid),
  ));
  const groupRefs = new Map<string, DocumentReference>();
  for (const membership of memberships.docs) {
    const groupRef = membership.ref.parent.parent;
    if (groupRef) groupRefs.set(groupRef.id, groupRef);
  }

  const groupSnaps = await Promise.all([...groupRefs.values()].map((groupRef) => getDoc(groupRef)));
  return groupSnaps
    .filter((groupSnap) => groupSnap.exists())
    .map((groupSnap) => {
      const row = groupSnap.data();
      return {
        id: groupSnap.id,
        name: String(row.name),
        type: String(row.type) as GroupType,
        description: row.description ? String(row.description) : undefined,
        createdAt: timestampToIso(row.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function addMember(groupId: string, name: string, email: string, redirectTo: string): Promise<Member> {
  requireUser(); const normalized = normalizeEmail(email);
  const ref = await addDoc(collection(firestore, "groups", groupId, "members"), { name, email: normalized, userId: null, joinedAt: serverTimestamp() });
  await sendSignInLinkToEmail(auth, normalized, { url: redirectTo, handleCodeInApp: true }); localStorage.setItem(EMAIL_STORAGE_KEY, normalized);
  return { id: ref.id, name, email: normalized, avatar: "", joinedAt: new Date().toISOString() };
}
export async function addDebt(groupId: string, debtorId: string, lenderId: string, amount: number, currency: string, reason: string): Promise<Debt> {
  requireUser(); const createdAt = new Date().toISOString(); const stored = { debtorId, lenderId, amount, currency, reason, date: createdAt.slice(0, 10), status: "pendiente" as const, paidAmount: 0, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(firestore, "groups", groupId, "debts"), stored); return { id: ref.id, debtorId, lenderId, amount, currency, reason, date: createdAt.slice(0, 10), status: "pendiente", paidAmount: 0, createdAt };
}
export async function recordDebtPayment(groupId: string, debtId: string, paymentAmount: number): Promise<Debt> {
  requireUser();
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("El monto del pago debe ser mayor que cero.");
  }

  const ref = doc(firestore, "groups", groupId, "debts", debtId);
  return runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("La deuda ya no existe.");

    const debt = mapDebt(snap.id, snap.data());
    const remaining = Math.max(0, debt.amount - debt.paidAmount);
    if (debt.status === "pagada" || remaining === 0) {
      throw new Error("Esta deuda ya está pagada.");
    }

    const tolerance = Number.EPSILON * Math.max(1, Math.abs(debt.amount)) * 10;
    if (paymentAmount > remaining + tolerance) {
      throw new Error("El pago no puede superar el saldo pendiente.");
    }

    const completesDebt = paymentAmount >= remaining - tolerance;
    const paidAmount = completesDebt
      ? debt.amount
      : debt.paidAmount + paymentAmount;
    const status: DebtStatus = completesDebt ? "pagada" : "parcial";
    tx.update(ref, { status, paidAmount });
    return { ...debt, status, paidAmount };
  });
}
export async function claimPendingMemberships(user: User) {
  if (!user.email || !user.emailVerified) return;
  const email = normalizeEmail(user.email);
  const matching = await getDocs(query(
    collectionGroup(firestore, "members"),
    where("email", "==", email),
  ));
  for (const member of matching.docs) {
    const groupRef = member.ref.parent.parent;
    if (!groupRef) continue;
    const membershipRef = doc(groupRef, "userMemberships", user.uid);
    await runTransaction(firestore, async (tx) => {
      const fresh = await tx.get(member.ref);
      const row = fresh.data();
      const currentUserId = row?.userId;
      const syntheticGroupUser = typeof currentUserId === "string"
        && /^group-[0-9a-f]{32}$/.test(currentUserId);
      if (
        normalizeEmail(String(row?.email ?? "")) !== email
        || currentUserId === user.uid
        || (currentUserId != null && !syntheticGroupUser)
      ) return;
      tx.update(member.ref, { userId: user.uid });
      tx.set(membershipRef, { memberId: member.id, email });
    });
  }
}
