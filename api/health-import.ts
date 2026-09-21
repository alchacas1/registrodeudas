import { createJoinGroupHandler } from "./_join-handler.js";

const handleRequest = createJoinGroupHandler(async () => ({
  token: "not-used",
  groupId: "not-used",
}));

export function GET(request: Request) {
  return handleRequest(request);
}
