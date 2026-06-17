import { supabase } from "./supabase";
import type { Group, Member, Debt, GroupType, DebtStatus } from "../types";

type MemberRow = {
  id: string;
  group_id: string;
  name: string;
  email: string;
  user_id: string | null;
  joined_at: string;
};

type DebtRow = {
  id: string;
  group_id: string;
  debtor_id: string;
  lender_id: string;
  amount: number;
  currency: string;
  reason: string | null;
  date: string;
  status: DebtStatus;
  paid_amount: number;
  created_at: string;
};

type GroupRow = {
  id: string;
  name: string;
  type: GroupType;
  description: string | null;
  access_code: string;
  created_at: string;
};

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    userId: row.user_id ?? undefined,
    avatar: "",
    joinedAt: row.joined_at,
  };
}

function mapDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    debtorId: row.debtor_id,
    lenderId: row.lender_id,
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason ?? "",
    date: row.date,
    status: row.status,
    paidAmount: Number(row.paid_amount),
    createdAt: row.created_at,
  };
}

function mapGroup(row: GroupRow, members: Member[], debts: Debt[]): Group {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? undefined,
    members,
    debts,
    createdAt: row.created_at,
    accessCode: row.access_code,
  };
}

function generateCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) result += chars[values[i] % chars.length];
  return result;
}

/** Crea un grupo nuevo. Reintenta si el código de acceso generado choca. */
export async function createGroup(
  name: string,
  type: GroupType,
  description?: string,
): Promise<Group> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const accessCode = generateCode();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name, type, description, access_code: accessCode })
      .select()
      .single();

    if (!error && data) return mapGroup(data, [], []);
    if (error && error.code !== "23505") throw error; // no es duplicado de código
  }
  throw new Error("No se pudo generar un código de acceso único.");
}

export async function findGroupByCode(
  code: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("id")
    .eq("access_code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Trae un grupo completo con sus miembros y deudas. */
export async function getFullGroup(id: string): Promise<Group | null> {
  const [groupRes, memberRes, debtRes] = await Promise.all([
    supabase.from("groups").select("*").eq("id", id).maybeSingle(),
    supabase.from("members").select("*").eq("group_id", id).order("joined_at"),
    supabase.from("debts").select("*").eq("group_id", id).order("created_at"),
  ]);

  if (groupRes.error) throw groupRes.error;
  if (!groupRes.data) return null;
  if (memberRes.error) throw memberRes.error;
  if (debtRes.error) throw debtRes.error;

  const members = (memberRes.data ?? []).map(mapMember);
  const debts = (debtRes.data ?? []).map(mapDebt);
  return mapGroup(groupRes.data, members, debts);
}

/** Agrega un miembro y le envía un magic link a su correo. */
export async function addMember(
  groupId: string,
  name: string,
  email: string,
  redirectTo: string,
): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ group_id: groupId, name, email: email.toLowerCase() })
    .select()
    .single();
  if (error) throw error;

  // Si el correo ya tiene cuenta simplemente recibe un link para entrar;
  // si no, Supabase Auth crea el usuario al verificar el link.
  await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });

  return mapMember(data);
}

export async function addDebt(
  groupId: string,
  debtorId: string,
  lenderId: string,
  amount: number,
  currency: string,
  reason: string,
): Promise<Debt> {
  const { data, error } = await supabase
    .from("debts")
    .insert({
      group_id: groupId,
      debtor_id: debtorId,
      lender_id: lenderId,
      amount,
      currency,
      reason,
      status: "pendiente",
      paid_amount: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapDebt(data);
}

/**
 * Marca una deuda como pagada. La política RLS solo deja pasar el update
 * si el usuario autenticado es el deudor o el prestamista de esa deuda;
 * si no tiene permiso, no se actualiza ninguna fila y lanzamos un error.
 */
export async function markDebtPaid(debtId: string, amount: number): Promise<Debt> {
  const { data, error } = await supabase
    .from("debts")
    .update({ status: "pagada", paid_amount: amount })
    .eq("id", debtId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "No tenés permiso para confirmar esta deuda (solo el deudor o quien prestó pueden hacerlo, y debés haber iniciado sesión con tu correo).",
    );
  }
  return mapDebt(data);
}
