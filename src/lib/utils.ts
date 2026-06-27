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
  return value.toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
