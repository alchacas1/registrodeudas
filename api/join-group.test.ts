import { describe, expect, it } from "vitest";
import * as endpoint from "./join-group";

type MethodHandler = (request: Request) => Promise<Response>;

function exportedMethod(name: "GET" | "POST") {
  return (endpoint as unknown as Record<string, unknown>)[name] as MethodHandler | undefined;
}

describe("Vercel join-group entrypoint", () => {
  it("exposes a callable GET handler that rejects the method cleanly", async () => {
    const get = exportedMethod("GET");

    expect(typeof get).toBe("function");
    const response = await get!(new Request("https://example.test/api/join-group"));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("exposes a callable POST handler that validates the request before loading Firebase", async () => {
    const post = exportedMethod("POST");

    expect(typeof post).toBe("function");
    const response = await post!(new Request("https://example.test/api/join-group", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Solicitud inválida." });
  });
});
