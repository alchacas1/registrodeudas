import type { Debt, Group, DebtSummary } from "../types";

export function computeSummaries(group: Group): DebtSummary[] {
  const sums: Record<string, DebtSummary> = {};
  for (const member of group.members) {
    sums[member.id] = {
      memberId: member.id,
      memberName: member.name,
      owes: 0,
      isOwed: 0,
      netBalance: 0,
    };
  }

  for (const debt of group.debts) {
    if (debt.status === "pagada") continue;
    const remaining = debt.amount - debt.paidAmount;
    if (sums[debt.debtorId]) sums[debt.debtorId].owes += remaining;
    if (sums[debt.lenderId]) sums[debt.lenderId].isOwed += remaining;
  }

  for (const summary of Object.values(sums)) {
    summary.netBalance = summary.isOwed - summary.owes;
  }
  return Object.values(sums);
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface PersonalCurrencyBalance {
  currency: string;
  owes: number;
  isOwed: number;
  net: number;
}

function remainingDebt(debt: Debt): number {
  return Math.max(0, debt.amount - debt.paidAmount);
}

export function computeGroupPendingTotals(group: Group): CurrencyAmount[] {
  const totals = new Map<string, number>();

  for (const debt of group.debts) {
    if (debt.status === "pagada") continue;
    const remaining = remainingDebt(debt);
    if (remaining === 0) continue;
    totals.set(debt.currency, (totals.get(debt.currency) ?? 0) + remaining);
  }

  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

export function computePersonalBalances(
  group: Group,
  memberId: string | undefined,
): PersonalCurrencyBalance[] {
  if (!memberId) return [];

  const balances = new Map<string, { owes: number; isOwed: number }>();
  for (const debt of group.debts) {
    if (debt.status === "pagada") continue;
    const remaining = remainingDebt(debt);
    if (remaining === 0) continue;

    if (debt.debtorId === memberId || debt.lenderId === memberId) {
      const balance = balances.get(debt.currency) ?? { owes: 0, isOwed: 0 };
      if (debt.debtorId === memberId) balance.owes += remaining;
      if (debt.lenderId === memberId) balance.isOwed += remaining;
      balances.set(debt.currency, balance);
    }
  }

  return [...balances].map(([currency, balance]) => {
    const net = balance.isOwed - balance.owes;
    return {
      currency,
      owes: balance.owes,
      isOwed: balance.isOwed,
      net: net === 0 ? 0 : net,
    };
  });
}

export function computeDebtBetween(
  debtorId: string,
  lenderId: string,
  debts: Debt[],
): number {
  return debts
    .filter(
      (debt) =>
        debt.debtorId === debtorId &&
        debt.lenderId === lenderId &&
        debt.status !== "pagada",
    )
    .reduce((sum, debt) => sum + (debt.amount - debt.paidAmount), 0);
}

export interface MutualDebtComparison {
  personAToB: number;
  personBToA: number;
  debtorId: string | null;
  lenderId: string | null;
  amount: number;
}

export function computeMutualDebt(
  personAId: string,
  personBId: string,
  currency: string,
  debts: Debt[],
): MutualDebtComparison {
  const remainingBetween = (debtorId: string, lenderId: string) =>
    debts
      .filter(
        (debt) =>
          debt.debtorId === debtorId &&
          debt.lenderId === lenderId &&
          debt.currency === currency &&
          debt.status !== "pagada",
      )
      .reduce(
        (sum, debt) => sum + Math.max(0, debt.amount - debt.paidAmount),
        0,
      );

  const personAToB = remainingBetween(personAId, personBId);
  const personBToA = remainingBetween(personBId, personAId);
  const netAmount = personAToB - personBToA;

  return {
    personAToB,
    personBToA,
    debtorId: netAmount === 0 ? null : netAmount > 0 ? personAId : personBId,
    lenderId: netAmount === 0 ? null : netAmount > 0 ? personBId : personAId,
    amount: Math.abs(netAmount),
  };
}

export function buildSplitDebts(
  totalAmount: number,
  lenderId: string,
  debtorIds: string[],
  options: { excludeLender?: boolean } = {},
): { debtorId: string; lenderId: string; amount: number }[] {
  const uniqueDebtorIds = [...new Set(debtorIds)].filter(
    (debtorId) => debtorId && debtorId !== lenderId,
  );
  if (!totalAmount || totalAmount <= 0 || !lenderId || uniqueDebtorIds.length === 0) {
    return [];
  }

  const participantCount =
    uniqueDebtorIds.length + (options.excludeLender ? 0 : 1);
  const amount = totalAmount / participantCount;
  return uniqueDebtorIds.map((debtorId) => ({ debtorId, lenderId, amount }));
}

const AVATAR_COLORS: [string, string][] = [
  ["#7c6dfa", "#4c3fd6"],
  ["#4ade80", "#22a85a"],
  ["#f87171", "#d94040"],
  ["#fbbf24", "#d97706"],
  ["#60a5fa", "#2563eb"],
  ["#c084fc", "#9333ea"],
  ["#34d399", "#059669"],
  ["#fb923c", "#ea580c"],
];

export function avatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function currencySymbol(currency: string): string {
  return currency === "USD" ? "$" : currency === "EUR" ? "\u20ac" : "\u20a1";
}

export function fmt(value: number): string {
  const normalized = value === 0 ? 0 : value;
  return normalized.toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  })
    .format(new Date(createdAt))
    .replace(/\u00a0/g, " ");
}
