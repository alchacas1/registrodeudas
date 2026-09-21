import { describe, expect, it } from "vitest";

import { GET } from "../api/health";

describe("GET /api/health", () => {
  it("responds without loading application or Firebase dependencies", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
