import { useState, type CSSProperties } from "react";
import { avatarColors } from "../lib/utils";
import { C, baseInput, baseSelect } from "./design";

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [background] = avatarColors(name);
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
        background,
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
  id,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  style?: CSSProperties;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
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
  id,
  autoFocus,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: CSSProperties;
  id?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      id={id}
      autoFocus={autoFocus}
      data-dialog-initial-focus={autoFocus || undefined}
      aria-label={ariaLabel}
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
          background: C.accent,
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
        transition: "opacity 0.15s",
        opacity: disabled ? 0.4 : hov ? 0.88 : 1,
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
