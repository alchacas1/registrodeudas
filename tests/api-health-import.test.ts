import { describe, expect, it } from "vitest";

import { GET } from "../api/health-import";

describe("GET /api/health-import", () => {
  it("loads the join handler without loading Firebase", async () => {
    const response = await GET(new Request("https://example.test/api/health-import"));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});
