import { describe, expect, it, vi } from "vitest";
import {
  JoinServiceError,
  advanceRateLimit,
  buildMemberUid,
  joinGroup,
  type JoinDependencies,
} from "./_join-service";

function dependencies(overrides: Partial<JoinDependencies> = {}): JoinDependencies {
  return {
    consumeRateLimit: vi.fn().mockResolvedValue(true),
    findMembership: vi.fn().mockResolvedValue({
      groupId: "group-1",
      memberId: "member-1",
      userId: null,
    }),
    establishMembership: vi.fn().mockResolvedValue("group-user-1"),
    createToken: vi.fn().mockResolvedValue("custom-token"),
    ...overrides,
  };
}

describe("joinGroup", () => {
  it("normalizes credentials and returns a token scoped to the matched group", async () => {
    const deps = dependencies();

    await expect(joinGroup(
      { code: " ab-cd e ", email: " Person@Example.COM " },
      { ip: "203.0.113.10" },
      deps,
    )).resolves.toEqual({ token: "custom-token", groupId: "group-1" });

    expect(deps.findMembership).toHaveBeenCalledWith("ABCDE", "person@example.com");
    expect(deps.establishMembership).toHaveBeenCalledWith({
      groupId: "group-1",
      memberId: "member-1",
      userId: null,
    }, "person@example.com");
    expect(deps.createToken).toHaveBeenCalledWith("group-user-1", {
      groupSession: true,
      groupId: "group-1",
      memberId: "member-1",
    });
  });

  it.each([
    [{ code: "ABCD", email: "person@example.com" }],
    [{ code: "ABCDE", email: "not-an-email" }],
    [{ code: "ABCDE", email: "" }],
  ])("rejects malformed credentials before querying membership", async (credentials) => {
    const deps = dependencies();

    await expect(joinGroup(credentials, { ip: "203.0.113.10" }, deps))
      .rejects.toMatchObject({ code: "invalid-input" });
    expect(deps.findMembership).not.toHaveBeenCalled();
  });

  it("consumes separate IP and normalized-email quotas", async () => {
    const deps = dependencies();

    await joinGroup(
      { code: "ABCDE", email: "PERSON@example.com" },
      { ip: "203.0.113.10" },
      deps,
    );

    expect(deps.consumeRateLimit).toHaveBeenNthCalledWith(
      1, "ip", "203.0.113.10", 10, 600_000,
    );
    expect(deps.consumeRateLimit).toHaveBeenNthCalledWith(
      2, "email", "person@example.com", 5, 600_000,
    );
  });

  it.each(["ip", "email"] as const)("rejects when the %s quota is exhausted", async (blockedScope) => {
    const deps = dependencies({
      consumeRateLimit: vi.fn(async (scope) => scope !== blockedScope),
    });

    await expect(joinGroup(
      { code: "ABCDE", email: "person@example.com" },
      { ip: "203.0.113.10" },
      deps,
    )).rejects.toMatchObject({ code: "rate-limited" });
    expect(deps.findMembership).not.toHaveBeenCalled();
  });

  it("uses one unauthorized result for an unknown or non-unique membership", async () => {
    const deps = dependencies({ findMembership: vi.fn().mockResolvedValue(null) });

    await expect(joinGroup(
      { code: "ABCDE", email: "person@example.com" },
      { ip: "203.0.113.10" },
      deps,
    )).rejects.toMatchObject({ code: "unauthorized" });
    expect(deps.establishMembership).not.toHaveBeenCalled();
  });

  it("keeps the adapter responsible for reusing an already linked user", async () => {
    const linked = { groupId: "group-1", memberId: "member-1", userId: "existing-user" };
    const deps = dependencies({
      findMembership: vi.fn().mockResolvedValue(linked),
      establishMembership: vi.fn().mockResolvedValue("existing-user"),
    });

    await joinGroup(
      { code: "ABCDE", email: "person@example.com" },
      { ip: "203.0.113.10" },
      deps,
    );

    expect(deps.establishMembership).toHaveBeenCalledWith(linked, "person@example.com");
    expect(deps.createToken).toHaveBeenCalledWith("existing-user", expect.any(Object));
  });

  it("maps unexpected dependency failures to an unavailable service error", async () => {
    const deps = dependencies({
      findMembership: vi.fn().mockRejectedValue(new Error("private backend detail")),
    });

    await expect(joinGroup(
      { code: "ABCDE", email: "person@example.com" },
      { ip: "203.0.113.10" },
      deps,
    )).rejects.toEqual(new JoinServiceError("unavailable"));
  });
});

describe("rate limit windows", () => {
  it("allows attempts through the limit and rejects the next attempt in the same window", () => {
    expect(advanceRateLimit(null, 1_000, 2, 60_000)).toEqual({
      allowed: true,
      next: { count: 1, windowStartedAt: 1_000 },
    });
    expect(advanceRateLimit({ count: 1, windowStartedAt: 1_000 }, 2_000, 2, 60_000)).toEqual({
      allowed: true,
      next: { count: 2, windowStartedAt: 1_000 },
    });
    expect(advanceRateLimit({ count: 2, windowStartedAt: 1_000 }, 3_000, 2, 60_000)).toEqual({
      allowed: false,
      next: { count: 2, windowStartedAt: 1_000 },
    });
  });

  it("starts a fresh counter after the window expires", () => {
    expect(advanceRateLimit({ count: 5, windowStartedAt: 1_000 }, 61_000, 5, 60_000)).toEqual({
      allowed: true,
      next: { count: 1, windowStartedAt: 61_000 },
    });
  });
});

it("builds a stable opaque UID without exposing group or member IDs", () => {
  expect(buildMemberUid("group-1", "member-1"))
    .toBe("group-8612e4e76eeacd479776921cbe370996");
});
