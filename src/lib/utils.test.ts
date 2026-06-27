import { describe, expect, it } from "vitest";
import type { Group } from "../types";
import {
  avatarColors,
  computeDebtBetween,
  computeSummaries,
  currencySymbol,
  fmt,
} from "./utils";

const baseGroup: Group = {
  id: "group-1",
  name: "Casa",
  type: "amigos",
  members: [
    {
      id: "ana",
      name: "Ana Mora",
      email: null,
      avatar: "",
      joinedAt: "2026-01-01",
    },
    {
      id: "luis",
      name: "Luis Solis",
      email: null,
      avatar: "",
      joinedAt: "2026-01-01",
    },
    {
      id: "maria",
      name: "Maria Rojas",
      email: null,
      avatar: "",
      joinedAt: "2026-01-01",
    },
  ],
  debts: [
    {
      id: "debt-1",
      debtorId: "ana",
      lenderId: "luis",
      amount: 10000,
      currency: "CRC",
      reason: "Cena",
      date: "2026-01-01",
      status: "pendiente",
      paidAmount: 2500,
      createdAt: "2026-01-01",
    },
    {
      id: "debt-2",
      debtorId: "luis",
      lenderId: "ana",
      amount: 3000,
      currency: "CRC",
      reason: "Taxi",
      date: "2026-01-02",
      status: "pagada",
      paidAmount: 3000,
      createdAt: "2026-01-02",
    },
    {
      id: "debt-3",
      debtorId: "maria",
      lenderId: "ana",
      amount: 5000,
      currency: "CRC",
      reason: "Compra",
      date: "2026-01-03",
      status: "parcial",
      paidAmount: 1000,
      createdAt: "2026-01-03",
    },
  ],
  createdAt: "2026-01-01",
  accessCode: "ABCDE",
};

describe("computeSummaries", () => {
  it("summarizes unpaid remaining balances for every member", () => {
    expect(computeSummaries(baseGroup)).toEqual([
      {
        memberId: "ana",
        memberName: "Ana Mora",
        owes: 7500,
        isOwed: 4000,
        netBalance: -3500,
      },
      {
        memberId: "luis",
        memberName: "Luis Solis",
        owes: 0,
        isOwed: 7500,
        netBalance: 7500,
      },
      {
        memberId: "maria",
        memberName: "Maria Rojas",
        owes: 4000,
        isOwed: 0,
        netBalance: -4000,
      },
    ]);
  });
});

describe("computeDebtBetween", () => {
  it("returns remaining unpaid debt for a debtor and lender pair", () => {
    expect(computeDebtBetween("ana", "luis", baseGroup.debts)).toBe(7500);
    expect(computeDebtBetween("luis", "ana", baseGroup.debts)).toBe(0);
  });
});

describe("avatarColors", () => {
  it("returns stable gradient colors for the same name", () => {
    expect(avatarColors("Ana Mora")).toEqual(avatarColors("Ana Mora"));
    expect(avatarColors("Ana Mora")).toHaveLength(2);
  });
});

describe("currencySymbol", () => {
  it("maps known currencies and defaults to colones", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("EUR")).toBe("\u20ac");
    expect(currencySymbol("CRC")).toBe("\u20a1");
  });
});

describe("fmt", () => {
  it("formats numbers for Costa Rican Spanish without decimals", () => {
    expect(fmt(1234567.89)).toMatch(/^1(?:[.\s\u00a0])234(?:[.\s\u00a0])568$/);
  });
});
