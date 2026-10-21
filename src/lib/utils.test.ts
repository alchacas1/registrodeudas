import { describe, expect, it } from "vitest";
import type { Group } from "../types";
import {
  avatarColors,
  buildSplitDebts,
  computeDebtBetween,
  computeGroupPendingTotals,
  computeMutualDebt,
  computePersonalBalances,
  computeSummaries,
  currencySymbol,
  fmt,
  formatCreatedAt,
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

describe("currency-safe balance summaries", () => {
  it("keeps personal balances separated by currency", () => {
    const group: Group = {
      ...baseGroup,
      members: baseGroup.members.map((member) =>
        member.id === "ana" ? { ...member, userId: "ana-user" } : member,
      ),
      debts: [
        baseGroup.debts[0],
        {
          ...baseGroup.debts[0],
          id: "usd-receivable",
          debtorId: "luis",
          lenderId: "ana",
          amount: 12,
          paidAmount: 2,
          currency: "USD",
        },
      ],
    };

    expect(computePersonalBalances(group, "ana")).toEqual([
      { currency: "CRC", owes: 7500, isOwed: 0, net: -7500 },
      { currency: "USD", owes: 0, isOwed: 10, net: 10 },
    ]);
  });

  it("returns normalized zero and never a negative zero", () => {
    const balancedGroup: Group = {
      ...baseGroup,
      debts: [
        { ...baseGroup.debts[0], amount: 5000, paidAmount: 0 },
        {
          ...baseGroup.debts[0],
          id: "reverse",
          debtorId: "luis",
          lenderId: "ana",
          amount: 5000,
          paidAmount: 0,
        },
      ],
    };

    const [balance] = computePersonalBalances(balancedGroup, "ana");
    expect(balance.net).toBe(0);
    expect(Object.is(balance.net, -0)).toBe(false);
    expect(fmt(-0)).toBe("0");
  });

  it("reports group pending totals per currency", () => {
    const mixedCurrencyGroup: Group = {
      ...baseGroup,
      debts: [
        baseGroup.debts[0],
        {
          ...baseGroup.debts[0],
          id: "usd",
          amount: 14,
          paidAmount: 2,
          currency: "USD",
        },
      ],
    };

    expect(computeGroupPendingTotals(mixedCurrencyGroup)).toEqual([
      { currency: "CRC", amount: 7500 },
      { currency: "USD", amount: 12 },
    ]);
  });
});

describe("computeMutualDebt", () => {
  it("compensates mutual balances in the selected currency", () => {
    const debts = [
      {
        ...baseGroup.debts[0],
        id: "a-to-b",
        debtorId: "ana",
        lenderId: "luis",
        amount: 10500,
        paidAmount: 0,
      },
      {
        ...baseGroup.debts[0],
        id: "b-to-a",
        debtorId: "luis",
        lenderId: "ana",
        amount: 5000,
        paidAmount: 0,
      },
    ];

    expect(computeMutualDebt("ana", "luis", "CRC", debts)).toEqual({
      personAToB: 10500,
      personBToA: 5000,
      debtorId: "ana",
      lenderId: "luis",
      amount: 5500,
    });
  });

  it("uses remaining partial balances and ignores paid debts and other currencies", () => {
    const debts = [
      {
        ...baseGroup.debts[0],
        id: "partial-crc",
        debtorId: "ana",
        lenderId: "luis",
        amount: 10000,
        paidAmount: 2500,
        status: "parcial" as const,
      },
      {
        ...baseGroup.debts[0],
        id: "paid-crc",
        debtorId: "ana",
        lenderId: "luis",
        amount: 9000,
        paidAmount: 0,
        status: "pagada" as const,
      },
      {
        ...baseGroup.debts[0],
        id: "usd",
        debtorId: "luis",
        lenderId: "ana",
        amount: 7000,
        paidAmount: 0,
        currency: "USD",
      },
    ];

    expect(computeMutualDebt("ana", "luis", "CRC", debts)).toEqual({
      personAToB: 7500,
      personBToA: 0,
      debtorId: "ana",
      lenderId: "luis",
      amount: 7500,
    });
  });

  it("returns no debtor when both balances compensate completely", () => {
    const debts = [
      {
        ...baseGroup.debts[0],
        id: "a-to-b",
        debtorId: "ana",
        lenderId: "luis",
        amount: 5000,
        paidAmount: 0,
      },
      {
        ...baseGroup.debts[0],
        id: "b-to-a",
        debtorId: "luis",
        lenderId: "ana",
        amount: 5000,
        paidAmount: 0,
      },
    ];

    expect(computeMutualDebt("ana", "luis", "CRC", debts)).toEqual({
      personAToB: 5000,
      personBToA: 5000,
      debtorId: null,
      lenderId: null,
      amount: 0,
    });
  });
});

describe("buildSplitDebts", () => {
  it("includes the lender in the split by default without creating a self-debt", () => {
    expect(buildSplitDebts(15000, "ana", ["luis", "maria"])).toEqual([
      { debtorId: "luis", lenderId: "ana", amount: 5000 },
      { debtorId: "maria", lenderId: "ana", amount: 5000 },
    ]);
  });

  it("excludes the lender from the split when requested", () => {
    expect(
      buildSplitDebts(9000, "ana", ["ana", "luis", "maria"], {
        excludeLender: true,
      }),
    ).toEqual([
      { debtorId: "luis", lenderId: "ana", amount: 4500 },
      { debtorId: "maria", lenderId: "ana", amount: 4500 },
    ]);
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

describe("formatCreatedAt", () => {
  it("formats an ISO timestamp as Costa Rican local date and time", () => {
    expect(formatCreatedAt("2026-10-10T21:45:00.000Z")).toBe(
      "10 oct 2026, 3:45 p. m.",
    );
  });
});
