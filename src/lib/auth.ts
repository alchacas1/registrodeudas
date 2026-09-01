import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail, signInWithEmailLink, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { EMAIL_STORAGE_KEY, getEmailForLink, normalizeEmail } from "./auth-helpers";
import { claimPendingMemberships } from "./db";

export async function sendMagicLink(email: string, redirectTo: string) { const normalized = normalizeEmail(email); await sendSignInLinkToEmail(auth, normalized, { url: redirectTo, handleCodeInApp: true }); localStorage.setItem(EMAIL_STORAGE_KEY, normalized); }
export function isMagicLink(url = window.location.href) { return isSignInWithEmailLink(auth, url); }
export async function completeEmailLink(url: string, suppliedEmail?: string) { const email = getEmailForLink(localStorage.getItem(EMAIL_STORAGE_KEY), suppliedEmail); if (!email) return null; const result = await signInWithEmailLink(auth, email, url); localStorage.removeItem(EMAIL_STORAGE_KEY); await claimPendingMemberships(result.user); return result.user; }
export async function signOut() { await firebaseSignOut(auth); }
export function useCurrentUser() { const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true); useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); if (next) void claimPendingMemberships(next); }), []); return { user, loading }; }
