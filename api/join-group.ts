import { createJoinGroupHandler } from "./_join-handler.js";
import type { JoinContext, JoinCredentials } from "./_join-service.js";

async function joinWithFirebase(credentials: JoinCredentials, context: JoinContext) {
  const { joinGroupWithFirebase } = await import("./_firebase-join-dependencies.js");
  return joinGroupWithFirebase(credentials, context);
}

const handleRequest = createJoinGroupHandler(joinWithFirebase);

export function GET(request: Request) {
  return handleRequest(request);
}

export function POST(request: Request) {
  return handleRequest(request);
}
