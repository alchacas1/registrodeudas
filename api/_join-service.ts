import { createHash } from "node:crypto";

export type JoinCredentials = {
  code: unknown;
  email: unknown;
};

export type JoinContext = {
  ip: string;
};

export type MembershipMatch = {
  groupId: string;
  memberId: string;
  userId: string | null;
};

export type JoinClaims = {
  groupSession: true;
  groupId: string;
  memberId: string;
};

export type JoinDependencies = {
  consumeRateLimit(
    scope: "ip" | "email",
    value: string,
    limit: number,
    windowMs: number,
  ): Promise<boolean>;
  findMembership(code: string, email: string): Promise<MembershipMatch | null>;
  establishMembership(match: MembershipMatch, email: string): Promise<string>;
  createToken(uid: string, claims: JoinClaims): Promise<string>;
};

export type JoinErrorCode =
  | "invalid-input"
  | "unauthorized"
  | "rate-limited"
  | "unavailable";

export class JoinServiceError extends Error {
  readonly code: JoinErrorCode;

  constructor(code: JoinErrorCode) {
    super(code);
    this.name = "JoinServiceError";
    this.code = code;
  }
}

export type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

const WINDOW_MS = 10 * 60 * 1_000;
const ACCESS_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 5);
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildMemberUid(groupId: string, memberId: string) {
  const digest = createHash("sha256")
    .update(`${groupId}/${memberId}`)
    .digest("hex")
    .slice(0, 32);
  return `group-${digest}`;
}

export function advanceRateLimit(
  current: RateLimitState | null,
  now: number,
  limit: number,
  windowMs: number,
): { allowed: boolean; next: RateLimitState } {
  if (!current || now - current.windowStartedAt >= windowMs) {
    return { allowed: true, next: { count: 1, windowStartedAt: now } };
  }
  if (current.count >= limit) {
    return { allowed: false, next: current };
  }
  return {
    allowed: true,
    next: { count: current.count + 1, windowStartedAt: current.windowStartedAt },
  };
}

export async function joinGroup(
  credentials: JoinCredentials,
  context: JoinContext,
  dependencies: JoinDependencies,
): Promise<{ token: string; groupId: string }> {
  const code = normalizeCode(credentials.code);
  const email = normalizeEmail(credentials.email);
  if (!ACCESS_CODE_PATTERN.test(code) || !EMAIL_PATTERN.test(email)) {
    throw new JoinServiceError("invalid-input");
  }

  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      dependencies.consumeRateLimit("ip", context.ip || "unknown", 10, WINDOW_MS),
      dependencies.consumeRateLimit("email", email, 5, WINDOW_MS),
    ]);
    if (!ipAllowed || !emailAllowed) throw new JoinServiceError("rate-limited");

    const match = await dependencies.findMembership(code, email);
    if (!match) throw new JoinServiceError("unauthorized");

    const uid = await dependencies.establishMembership(match, email);
    const token = await dependencies.createToken(uid, {
      groupSession: true,
      groupId: match.groupId,
      memberId: match.memberId,
    });
    return { token, groupId: match.groupId };
  } catch (error) {
    if (error instanceof JoinServiceError) throw error;
    throw new JoinServiceError("unavailable");
  }
}
