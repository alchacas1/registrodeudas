import { useState, type CSSProperties } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import type { Group, GroupType, Member, Debt } from "./types.tsx";
import { getGroups, setGroup, findGroupByCode } from "./store.tsx";

// Design tokens
const C = {
  bg: "#0b0b12",
  surface: "#14141e",
  card: "#1c1c2a",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  accent: "#7c6dfa",
  accentHi: "#9f94fb",
  accentLo: "rgba(124,109,250,0.15)",
  green: "#4ade80",
  greenLo: "rgba(74,222,128,0.12)",
  red: "#f87171",
  redLo: "rgba(248,113,113,0.12)",
  yellow: "#fbbf24",
  text: "#f0f0f8",
  text2: "#8888a8",
  text3: "#44445a",
};

const baseCard: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
};

const baseInput: CSSProperties = {
  width: "100%",
  background: C.surface,
  border: `1px solid ${C.border2}`,
  borderRadius: 12,
  padding: "12px 16px",
  color: C.text,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const baseSelect: CSSProperties = {
  width: "100%",
  background: C.surface,
  border: `1px solid ${C.border2}`,
  borderRadius: 12,
  padding: "12px 16px",
  color: C.text,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238888a8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 36,
};

// Helpers
function generateCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) result += chars[values[i] % chars.length];
  return result;
}

function computeSummaries(group: Group) {
  const sums: Record<
    string,
    {
      memberId: string;
      memberName: string;
      owes: number;
      isOwed: number;
      netBalance: number;
    }
  > = {};
  for (const m of group.members)
    sums[m.id] = {
      memberId: m.id,
      memberName: m.name,
      owes: 0,
      isOwed: 0,
      netBalance: 0,
    };
  for (const d of group.debts) {
    if (d.status === "pagada") continue;
    const rem = d.amount - d.paidAmount;
    if (sums[d.debtorId]) sums[d.debtorId].owes += rem;
    if (sums[d.lenderId]) sums[d.lenderId].isOwed += rem;
  }
  for (const x of Object.values(sums)) x.netBalance = x.isOwed - x.owes;
  return Object.values(sums);
}

function computeDebtBetween(
  debtorId: string,
  lenderId: string,
  debts: Debt[],
): number {
  return debts
    .filter(
      (d) =>
        d.debtorId === debtorId &&
        d.lenderId === lenderId &&
        d.status !== "pagada",
    )
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
}

const AVATAR_COLORS: [string, string][] = [
  ["#7c6dfa", "#4c3fd6"],
  ["#4ade80", "#22a85a"],
  ["#f87171", "#d94040"],
  ["#fbbf24", "#d97706"],
  ["#60a5fa", "#2563eb"],
  ["#c084fc", "#9333ea"],
  ["#34d399", "#059669"],
  ["#fb923c", "#ea580c"],
];

function avatarColors(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [from, to] = avatarColors(name);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>
  );
}

function currencySymbol(c: string) {
  return c === "USD" ? "$" : c === "EUR" ? "€" : "₡";
}

function fmt(n: number) {
  return n.toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Reusable Input
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  style?: CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...baseInput,
        borderColor: focused ? C.accent : C.border2,
        boxShadow: focused ? `0 0 0 3px ${C.accentLo}` : "none",
        ...style,
      }}
    />
  );
}

