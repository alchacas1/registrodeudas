import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.hoisted(() => vi.fn());
const getDocs = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => vi.fn((...parts: unknown[]) => ({ parts })));
const where = vi.hoisted(() => vi.fn((...parts: unknown[]) => ({ parts })));
const runTransaction = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const set = vi.hoisted(() => vi.fn());

vi.mock("firebase/auth", () => ({ sendSignInLinkToEmail: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  collectionGroup: vi.fn(() => ({ kind: "members" })),
  doc: vi.fn(),
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp: vi.fn(),
  where,
}));
vi.mock("./firebase", () => ({ auth: {}, firestore: { name: "firestore" } }));

import { claimPendingMemberships, listMyGroups } from "./db";

describe("listMyGroups", () => {
  beforeEach(() => {
    getDoc.mockReset();
    getDocs.mockReset();
    query.mockClear();
    where.mockClear();
    runTransaction.mockReset();
    update.mockReset();
    set.mockReset();
  });

  it("migrates an existing restricted group UID to the verified account", async () => {
    const groupRef = { id: "group-1", path: "groups/group-1" };
    const memberRef = { id: "member-1", parent: { parent: groupRef } };
    getDocs.mockResolvedValueOnce({ docs: [{ id: "member-1", ref: memberRef }] });
    runTransaction.mockImplementationOnce(async (_firestore, callback) => callback({
      get: vi.fn().mockResolvedValue({ data: () => ({
        email: "person@example.com",
        userId: "group-0123456789abcdef0123456789abcdef",
      }) }),
      update,
      set,
    }));

    await claimPendingMemberships({
      uid: "user-1",
      email: "person@example.com",
      emailVerified: true,
    } as never);

    expect(update).toHaveBeenCalledWith(memberRef, { userId: "user-1" });
    expect(set).toHaveBeenCalledOnce();
  });

  it("claims invitations, deduplicates memberships, and returns existing parent groups", async () => {
    const groupOne = { id: "group-1", path: "groups/group-1" };
    const groupTwo = { id: "group-2", path: "groups/group-2" };
    getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [
          { ref: { parent: { parent: groupOne } } },
          { ref: { parent: { parent: groupOne } } },
          { ref: { parent: { parent: groupTwo } } },
        ],
      });
    getDoc
      .mockResolvedValueOnce({
        id: "group-1",
        exists: () => true,
        data: () => ({ name: "Viaje", type: "amigos", description: "Octubre", createdAt: "2026-10-01T00:00:00.000Z" }),
      })
      .mockResolvedValueOnce({ id: "group-2", exists: () => false });

    const result = await listMyGroups({
      uid: "user-1",
      email: " Person@Example.com ",
      emailVerified: true,
    } as never);

    expect(where).toHaveBeenCalledWith("email", "==", "person@example.com");
    expect(where).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(getDoc).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{
      id: "group-1",
      name: "Viaje",
      type: "amigos",
      description: "Octubre",
      createdAt: "2026-10-01T00:00:00.000Z",
    }]);
  });

  it("returns no groups for an unverified account", async () => {
    await expect(listMyGroups({
      uid: "user-1",
      email: "person@example.com",
      emailVerified: false,
    } as never)).resolves.toEqual([]);

    expect(getDocs).not.toHaveBeenCalled();
  });
});
