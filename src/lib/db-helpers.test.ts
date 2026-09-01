import { describe, expect, it } from "vitest";
import { generateAccessCode, timestampToIso } from "./db-helpers";

describe("database helpers", () => {
  it("generates an unambiguous five-character code", () => {
    expect(generateAccessCode(() => new Uint8Array([0, 1, 2, 3, 4]))).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  });
  it("converts Firestore-like timestamps", () => {
    expect(timestampToIso({ toDate: () => new Date("2026-09-01T12:00:00.000Z") })).toBe("2026-09-01T12:00:00.000Z");
  });
});
