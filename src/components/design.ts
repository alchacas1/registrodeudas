import type { CSSProperties } from "react";

export const C = {
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

export const baseCard: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
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
