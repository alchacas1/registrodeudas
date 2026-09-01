import { describe, expect, it } from "vitest";
import { getEmailForLink, normalizeEmail } from "./auth-helpers";

describe("auth helpers", () => {
  it("normalizes an email", () => expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com"));
  it("uses a supplied cross-device email", () => expect(getEmailForLink(null, " User@Example.COM ")).toBe("user@example.com"));
  it("returns null when no email is available", () => expect(getEmailForLink(null)).toBeNull());
});
