import { describe, expect, it } from "vitest";
import {
  buildEntryRedirectUrl,
  normalizeAccessCode,
  readEntryIntent,
} from "./entry-flow";

describe("entry flow", () => {
  it("normalizes a pasted access code to five supported characters", () => {
    expect(normalizeAccessCode(" ab-cd e7 ")).toBe("ABCDE");
    expect(normalizeAccessCode("a0i1o2z9")).toBe("A2Z9");
  });

  it("reads a valid join intent from the query string", () => {
    expect(readEntryIntent("?entry=join&code=ab-cd-e")).toEqual({
      mode: "join",
      code: "ABCDE",
    });
  });

  it("does not resume an incomplete join intent", () => {
    expect(readEntryIntent("?entry=join&code=ABC")).toBeNull();
  });

  it("builds the return URL for creating a group", () => {
    expect(
      buildEntryRedirectUrl("https://registrodeudas.vercel.app", {
        mode: "create",
      }),
    ).toBe("https://registrodeudas.vercel.app/?entry=create");
  });

  it("builds the return URL for joining with a normalized code", () => {
    expect(
      buildEntryRedirectUrl("https://registrodeudas.vercel.app/", {
        mode: "join",
        code: "ab-cd-e",
      }),
    ).toBe("https://registrodeudas.vercel.app/?entry=join&code=ABCDE");
  });
});
