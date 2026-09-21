import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { completeEmailLink, isMagicLink, sendMagicLink, useCurrentUser } from "../lib/auth";
import { firebaseAuthErrorMessage, normalizeEmail } from "../lib/auth-helpers";
import {
  buildEntryRedirectUrl,
  normalizeAccessCode,
  readEntryIntent,
  type EntryIntent,
} from "../lib/entry-flow";
import { baseCard, baseInput, C } from "./design";
import { Btn, Input } from "./ui";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: C.bg,
  color: C.text,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const panelStyle: CSSProperties = {
  ...baseCard,
  width: "100%",
  maxWidth: 440,
  padding: 28,
  display: "grid",
  gap: 16,
};

function Brand() {
  return (
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <img
        src="/Icono.png"
        alt=""
        aria-hidden="true"
        style={{ width: 58, height: 58, borderRadius: 17, objectFit: "cover", marginBottom: 14 }}
      />
      <div style={{ fontSize: 13, color: C.text2, fontWeight: 700 }}>Registro de Deudas</div>
    </div>
  );
}

function ChoiceButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...baseCard,
        width: "100%",
        padding: "18px 20px",
        color: C.text,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ display: "block", fontSize: 17, fontWeight: 800, marginBottom: 5 }}>
        {title} →
      </span>
      <span style={{ color: C.text2, fontSize: 13, lineHeight: 1.5 }}>{description}</span>
    </button>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  const magicLink = isMagicLink();
  const [intent, setIntent] = useState<EntryIntent | null>(() =>
    readEntryIntent(window.location.search),
  );
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(magicLink);
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (!magicLink) return;
    completeEmailLink(window.location.href)
      .then((result) => {
        if (!result) setMessage("Confirma el correo al que se envió el enlace.");
      })
      .catch(() => setMessage("El enlace no es válido o expiró."))
      .finally(() => setBusy(false));
  }, [magicLink]);

  if (loading || busy) {
    return <div style={pageStyle}>Verificando sesión…</div>;
  }
  if (user) return <>{children}</>;

  const sendAccessLink = async () => {
    if (!intent) return;
    setBusy(true);
    setMessage("");
    try {
      const redirectTo = buildEntryRedirectUrl(window.location.origin, intent);
      await sendMagicLink(email, redirectTo);
      setSentTo(normalizeEmail(email));
    } catch (error) {
      setMessage(firebaseAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (magicLink) {
      setBusy(true);
      setMessage("");
      try {
        await completeEmailLink(window.location.href, email);
      } catch (error) {
        setMessage(firebaseAuthErrorMessage(error));
      } finally {
        setBusy(false);
      }
      return;
    }
    await sendAccessLink();
  };

  if (!magicLink && !intent) {
    return (
      <main style={pageStyle}>
        <section style={{ width: "100%", maxWidth: 440, display: "grid", gap: 14 }}>
          <Brand />
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.03em" }}>
              ¿Qué quieres hacer?
            </h1>
            <p style={{ color: C.text2, margin: "10px 0 0", lineHeight: 1.5 }}>
              Elige una opción para comenzar.
            </p>
          </div>
          <ChoiceButton
            title="Crear un grupo"
            description="Organiza nuevas deudas con familiares, amigos u otras personas."
            onClick={() => setIntent({ mode: "create" })}
          />
          <ChoiceButton
            title="Unirme a un grupo"
            description="Usa el código de un grupo al que ya fuiste invitado."
            onClick={() => setIntent({ mode: "join", code: "" })}
          />
        </section>
      </main>
    );
  }

  if (sentTo) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <Brand />
          <h1 style={{ margin: 0, textAlign: "center", fontSize: 25 }}>Enlace enviado</h1>
          <p style={{ color: C.text2, margin: 0, textAlign: "center", lineHeight: 1.6 }}>
            Enviamos un enlace seguro a <strong style={{ color: C.text }}>{sentTo}</strong>.
            Ábrelo para continuar y revisa la carpeta de spam si no lo encuentras.
          </p>
          <Btn onClick={sendAccessLink} disabled={busy} variant="secondary">
            {busy ? "Reenviando…" : "Reenviar enlace"}
          </Btn>
          <button
            type="button"
            onClick={() => setSentTo("")}
            style={{ background: "none", border: 0, color: C.accentHi, cursor: "pointer", fontFamily: "inherit" }}
          >
            Corregir correo
          </button>
        </section>
      </main>
    );
  }

  const joining = intent?.mode === "join";
  const canSubmit =
    !!email.trim() && (!joining || intent.code.length === 5) && !busy;

  return (
    <main style={pageStyle}>
      <form onSubmit={submit} style={panelStyle}>
        <Brand />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 25 }}>
            {magicLink ? "Confirma tu correo" : joining ? "Unirme a un grupo" : "Crear un grupo"}
          </h1>
          <p style={{ color: C.text2, margin: "8px 0 0", lineHeight: 1.5, fontSize: 14 }}>
            {magicLink
              ? "Escribe el mismo correo donde recibiste este enlace."
              : joining
                ? "El correo debe haber sido invitado previamente al grupo."
                : "Te enviaremos un enlace seguro antes de crear el grupo."}
          </p>
        </div>

        {joining && (
          <>
            <label htmlFor="auth-group-code" style={{ fontWeight: 700 }}>Código del grupo</label>
            <input
              id="auth-group-code"
              value={intent.code}
              onChange={(event) =>
                setIntent({ mode: "join", code: normalizeAccessCode(event.target.value) })
              }
              placeholder="ABCDE"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              style={{
                ...baseInput,
                textAlign: "center",
                fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                fontSize: 24,
                letterSpacing: "0.28em",
                fontWeight: 800,
              }}
            />
          </>
        )}

        <label htmlFor="auth-email" style={{ fontWeight: 700 }}>Correo</label>
        <Input
          id="auth-email"
          value={email}
          onChange={setEmail}
          placeholder="correo@ejemplo.com"
          type="email"
        />
        <Btn onClick={() => undefined} disabled={!canSubmit}>
          {busy
            ? magicLink ? "Completando…" : "Enviando…"
            : magicLink
              ? "Completar acceso"
              : joining
                ? "Enviar enlace para unirme"
                : "Enviar enlace para crear"}
        </Btn>
        {message && <p role="alert" style={{ color: C.red, margin: 0 }}>{message}</p>}
        {!magicLink && (
          <button
            type="button"
            onClick={() => {
              setIntent(null);
              setMessage("");
            }}
            style={{ background: "none", border: 0, color: C.text2, cursor: "pointer", fontFamily: "inherit" }}
          >
            ← Volver
          </button>
        )}
      </form>
    </main>
  );
}
