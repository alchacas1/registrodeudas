import { describe, expect, it } from "vitest";
import { compareVersions } from "./version-utils.js";

describe("compareVersions", () => {
  it("returns 1 when the local version is newer", () => {
    expect(compareVersions("1.8.25", "1.8.24")).toBe(1);
    expect(compareVersions("1.9.0", "1.8.99")).toBe(1);
  });

  it("returns 0 when versions match", () => {
    expect(compareVersions("0.0.0", "0.0.0")).toBe(0);
  });

  it("returns -1 when the local version is older", () => {
    expect(compareVersions("1.8.24", "1.8.25")).toBe(-1);
    expect(compareVersions("1.8.99", "1.9.0")).toBe(-1);
  });

  it("throws for invalid semantic versions", () => {
    expect(() => compareVersions("1.0", "1.0.0")).toThrow(
      "Invalid semantic version",
    );
    expect(() => compareVersions("1.0.0", "latest")).toThrow(
      "Invalid semantic version",
    );
  });
});
