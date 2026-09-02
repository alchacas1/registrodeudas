import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { completeEmailLink, isMagicLink, sendMagicLink, useCurrentUser } from "../lib/auth";
import { Btn, Input } from "./ui";
import { C } from "./design";
import { firebaseAuthErrorMessage } from "../lib/auth-helpers";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  const [email, setEmail] = useState("");
  const magicLink = isMagicLink();
  const [busy, setBusy] = useState(magicLink);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!magicLink) return;
    completeEmailLink(window.location.href).then((result) => {
      if (!result) setMessage("Confirma el correo al que se envió el enlace.");
    }).catch(() => setMessage("El enlace no es válido o expiró.")).finally(() => setBusy(false));
  }, [magicLink]);

  if (loading || busy) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.text2 }}>Verificando sesión…</div>;
  if (user) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (magicLink) { await completeEmailLink(window.location.href, email); }
      else { await sendMagicLink(email, window.location.origin); setMessage("Revisa tu correo para ingresar."); }
    } catch (error) { setMessage(firebaseAuthErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: C.bg, color: C.text, fontFamily: "Inter, sans-serif" }}>
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 400, display: "grid", gap: 14 }}>
      <h1 style={{ margin: 0 }}>Registro de Deudas</h1>
      <p style={{ color: C.text2 }}>{magicLink ? "Confirma tu correo para completar el acceso." : "Ingresa con un enlace seguro enviado a tu correo."}</p>
      <label htmlFor="auth-email" style={{ fontWeight: 700 }}>Correo</label>
      <Input id="auth-email" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" type="email" />
      <Btn onClick={() => undefined} disabled={!email.trim() || busy}>{magicLink ? "Completar acceso" : "Enviar enlace"}</Btn>
      {message && <p style={{ color: C.text2 }}>{message}</p>}
    </form>
  </main>;
}
