// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithCustomToken = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ name: "test-auth" }));

vi.mock("firebase/auth", () => ({
  isSignInWithEmailLink: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
  signInWithCustomToken,
  signOut: vi.fn(),
}));
vi.mock("./firebase", () => ({ auth }));
vi.mock("./db", () => ({ claimPendingMemberships: vi.fn() }));

import { DirectJoinError, joinGroupWithCredentials } from "./auth";

describe("joinGroupWithCredentials", () => {
  beforeEach(() => {
    signInWithCustomToken.mockReset().mockResolvedValue({ user: { uid: "group-user" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges the credentials and signs in with the returned custom token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      token: "custom-token",
      groupId: "group-1",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(joinGroupWithCredentials("ABCDE", " Person@Example.com "))
      .resolves.toEqual({ groupId: "group-1" });

    expect(fetchMock).toHaveBeenCalledWith("/api/join-group", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "ABCDE", email: "person@example.com" }),
    });
    expect(signInWithCustomToken).toHaveBeenCalledWith(auth, "custom-token");
  });

  it.each([
    [400, "invalid"],
    [401, "invalid"],
    [429, "limited"],
    [503, "unavailable"],
  ] as const)("maps HTTP %s to the safe %s category", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "server detail" }),
      { status, headers: { "content-type": "application/json" } },
    )));

    await expect(joinGroupWithCredentials("ABCDE", "person@example.com"))
      .rejects.toMatchObject({ kind });
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it("rejects malformed success payloads without trying to authenticate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ groupId: "group-1" })));

    await expect(joinGroupWithCredentials("ABCDE", "person@example.com"))
      .rejects.toEqual(new DirectJoinError("unavailable"));
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it("maps a network failure to temporary unavailability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network detail")));

    await expect(joinGroupWithCredentials("ABCDE", "person@example.com"))
      .rejects.toMatchObject({ kind: "unavailable" });
  });
});
