import type { CSSProperties } from "react";

export const C = {
  bg: "var(--bg-app)",
  surface: "var(--bg-surface)",
  card: "var(--bg-panel)",
  border: "var(--border-subtle)",
  border2: "var(--border-control)",
  accent: "var(--accent)",
  accentHi: "var(--accent-strong)",
  accentLo: "var(--accent-soft)",
  green: "var(--positive)",
  greenLo: "var(--positive-soft)",
  red: "var(--negative)",
  redLo: "var(--negative-soft)",
  yellow: "#fbbf24",
  text: "var(--text-primary)",
  text2: "var(--text-muted)",
  text3: "var(--text-subtle)",
};

export const baseCard: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
};

export const baseInput: CSSProperties = {
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

export const baseSelect: CSSProperties = {
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
