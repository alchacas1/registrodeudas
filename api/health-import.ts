import { createJoinGroupHandler } from "./_join-handler.js";

const handleRequest = createJoinGroupHandler(async () => ({
  token: "not-used",
  groupId: "not-used",
}));

const requiredFirebaseEnvironment = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

async function importStatus(load: () => Promise<unknown>) {
  try {
    await load();
    return { loaded: true };
  } catch (error) {
    return {
      loaded: false,
      error: error instanceof Error ? error.message.slice(0, 240) : "Unknown import error",
    };
  }
}

export async function GET(request: Request) {
  const handlerResponse = await handleRequest(request);
  const [app, auth, firestore, joinDependencies] = await Promise.all([
    importStatus(() => import("firebase-admin/app")),
    importStatus(() => import("firebase-admin/auth")),
    importStatus(() => import("firebase-admin/firestore")),
    importStatus(() => import("./_firebase-join-dependencies.js")),
  ]);
  return Response.json({
    handlerStatus: handlerResponse.status,
    imports: { app, auth, firestore, joinDependencies },
    missingServerEnvironment: requiredFirebaseEnvironment.filter(
      (name) => !process.env[name]?.trim(),
    ),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
