import { describe, expect, it } from "vitest";

import { GET } from "../api/health-import";

describe("GET /api/health-import", () => {
  it("reports handler, Firebase module, and server environment readiness", async () => {
    const response = await GET(new Request("https://example.test/api/health-import"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.handlerStatus).toBe(405);
    expect(body.imports).toEqual({
      app: { loaded: true },
      auth: { loaded: true },
      firestore: { loaded: true },
      joinDependencies: { loaded: true },
    });
    expect(body.missingServerEnvironment).toEqual(expect.any(Array));
  });
});
