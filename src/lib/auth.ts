import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, signInWithCustomToken, signInWithEmailLink, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { EMAIL_STORAGE_KEY, getEmailForLink, normalizeEmail } from "./auth-helpers";
import { claimPendingMemberships } from "./db";

export async function sendMagicLink(email: string, redirectTo: string) { const normalized = normalizeEmail(email); await sendSignInLinkToEmail(auth, normalized, { url: redirectTo, handleCodeInApp: true }); localStorage.setItem(EMAIL_STORAGE_KEY, normalized); }
export function isMagicLink(url = window.location.href) { return isSignInWithEmailLink(auth, url); }
export async function completeEmailLink(url: string, suppliedEmail?: string) { const email = getEmailForLink(localStorage.getItem(EMAIL_STORAGE_KEY), suppliedEmail); if (!email) return null; const result = await signInWithEmailLink(auth, email, url); localStorage.removeItem(EMAIL_STORAGE_KEY); await claimPendingMemberships(result.user); return result.user; }
export type DirectJoinErrorKind = "invalid" | "limited" | "unavailable";
export class DirectJoinError extends Error {
  readonly kind: DirectJoinErrorKind;
  constructor(kind: DirectJoinErrorKind) { super(kind); this.name = "DirectJoinError"; this.kind = kind; }
}
export async function joinGroupWithCredentials(code: string, email: string) {
  try {
    const response = await fetch("/api/join-group", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, email: normalizeEmail(email) }),
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) throw new DirectJoinError("invalid");
      if (response.status === 429) throw new DirectJoinError("limited");
      throw new DirectJoinError("unavailable");
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object") throw new DirectJoinError("unavailable");
    const { token, groupId } = result as Record<string, unknown>;
    if (typeof token !== "string" || !token || typeof groupId !== "string" || !groupId) {
      throw new DirectJoinError("unavailable");
    }
    await signInWithCustomToken(auth, token);
    return { groupId };
  } catch (error) {
    if (error instanceof DirectJoinError) throw error;
    throw new DirectJoinError("unavailable");
  }
}
export async function signOut() { await firebaseSignOut(auth); }
export function useCurrentUser() { const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true); useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); if (next) void claimPendingMemberships(next); }), []); return { user, loading }; }
