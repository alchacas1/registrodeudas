export type GroupType = "familia" | "amigos" | "conocidos" | "otros";

export type DebtStatus = "pendiente" | "pagada" | "parcial";

export interface Member {
  id: string;
  name: string;
  email: string | null;
  userId?: string; // se llena cuando el miembro entra con su magic link
  avatar: string; // initials-based color (legacy, ya no se usa para render)
  joinedAt: string;
}

export interface Debt {
  id: string;
  debtorId: string; // quien debe
  lenderId: string; // quien prestó
  amount: number;
  currency: string;
  reason: string;
  date: string;
  status: DebtStatus;
  paidAmount: number;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  description?: string;
  members: Member[];
  debts: Debt[];
  createdAt: string;
  accessCode: string; // código simple para unirse
}

export interface DebtSummary {
  memberId: string;
  memberName: string;
  owes: number;
  isOwed: number;
  netBalance: number;
}
