import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.hoisted(() => vi.fn());
const getDocs = vi.hoisted(() => vi.fn());

vi.mock("firebase/auth", () => ({ sendSignInLinkToEmail: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn((...segments: unknown[]) => ({ segments })),
  collectionGroup: vi.fn((...segments: unknown[]) => ({ segments })),
  doc: vi.fn((...segments: unknown[]) => ({ segments })),
  getDoc,
  getDocs,
  query: vi.fn((...segments: unknown[]) => ({ segments })),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn((...segments: unknown[]) => ({ segments })),
}));
vi.mock("./firebase", () => ({
  auth: {
    currentUser: {
      uid: "user-1",
      email: "person@example.com",
      emailVerified: true,
    },
  },
  firestore: {},
}));

import { findGroupByCode } from "./db";

describe("findGroupByCode", () => {
  beforeEach(() => {
    getDoc.mockReset();
    getDocs.mockReset().mockResolvedValue({ docs: [] });
  });

  it("distinguishes an invalid code", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(findGroupByCode("XXXXX")).resolves.toEqual({ status: "invalid-code" });
  });

  it("does not report success when the current user has no membership", async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ groupId: "group-1" }) })
      .mockResolvedValueOnce({ exists: () => false });

    await expect(findGroupByCode("ABCDE")).resolves.toEqual({ status: "not-invited" });
  });

  it("returns the group only after membership exists", async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ groupId: "group-1" }) })
      .mockResolvedValueOnce({ exists: () => true });

    await expect(findGroupByCode("ABCDE")).resolves.toEqual({
      status: "joined",
      id: "group-1",
    });
  });
});