// Reusable Select
function StyledSelect({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...baseSelect,
        borderColor: focused ? C.accent : C.border2,
        boxShadow: focused ? `0 0 0 3px ${C.accentLo}` : "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// Button
function Btn({
  onClick,
  disabled,
  children,
  variant = "primary",
  style,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  style?: CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  const base: CSSProperties =
    variant === "primary"
      ? {
          background: `linear-gradient(135deg, ${C.accent}, #9f5ff7)`,
          border: "none",
          color: "#fff",
          fontWeight: 700,
        }
      : {
          background: "transparent",
          border: `1px solid ${C.border2}`,
          color: C.text,
          fontWeight: 600,
        };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        borderRadius: 12,
        padding: "12px 20px",
        fontSize: 15,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.4 : hov ? 0.88 : 1,
        transform: hov && !disabled ? "translateY(-1px)" : "none",
        fontFamily: "inherit",
        letterSpacing: "0.01em",
        ...base,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// KPI card
function KpiCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string | number;
  accentColor: string;
}) {
  return (
    <div
      style={{
        ...baseCard,
        padding: "18px 20px",
        borderTop: `2px solid ${accentColor}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.text2,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: C.text,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// HOME PAGE
function Home({
  onCreateGroup,
}: {
  onCreateGroup: (
    name: string,
    type: GroupType,
    description?: string,
  ) => string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("amigos");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (name.trim()) {
      const id = onCreateGroup(name, type, description);
      navigate(`/group/${id}`);
    }
  };

  const handleJoin = () => {
    const group = findGroupByCode(code.toUpperCase());
    if (group) navigate(`/group/${group.id}`);
    else alert("Código inválido");
    setCode("");
  };

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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

      <div style={{ maxWidth: 420, width: "100%", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              borderRadius: 18,
              marginBottom: 20,
              background: `linear-gradient(135deg, ${C.accent}, #9f5ff7)`,
              boxShadow: `0 8px 32px rgba(124,109,250,0.35)`,
            }}
          >
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
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
              disabled={!name.trim()}
              style={{ marginTop: 4 }}
            >
              Crear Grupo →
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
            <Btn
              onClick={handleJoin}
              disabled={code.length < 5}
              variant="secondary"
            >
              Unirse al grupo
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// GROUP PAGE
function GroupPage({
  groups,
  onUpdateGroup,
}: {
  groups: Record<string, Group>;
  onUpdateGroup: (g: Group) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const group = id ? groups[id] : null;

  const [memberName, setMemberName] = useState("");
  const [debtDebtor, setDebtDebtor] = useState("");
  const [debtLender, setDebtLender] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState("CRC");
  const [debtReason, setDebtReason] = useState("");
  const [searchDebtor, setSearchDebtor] = useState("");
  const [searchLender, setSearchLender] = useState("");
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
  };

  if (!group) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: C.text2, marginBottom: 20 }}>
            Grupo no encontrado
          </p>
          <Btn
            onClick={() => navigate("/")}
            style={{ width: "auto", padding: "12px 28px" }}
          >
            Volver al inicio
          </Btn>
        </div>
      </div>
    );
  }

  const summaries = computeSummaries(group);
  const activeDebts = group.debts.filter((d) => d.status !== "pagada");
  const totalOwes = summaries.reduce((s, x) => s + x.owes, 0);
  const totalIsOwed = summaries.reduce((s, x) => s + x.isOwed, 0);
  const totalNet = totalIsOwed - totalOwes;

  const copyCode = () => {
    navigator.clipboard.writeText(group.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    const member: Member = {
      id: uuidv4(),
      name: memberName,
      avatar: "",
      joinedAt: new Date().toISOString(),
    };
    onUpdateGroup({ ...group, members: [...group.members, member] });
    setMemberName("");
  };

  const addDebt = () => {
    const amount = parseFloat(debtAmount);
    if (!debtDebtor || !debtLender || !amount || debtDebtor === debtLender)
      return;
    const debt: Debt = {
      id: uuidv4(),
      debtorId: debtDebtor,
      lenderId: debtLender,
      amount,
      currency: debtCurrency,
      reason: debtReason,
      date: new Date().toISOString().split("T")[0],
      status: "pendiente",
      paidAmount: 0,
      createdAt: new Date().toISOString(),
    };
    onUpdateGroup({ ...group, debts: [...group.debts, debt] });
    setDebtDebtor("");
    setDebtLender("");
    setDebtAmount("");
    setDebtReason("");
  };

  const markPaid = (debtId: string) => {
    const debts = group.debts.map((d) =>
      d.id === debtId
        ? { ...d, status: "pagada" as const, paidAmount: d.amount }
        : d,
    );
    onUpdateGroup({ ...group, debts });
  };

  const doSearch = () => {
    if (searchDebtor && searchLender)
      setSearchResult(
        computeDebtBetween(searchDebtor, searchLender, group.debts),
      );
  };

  return (
    <div style={pageStyle}>
      {/* Topbar */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: C.text2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontFamily: "inherit",
            fontWeight: 600,
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            {group.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.text2,
              textTransform: "capitalize",
            }}
          >
            {group.type}
          </div>
        </div>

        <button
          onClick={copyCode}
          style={{
            background: C.accentLo,
            border: `1px solid rgba(124,109,250,0.3)`,
            borderRadius: 10,
            padding: "6px 14px",
            color: C.accentHi,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.16em",
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copiado" : group.accessCode}
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 20px" }}>
        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 14,
            marginBottom: 26,
          }}
        >
          <KpiCard
            label="Miembros"
            value={group.members.length}
            accentColor={C.text3}
          />
          <KpiCard
            label="Deudas activas"
            value={activeDebts.length}
            accentColor={C.yellow}
          />
          <KpiCard
            label="Debes"
            value={`₡${fmt(totalOwes)}`}
            accentColor={C.red}
          />
          <KpiCard
            label="Te deben"
            value={`₡${fmt(totalIsOwed)}`}
            accentColor={C.green}
          />
          <KpiCard
            label="Saldo neto"
            value={`${totalNet < 0 ? "-" : ""}₡${fmt(Math.abs(totalNet))}`}
            accentColor={totalNet >= 0 ? C.green : C.red}
          />
        </div>

        {/* Two-col layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Active debts */}
            <div style={{ ...baseCard, padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  Deudas Activas
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.text2,
                    fontWeight: 600,
                    background: C.surface,
                    borderRadius: 20,
                    padding: "3px 12px",
                  }}
                >
                  {activeDebts.length}
                </div>
              </div>

              {activeDebts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 0",
                    color: C.text3,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                  <div
                    style={{ fontWeight: 700, color: C.text2, marginBottom: 4 }}
                  >
                    Sin deudas pendientes
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Todos los pagos están al día
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {activeDebts.map((d) => {
                    const debtor = group.members.find(
                      (m) => m.id === d.debtorId,
                    );
                    const lender = group.members.find(
                      (m) => m.id === d.lenderId,
                    );
                    const sym = currencySymbol(d.currency);
                    const rem = d.amount - d.paidAmount;
                    return (
                      <div
                        key={d.id}
                        style={{
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                          borderLeft: `3px solid ${C.red}`,
                          borderRadius: 12,
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          {debtor && <Avatar name={debtor.name} size={30} />}
                          <span style={{ color: C.text3, fontSize: 12 }}>
                            →
                          </span>
                          {lender && <Avatar name={lender.name} size={30} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: C.text,
                            }}
                          >
                            {debtor?.name}{" "}
                            <span style={{ color: C.text3, fontWeight: 400 }}>
                              debe a
                            </span>{" "}
                            {lender?.name}
                          </div>
                          {d.reason && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.text2,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.reason}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: C.red,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {sym}
                            {fmt(rem)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.text3,
                              marginBottom: 6,
                            }}
                          >
                            {d.currency}
                          </div>
                          <button
                            onClick={() => markPaid(d.id)}
                            style={{
                              background: C.greenLo,
                              border: `1px solid rgba(74,222,128,0.25)`,
                              borderRadius: 8,
                              padding: "4px 12px",
                              color: C.green,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Pagar ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Balances */}
            <div style={{ ...baseCard, padding: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>
                Estado de Saldos
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {summaries.map((x) => (
                  <div
                    key={x.memberId}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <Avatar name={x.memberName} size={36} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {x.memberName}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              x.netBalance > 0
                                ? C.green
                                : x.netBalance < 0
                                  ? C.red
                                  : C.text2,
                          }}
                        >
                          {x.netBalance > 0 ? "+" : ""}
                          {fmt(x.netBalance)}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          background: C.bg,
                          borderRadius: 8,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: C.text3,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 3,
                          }}
                        >
                          Debe
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: x.owes > 0 ? C.red : C.text3,
                          }}
                        >
                          ₡{fmt(x.owes)}
                        </div>
                      </div>
                      <div
                        style={{
                          background: C.bg,
                          borderRadius: 8,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: C.text3,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 3,
                          }}
                        >
                          Le deben
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: x.isOwed > 0 ? C.green : C.text3,
                          }}
                        >
                          ₡{fmt(x.isOwed)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Net total banner */}
            <div
              style={{
                ...baseCard,
                padding: "32px",
                textAlign: "center",
                borderColor:
                  totalNet >= 0
                    ? "rgba(74,222,128,0.2)"
                    : "rgba(248,113,113,0.2)",
                background: `linear-gradient(135deg, ${C.card}, ${totalNet >= 0 ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)"})`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.text2,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                Saldo Neto Total
              </div>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  color: totalNet >= 0 ? C.green : C.red,
                  lineHeight: 1,
                }}
              >
                {totalNet < 0 ? "-" : ""}₡{fmt(Math.abs(totalNet))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 40,
                  marginTop: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.text3,
                      marginBottom: 4,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Debes
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.red }}>
                    ₡{fmt(totalOwes)}
                  </div>
                </div>
                <div style={{ width: 1, background: C.border }} />
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.text3,
                      marginBottom: 4,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Te deben
                  </div>
                  <div
                    style={{ fontSize: 22, fontWeight: 800, color: C.green }}
                  >
                    ₡{fmt(totalIsOwed)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Add member */}
            <div style={{ ...baseCard, padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
                Agregar Miembro
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <Input
                  value={memberName}
                  onChange={setMemberName}
                  placeholder="Nombre"
                />
                <Btn onClick={addMember} disabled={!memberName.trim()}>
                  + Agregar
                </Btn>
              </div>
              {group.members.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {group.members.map((m, i) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      <Avatar name={m.name} size={26} />
                      <span
                        style={{ fontSize: 13, color: C.text, fontWeight: 500 }}
                      >
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add debt */}
            <div style={{ ...baseCard, padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
                Registrar Deuda
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <StyledSelect value={debtDebtor} onChange={setDebtDebtor}>
                  <option value="">¿Quién debe?</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <StyledSelect value={debtLender} onChange={setDebtLender}>
                  <option value="">¿A quién le deben?</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={debtAmount}
                    onChange={setDebtAmount}
                    placeholder="Monto"
                    type="number"
                    style={{ flex: 1 }}
                  />
                  <StyledSelect
                    value={debtCurrency}
                    onChange={setDebtCurrency}
                    style={{
                      width: 70,
                      flex: "none",
                      paddingRight: 12,
                      backgroundImage: "none",
                    }}
                  >
                    <option value="CRC">₡</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                  </StyledSelect>
                </div>
                <Input
                  value={debtReason}
                  onChange={setDebtReason}
                  placeholder="Motivo (opcional)"
                />
                <Btn
                  onClick={addDebt}
                  disabled={
                    !debtDebtor ||
                    !debtLender ||
                    !debtAmount ||
                    debtDebtor === debtLender
                  }
                >
                  + Registrar
                </Btn>
              </div>
            </div>

            {/* Search */}
            <div style={{ ...baseCard, padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
                Buscar Deuda
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <StyledSelect value={searchDebtor} onChange={setSearchDebtor}>
                  <option value="">Deudor</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <StyledSelect value={searchLender} onChange={setSearchLender}>
                  <option value="">Prestamista</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <Btn
                  onClick={doSearch}
                  disabled={!searchDebtor || !searchLender}
                  variant="secondary"
                >
                  Buscar
                </Btn>
                {searchResult !== null && (
                  <div
                    style={{
                      background: searchResult > 0 ? C.redLo : C.greenLo,
                      border: `1px solid ${searchResult > 0 ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: C.text2,
                        marginBottom: 6,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Deuda total
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 900,
                        color: searchResult > 0 ? C.red : C.green,
                      }}
                    >
                      ₡{fmt(searchResult)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// APP
function App() {
  const [groups, setGroups] = useState<Record<string, Group>>(() =>
    getGroups(),
  );

  const createGroup = (name: string, type: GroupType, description?: string) => {
    const group: Group = {
      id: uuidv4(),
      name,
      type,
      description,
      members: [],
      debts: [],
      createdAt: new Date().toISOString(),
      accessCode: generateCode(),
    };
    setGroup(group);
    setGroups((prev) => ({ ...prev, [group.id]: group }));
    return group.id;
  };

  const updateGroup = (group: Group) => {
    setGroup(group);
    setGroups((prev) => ({ ...prev, [group.id]: group }));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home onCreateGroup={createGroup} />} />
        <Route
          path="/group/:id"
          element={<GroupPage groups={groups} onUpdateGroup={updateGroup} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
