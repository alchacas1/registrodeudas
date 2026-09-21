import {
  JoinServiceError,
  type JoinContext,
  type JoinCredentials,
} from "./_join-service";

type JoinOperation = (
  credentials: JoinCredentials,
  context: JoinContext,
) => Promise<{ token: string; groupId: string }>;

const errorResponses = {
  "invalid-input": [400, "Solicitud inválida."],
  unauthorized: [401, "No se pudo ingresar con esos datos."],
  "rate-limited": [429, "Demasiados intentos. Espera unos minutos."],
  unavailable: [503, "El acceso no está disponible temporalmente."],
} as const;

function json(body: unknown, status: number, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function createJoinGroupHandler(join: JoinOperation) {
  return async function handleJoinGroup(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Método no permitido." }, 405, { allow: "POST" });
    }

    let credentials: JoinCredentials;
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object") throw new Error("invalid body");
      const record = body as Record<string, unknown>;
      credentials = { code: record.code, email: record.email };
    } catch {
      return json({ error: "Solicitud inválida." }, 400);
    }

    try {
      const result = await join(credentials, { ip: clientIp(request) });
      return json(result, 200);
    } catch (error) {
      if (error instanceof JoinServiceError) {
        const [status, message] = errorResponses[error.code];
        return json({ error: message }, status);
      }
      return json({ error: "No se pudo procesar el acceso." }, 500);
    }
  };
}
