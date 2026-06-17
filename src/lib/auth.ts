import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** Envía un magic link de inicio de sesión a un correo. */
export async function sendMagicLink(email: string, redirectTo: string) {
  return supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/**
 * Vincula cualquier fila de `members` cuyo email coincida con el usuario
 * recién autenticado (user_id todavía null). Se apoya en la política RLS
 * "members link own user_id", que solo permite este update cuando
 * auth.email() = members.email.
 */
export async function linkPendingMemberships(user: User) {
  if (!user.email) return;
  await supabase
    .from("members")
    .update({ user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("user_id", null);
}

/** Hook con el usuario autenticado actual (o null), y si todavía está cargando. */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);
      if (sessionUser) void linkPendingMemberships(sessionUser);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) void linkPendingMemberships(sessionUser);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
