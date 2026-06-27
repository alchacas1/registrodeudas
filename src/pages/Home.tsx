import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { GroupType } from "../types";
import { createGroup as dbCreateGroup, findGroupByCode } from "../lib/db";
import { baseCard, baseInput, C } from "../components/design";
import { Btn, Input, StyledSelect } from "../components/ui";

// HOME PAGE
export function Home() {
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("amigos");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const group = await dbCreateGroup(
        name.trim(),
        type,
        description.trim() || undefined,
      );
      navigate(`/group/${group.id}`);
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el grupo. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (code.length < 5 || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const group = await findGroupByCode(code);
      if (group) navigate(`/group/${group.id}`);
      else setJoinError("Código inválido");
    } catch (err) {
      console.error(err);
      setJoinError("No se pudo verificar el código");
    } finally {
      setJoining(false);
      setCode("");
    }
  };

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={pageStyle}>
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,109,250,0.1) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, width: "100%", position: "relative" }}>
          {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img
            src="/Icono.png"
            alt=""
            aria-hidden="true"
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              marginBottom: 20,
              objectFit: "cover",
              boxShadow: `0 8px 32px rgba(124,109,250,0.35)`,
            }}
          />
          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: C.text,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Registro de Deudas
          </h1>
          <p style={{ color: C.text2, marginTop: 10, fontSize: 15 }}>
            Lleva el control claro entre personas
          </p>
        </div>

        {/* Create card */}
        <div style={{ ...baseCard, padding: 28, marginBottom: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.accent,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Nuevo
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              Crear Grupo
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              value={name}
              onChange={setName}
              placeholder="Nombre del grupo"
            />
            <StyledSelect
              value={type}
              onChange={(v) => setType(v as GroupType)}
            >
              <option value="familia">Familia</option>
              <option value="amigos">Amigos</option>
              <option value="conocidos">Conocidos</option>
              <option value="otros">Otros</option>
            </StyledSelect>
            {!showDesc ? (
              <button
                onClick={() => setShowDesc(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.text2,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "2px 0",
                  fontFamily: "inherit",
                }}
              >
                + Agregar descripción
              </button>
            ) : (
              <Input
                value={description}
                onChange={setDescription}
                placeholder="Descripción (opcional)"
              />
            )}
            <Btn
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              style={{ marginTop: 4 }}
            >
              {creating ? "Creando…" : "Crear Grupo →"}
            </Btn>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            margin: "8px 4px",
          }}
        >
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.text3, fontSize: 13, fontWeight: 600 }}>
            o
          </span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Join card */}
        <div style={{ ...baseCard, padding: 28, marginTop: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.text2,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Ingresar
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              Unirse a Grupo
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDE"
              maxLength={5}
              style={{
                ...baseInput,
                textAlign: "center",
                fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
                fontSize: 26,
                letterSpacing: "0.3em",
                fontWeight: 700,
                padding: "16px",
              }}
            />
            {joinError && (
              <div style={{ color: C.red, fontSize: 12, textAlign: "center" }}>
                {joinError}
              </div>
            )}
            <Btn
              onClick={handleJoin}
              disabled={code.length < 5 || joining}
              variant="secondary"
            >
              {joining ? "Verificando…" : "Unirse al grupo"}
            </Btn>
          </div>
        </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "20px 24px",
          textAlign: "center",
          color: C.text3,
          fontSize: 13,
          marginTop: 40,
        }}
      >
        RegistroDeudas
      </div>
    </div>
  );
}
