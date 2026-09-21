import { describe, expect, it, vi } from "vitest";
import { JoinServiceError } from "./_join-service";
import { createJoinGroupHandler } from "./_join-handler";

describe("join group HTTP handler", () => {
  it("rejects methods other than POST without invoking the service", async () => {
    const join = vi.fn();
    const response = await createJoinGroupHandler(join)(
      new Request("https://example.test/api/join-group", { method: "GET" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(join).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON as invalid input", async () => {
    const response = await createJoinGroupHandler(vi.fn())(
      new Request("https://example.test/api/join-group", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Solicitud inválida." });
  });

  it("returns the scoped token without permitting caches", async () => {
    const join = vi.fn().mockResolvedValue({ token: "custom-token", groupId: "group-1" });
    const response = await createJoinGroupHandler(join)(
      new Request("https://example.test/api/join-group", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
        body: JSON.stringify({ code: "ABCDE", email: "person@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ token: "custom-token", groupId: "group-1" });
    expect(join).toHaveBeenCalledWith(
      { code: "ABCDE", email: "person@example.com" },
      { ip: "203.0.113.10" },
    );
  });

  it.each([
    ["invalid-input", 400, "Solicitud inválida."],
    ["unauthorized", 401, "No se pudo ingresar con esos datos."],
    ["rate-limited", 429, "Demasiados intentos. Espera unos minutos."],
    ["unavailable", 503, "El acceso no está disponible temporalmente."],
  ] as const)("maps %s failures to a safe response", async (code, status, message) => {
    const join = vi.fn().mockRejectedValue(new JoinServiceError(code));
    const response = await createJoinGroupHandler(join)(
      new Request("https://example.test/api/join-group", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "ABCDE", email: "person@example.com" }),
      }),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
  });

  it("does not expose unexpected server error details", async () => {
    const join = vi.fn().mockRejectedValue(new Error("private backend detail"));
    const response = await createJoinGroupHandler(join)(
      new Request("https://example.test/api/join-group", {
        method: "POST",
        body: JSON.stringify({ code: "ABCDE", email: "person@example.com" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private backend detail");
  });
});
