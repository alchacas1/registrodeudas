import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Group, Member, Debt, DebtSummary } from './types.tsx';
import { getGroup, setGroup, findGroupByCode, getGroups } from './store';

const router = Router();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#264653', '#6A4C93', '#1982C4', '#8AC926'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function computeSummaries(group: Group): DebtSummary[] {
  const summaries: Record<string, DebtSummary> = {};
  for (const m of group.members) {
    summaries[m.id] = { memberId: m.id, memberName: m.name, owes: 0, isOwed: 0, netBalance: 0 };
  }
  for (const d of group.debts) {
    if (d.status === 'pagada') continue;
    const remaining = d.amount - d.paidAmount;
    if (summaries[d.debtorId]) summaries[d.debtorId].owes += remaining;
    if (summaries[d.lenderId]) summaries[d.lenderId].isOwed += remaining;
  }
  for (const s of Object.values(summaries)) {
    s.netBalance = s.isOwed - s.owes;
  }
  return Object.values(summaries);
}

// Create group
router.post('/groups', (req: Request, res: Response) => {
  const { name, type, description } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name y type son requeridos' });

  const group: Group = {
    id: uuidv4(),
    name,
    type,
    description,
    members: [],
    debts: [],
    createdAt: new Date().toISOString(),
    accessCode: generateCode(),
  };
  setGroup(group);
  res.status(201).json(group);
});

// Get all groups (for listing)
router.get('/groups', (_req: Request, res: Response) => {
  const groups = Object.values(getGroups()).map(g => ({
    id: g.id, name: g.name, type: g.type, membersCount: g.members.length,
    debtsCount: g.debts.length, accessCode: g.accessCode, createdAt: g.createdAt,
  }));
  res.json(groups);
});

// Get group by ID
router.get('/groups/:id', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  res.json({ ...group, summaries: computeSummaries(group) });
});

// Join by code
router.post('/groups/join', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Código requerido' });
  const group = findGroupByCode(code);
  if (!group) return res.status(404).json({ error: 'Código inválido' });
  res.json({ groupId: group.id, name: group.name });
});

// Add member
router.post('/groups/:id/members', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (group.members.some(m => m.name.toLowerCase() === name.toLowerCase()))
    return res.status(409).json({ error: 'Ya existe un miembro con ese nombre' });

  const member: Member = {
    id: uuidv4(), name, email,
    avatar: getAvatarColor(name),
    joinedAt: new Date().toISOString(),
  };
  group.members.push(member);
  setGroup(group);
  res.status(201).json(member);
});

// Remove member
router.delete('/groups/:id/members/:memberId', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  const hasDebts = group.debts.some(
    d => (d.debtorId === req.params.memberId || d.lenderId === req.params.memberId) && d.status !== 'pagada'
  );
  if (hasDebts) return res.status(400).json({ error: 'El miembro tiene deudas pendientes' });
  group.members = group.members.filter(m => m.id !== req.params.memberId);
  setGroup(group);
  res.json({ ok: true });
});

// Add debt
router.post('/groups/:id/debts', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  const { debtorId, lenderId, amount, currency, reason, date } = req.body;
  if (!debtorId || !lenderId || !amount || !reason)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  if (debtorId === lenderId)
    return res.status(400).json({ error: 'Deudor y prestamista no pueden ser la misma persona' });
  if (!group.members.find(m => m.id === debtorId) || !group.members.find(m => m.id === lenderId))
    return res.status(400).json({ error: 'Miembro no encontrado en el grupo' });

  const debt: Debt = {
    id: uuidv4(), debtorId, lenderId,
    amount: parseFloat(amount),
    currency: currency || 'CRC',
    reason, date: date || new Date().toISOString().split('T')[0],
    status: 'pendiente', paidAmount: 0,
    createdAt: new Date().toISOString(),
  };
  group.debts.push(debt);
  setGroup(group);
  res.status(201).json(debt);
});

// Update debt (pay/partial)
router.patch('/groups/:id/debts/:debtId', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  const debt = group.debts.find(d => d.id === req.params.debtId);
  if (!debt) return res.status(404).json({ error: 'Deuda no encontrada' });
  const { paidAmount, status } = req.body;
  if (paidAmount !== undefined) {
    debt.paidAmount = parseFloat(paidAmount);
    debt.status = debt.paidAmount >= debt.amount ? 'pagada' : debt.paidAmount > 0 ? 'parcial' : 'pendiente';
  }
  if (status) debt.status = status;
  setGroup(group);
  res.json(debt);
});

// Delete debt
router.delete('/groups/:id/debts/:debtId', (req: Request, res: Response) => {
  const group = getGroup(req.params.id as string);
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  group.debts = group.debts.filter(d => d.id !== req.params.debtId);
  setGroup(group);
  res.json({ ok: true });
});

export default router;
