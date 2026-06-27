import { useState, type CSSProperties } from "react";
import { avatarColors } from "../lib/utils";
import { C, baseCard, baseInput, baseSelect } from "./design";

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
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


// Reusable Input
export function Input({
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
export function StyledSelect({
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
export function Btn({
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
export function KpiCard({
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
