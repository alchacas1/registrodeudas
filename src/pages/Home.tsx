import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { GroupType } from "../types";
import { createGroup as dbCreateGroup, findGroupByCode } from "../lib/db";
import { signOut, useCurrentUser } from "../lib/auth";
import { normalizeAccessCode, readEntryIntent } from "../lib/entry-flow";
import { baseCard, baseInput, C } from "../components/design";
import { Btn, Input, StyledSelect } from "../components/ui";
import versionInfo from "../data/version.json";

type HomeMode = "create" | "join" | null;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  WebkitFontSmoothing: "antialiased",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

const quietButtonStyle: CSSProperties = {
  background: "none",
  border: 0,
  color: C.text2,
  cursor: "pointer",
  fontFamily: "inherit",
};

function ActionCard({
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
        padding: 22,
        color: C.text,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ display: "block", fontSize: 19, fontWeight: 800, marginBottom: 6 }}>
        {title} →
      </span>
      <span style={{ color: C.text2, fontSize: 13, lineHeight: 1.5 }}>{description}</span>
    </button>
  );
}

export function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const resumedIntent = useMemo(() => readEntryIntent(location.search), [location.search]);
  const [mode, setMode] = useState<HomeMode>(() => resumedIntent?.mode ?? null);
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("amigos");
  const [description, setDescription] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [code, setCode] = useState(() => resumedIntent?.mode === "join" ? resumedIntent.code : "");
  const [showOptions, setShowOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [formError, setFormError] = useState("");
  const resumedJoinStarted = useRef(false);

  const handleCreate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim() || !creatorName.trim() || creating) return;
    setCreating(true);
    setFormError("");
    try {
      const group = await dbCreateGroup(
        name.trim(),
        type,
        creatorName.trim(),
        description.trim() || undefined,
      );
      navigate(`/group/${group.id}`);
    } catch (error) {
      console.error(error);
      setFormError("No se pudo crear el grupo. Intenta nuevamente.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (code.length !== 5 || joining) return;
    setJoining(true);
    setFormError("");
    try {
      const result = await findGroupByCode(code);
      if (result.status === "joined") {
        navigate(`/group/${result.id}`, { replace: !!resumedIntent });
      } else if (result.status === "invalid-code") {
        setFormError("El código ingresado no existe. Revísalo e intenta nuevamente.");
      } else {
        setFormError("Este correo todavía no pertenece al grupo. Solicita una invitación al administrador.");
      }
    } catch (error) {
      console.error(error);
      setFormError("No se pudo verificar el código. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setJoining(false);
    }
  }, [code, joining, navigate, resumedIntent]);

  useEffect(() => {
    if (resumedIntent?.mode !== "join" || resumedJoinStarted.current) return;
    resumedJoinStarted.current = true;
    void handleJoin();
  }, [handleJoin, resumedIntent]);

  const selectMode = (nextMode: Exclude<HomeMode, null>) => {
    setMode(nextMode);
    setFormError("");
    if (nextMode === "join") setCode("");
  };

  const clearSelection = () => {
    setMode(null);
    setFormError("");
    setCode("");
    navigate("/", { replace: true });
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,109,250,0.1) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <header
        style={{
          minHeight: 58,
          padding: "10px 20px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          position: "relative",
        }}
      >
        {user?.email && <span style={{ color: C.text2, fontSize: 12 }}>{user.email}</span>}
        <button type="button" onClick={() => void signOut()} style={quietButtonStyle}>
          Cerrar sesión
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 24px 32px",
          position: "relative",
        }}
      >
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img
              src="/Icono.png"
              alt=""
              aria-hidden="true"
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                marginBottom: 18,
                objectFit: "cover",
                boxShadow: "0 8px 32px rgba(124,109,250,0.35)",
              }}
            />
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>
              Registro de Deudas
            </h1>
            <p style={{ color: C.text2, margin: "10px 0 0", fontSize: 15 }}>
              Lleva el control claro entre personas
            </p>
          </div>

          {mode === null && (
            <section style={{ display: "grid", gap: 14 }}>
              <div style={{ textAlign: "center", marginBottom: 2 }}>
                <h2 style={{ margin: 0, fontSize: 21 }}>¿Qué quieres hacer?</h2>
              </div>
              <ActionCard
                title="Crear un grupo"
                description="Crea un espacio nuevo y agrega a las personas que participarán."
                onClick={() => selectMode("create")}
              />
              <ActionCard
                title="Unirme a un grupo"
                description="Ingresa con el código de un grupo al que ya fuiste invitado."
                onClick={() => selectMode("join")}
              />
            </section>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreate} style={{ ...baseCard, padding: 28 }}>
              <h2 style={{ fontSize: 21, margin: "0 0 6px" }}>Crear Grupo</h2>
              <p style={{ color: C.text2, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                Define el grupo y cómo aparecerás dentro de él.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                <Input value={name} onChange={setName} placeholder="Nombre del grupo" />
                <Input value={creatorName} onChange={setCreatorName} placeholder="Tu nombre en el grupo" />
                {!showOptions ? (
                  <button
                    type="button"
                    onClick={() => setShowOptions(true)}
                    style={{ ...quietButtonStyle, textAlign: "left", padding: "3px 0" }}
                  >
                    + Opciones adicionales
                  </button>
                ) : (
                  <>
                    <StyledSelect value={type} onChange={(value) => setType(value as GroupType)}>
                      <option value="familia">Familia</option>
                      <option value="amigos">Amigos</option>
                      <option value="conocidos">Conocidos</option>
                      <option value="otros">Otros</option>
                    </StyledSelect>
                    <Input value={description} onChange={setDescription} placeholder="Descripción (opcional)" />
                  </>
                )}
                {formError && <p role="alert" style={{ color: C.red, fontSize: 13, margin: 0 }}>{formError}</p>}
                <Btn onClick={() => undefined} disabled={!name.trim() || !creatorName.trim() || creating}>
                  {creating ? "Creando grupo…" : "Crear grupo"}
                </Btn>
                <button type="button" onClick={clearSelection} style={quietButtonStyle}>← Volver</button>
              </div>
            </form>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoin} style={{ ...baseCard, padding: 28 }}>
              <h2 style={{ fontSize: 21, margin: "0 0 6px" }}>Unirme a un grupo</h2>
              <p style={{ color: C.text2, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                Tu correo debe haber sido invitado previamente por un miembro del grupo.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                <label htmlFor="home-group-code" style={{ fontSize: 13, fontWeight: 700 }}>Código del grupo</label>
                <input
                  id="home-group-code"
                  value={code}
                  onChange={(event) => setCode(normalizeAccessCode(event.target.value))}
                  placeholder="ABCDE"
                  autoCapitalize="characters"
                  autoComplete="off"
                  style={{
                    ...baseInput,
                    textAlign: "center",
                    fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                    fontSize: 26,
                    letterSpacing: "0.3em",
                    fontWeight: 800,
                    padding: 16,
                  }}
                />
                {formError && <p role="alert" style={{ color: C.red, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{formError}</p>}
                <Btn onClick={() => undefined} disabled={code.length !== 5 || joining} variant="secondary">
                  {joining ? "Verificando…" : "Unirme"}
                </Btn>
                <button type="button" onClick={clearSelection} disabled={joining} style={quietButtonStyle}>← Volver</button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "18px 24px",
          textAlign: "center",
          color: C.text3,
          fontSize: 13,
        }}
      >
        v{versionInfo.version}
      </footer>
    </div>
  );
}
