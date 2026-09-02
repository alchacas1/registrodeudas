import { describe, expect, it } from "vitest";
import { firebaseAuthErrorMessage, getEmailForLink, normalizeEmail } from "./auth-helpers";

describe("auth helpers", () => {
  it("normalizes an email", () => expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com"));
  it("uses a supplied cross-device email", () => expect(getEmailForLink(null, " User@Example.COM ")).toBe("user@example.com"));
  it("returns null when no email is available", () => expect(getEmailForLink(null)).toBeNull());
  it("explains an unauthorized redirect domain", () => {
    expect(firebaseAuthErrorMessage({ code: "auth/unauthorized-continue-uri" })).toContain("dominio");
  });
  it("keeps a safe fallback for unknown failures", () => {
    expect(firebaseAuthErrorMessage(new Error("secret internal detail"))).toBe("No se pudo procesar el acceso. Intenta nuevamente.");
  });
});
