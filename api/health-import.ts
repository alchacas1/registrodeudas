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

export async function GET(request: Request) {
  const handlerResponse = await handleRequest(request);
  const firebaseModule = await import("./_firebase-join-dependencies.js");
  return Response.json({
    handlerStatus: handlerResponse.status,
    firebaseModuleLoaded: typeof firebaseModule.joinGroupWithFirebase === "function",
    missingServerEnvironment: requiredFirebaseEnvironment.filter(
      (name) => !process.env[name]?.trim(),
    ),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
