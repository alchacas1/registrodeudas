
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Group, GroupType, Member, Debt } from './types.tsx';
import { getGroups, setGroup, findGroupByCode } from './store.tsx';

function generateCode(length = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const values = crypto.getRandomValues(new Uint8Array(length));

  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }

  return result;
}

function computeSummaries(group: Group): { memberId: string, memberName: string, owes: number, isOwed: number, netBalance: number }[] {
  const summaries: Record<string, { memberId: string, memberName: string, owes: number, isOwed: number, netBalance: number }> = {};
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

function computeDebtBetween(debtorId: string, lenderId: string, debts: Debt[]): number {
  return debts
    .filter(d => d.debtorId === debtorId && d.lenderId === lenderId && d.status !== 'pagada')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-rose-500',
    'bg-teal-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-400',
    'bg-fuchsia-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-violet-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function normalizeAvatarClass(avatar: string | undefined, name: string): string {
  if (!avatar) return getAvatarColor(name);
  if (avatar.startsWith('bg-')) return avatar;
  if (avatar.startsWith('#')) return getAvatarColor(name);
  return getAvatarColor(name);
}

function currencySymbol(currency: string): string {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  return '₡';
}

function Home({ onCreateGroup }: { onCreateGroup: (name: string, type: GroupType, description?: string) => string }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('amigos');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (name) {
      const groupId = onCreateGroup(name, type, description);
      navigate(`/group/${groupId}`);
      setName('');
      setDescription('');
      setShowDescription(false);
    }
  };

  const handleJoin = () => {
    if (code) {
      const group = findGroupByCode(code.toUpperCase());
      if (group) {
        navigate(`/group/${group.id}`);
      } else {
        alert('Código inválido');
      }
      setCode('');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-100 flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-300/40 to-sky-300/40 blur-3xl" />
        <div className="absolute -bottom-48 right-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-violet-300/30 to-fuchsia-300/30 blur-3xl" />
      </div>
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent">Registro de Deudas</h1>
          <p className="text-gray-700">Gestiona tus deudas de forma simple y clara</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 space-y-8 ring-1 ring-slate-200/60">
          {/* Create Group - Primary Action */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Crear Grupo</h2>
              <p className="text-gray-500 text-sm">Empieza un nuevo registro de deudas</p>
            </div>

            <div className="space-y-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del grupo"
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-semibold"
              />

              <select
                value={type}
                onChange={e => setType(e.target.value as GroupType)}
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              >
                <option value="familia">Familia</option>
                <option value="amigos">Amigos</option>
                <option value="conocidos">Conocidos</option>
                <option value="otros">Otros</option>
              </select>

              {!showDescription && (
                <button
                  onClick={() => setShowDescription(true)}
                  className="w-full rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  + Agregar descripción
                </button>
              )}

              {showDescription && (
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}

              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 shadow-sm hover:shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg transition-all"
              >
                Crear Grupo
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>

          {/* Join Group - Secondary Action */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-1">Unirse a Grupo</h2>
              <p className="text-gray-500 text-sm">Ingresa con un código de acceso</p>
            </div>

            <div className="space-y-3">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="A B C D E"
                maxLength={5}
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono text-2xl tracking-widest uppercase"
              />

              <button
                onClick={handleJoin}
                disabled={!code.trim()}
                className="w-full rounded-xl border border-indigo-200 bg-white text-indigo-900 py-3 hover:bg-indigo-50 shadow-sm hover:shadow disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Unirse
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupPage({ groups, onUpdateGroup }: { groups: Record<string, Group>, onUpdateGroup: (group: Group) => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const group = id ? groups[id] : null;
  const [memberName, setMemberName] = useState('');
  const [debtDebtor, setDebtDebtor] = useState('');
  const [debtLender, setDebtLender] = useState('');
  const [debtAmount, setDebtAmount] = useState(0);
  const [debtCurrency, setDebtCurrency] = useState('CRC');
  const [debtReason, setDebtReason] = useState('');
  const [searchDebtor, setSearchDebtor] = useState('');
  const [searchLender, setSearchLender] = useState('');
  const [totalDebt, setTotalDebt] = useState(0);

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Grupo no encontrado</h1>
          <p className="text-gray-600 mt-2">El enlace puede estar incorrecto o el grupo ya no existe.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const summaries = computeSummaries(group);

  const handleSearch = () => {
    if (searchDebtor && searchLender) {
      const total = computeDebtBetween(searchDebtor, searchLender, group.debts);
      setTotalDebt(total);
    }
  };

  const addMember = () => {
    if (memberName) {
      const member: Member = {
        id: uuidv4(),
        name: memberName,
        avatar: getAvatarColor(memberName),
        joinedAt: new Date().toISOString(),
      };
      const updated = { ...group, members: [...group.members, member] };
      onUpdateGroup(updated);
      setMemberName('');
    }
  };

  const addDebt = () => {
    if (debtDebtor && debtLender && debtAmount > 0) {
      const debt: Debt = {
        id: uuidv4(),
        debtorId: debtDebtor,
        lenderId: debtLender,
        amount: debtAmount,
        currency: debtCurrency,
        reason: debtReason,
        date: new Date().toISOString(),
        status: 'pendiente',
        paidAmount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = { ...group, debts: [...group.debts, debt] };
      onUpdateGroup(updated);
      setDebtDebtor('');
      setDebtLender('');
      setDebtAmount(0);
      setDebtReason('');
    }
  };

  const totalOwes = summaries.reduce((sum, s) => sum + s.owes, 0);
  const totalIsOwed = summaries.reduce((sum, s) => sum + s.isOwed, 0);
  const totalNet = totalIsOwed - totalOwes;
  const activeDebts = group.debts.filter(d => d.status !== 'pagada');

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-56 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-sky-200/40 to-indigo-200/40 blur-3xl" />
        <div className="absolute -bottom-56 -right-40 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tr from-violet-200/35 to-fuchsia-200/35 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 relative">
        {/* HEADER */}
        <div className="rounded-2xl shadow-lg overflow-hidden ring-1 ring-slate-200/60">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors self-start"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-semibold">Volver</span>
              </button>

              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">{group.name}</h1>
                <div className="mt-2 inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/90 capitalize">
                  {group.type}
                </div>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-sm text-white/80">Código de acceso</p>
                <button
                  onClick={() => navigator.clipboard.writeText(group.accessCode)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-mono text-lg font-semibold text-white hover:bg-white/20 transition-colors"
                  title="Copiar código"
                >
                  {group.accessCode}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white px-6 py-4">
            {group.description?.trim() ? (
              <p className="text-gray-600">{group.description}</p>
            ) : (
              <p className="text-gray-500 text-sm">Sin descripción</p>
            )}
          </div>
        </div>

        {/* KPI ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border-t-4 border-slate-500 ring-1 ring-slate-200/60 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Miembros</p>
              <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20a5 5 0 0 0-10 0" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-gray-900">{group.members.length}</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border-t-4 border-red-500 ring-1 ring-slate-200/60 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Deudas activas</p>
              <div className="h-9 w-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-gray-900">{activeDebts.length}</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border-t-4 border-rose-500 ring-1 ring-slate-200/60 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Debes en total</p>
              <div className="h-9 w-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-red-700">
              <span className="align-top text-sm font-semibold">₡</span>
              <span className="ml-0.5">{totalOwes.toFixed(0)}</span>
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border-t-4 border-emerald-500 ring-1 ring-slate-200/60 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Te deben en total</p>
              <div className="h-9 w-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-green-700">
              <span className="align-top text-sm font-semibold">₡</span>
              <span className="ml-0.5">{totalIsOwed.toFixed(0)}</span>
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border-t-4 border-indigo-500 ring-1 ring-slate-200/60 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Saldo neto</p>
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  totalNet > 0 ? 'bg-green-50 text-green-700' : totalNet < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                }`}
                aria-hidden="true"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19V5m0 14h16" />
                </svg>
              </div>
            </div>
            <p
              className={`mt-2 text-2xl font-extrabold ${
                totalNet > 0 ? 'text-green-700' : totalNet < 0 ? 'text-red-700' : 'text-slate-700'
              }`}
            >
              {totalNet < 0 ? <span className="align-top text-sm font-semibold mr-1">-</span> : null}
              <span className="align-top text-sm font-semibold">₡</span>
              <span className="ml-0.5">{Math.abs(totalNet).toFixed(0)}</span>
            </p>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CONTENT */}
          <div className="lg:col-span-2 space-y-6">
            {/* DEUDAS */}
            <div className="bg-white rounded-2xl shadow-lg p-6 ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-700" aria-hidden="true">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Deudas Activas</h2>
                </div>
                <span className="text-sm text-gray-500">{activeDebts.length} activas</span>
              </div>

              {activeDebts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-lg font-semibold text-gray-700">No hay deudas registradas</p>
                  <p className="text-sm mt-1">Agrega una deuda para comenzar</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeDebts.map(d => {
                    const debtor = group.members.find(m => m.id === d.debtorId);
                    const lender = group.members.find(m => m.id === d.lenderId);
                    const symbol = currencySymbol(d.currency);
                    const remaining = d.amount - d.paidAmount;
                    return (
                      <div key={d.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm border-l-4 border-l-red-400">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {debtor?.name} <span className="text-gray-400">a</span> {lender?.name}
                            </p>
                            {d.reason?.trim() ? (
                              <p className="mt-1 text-sm text-gray-600">
                                <span className="font-medium text-gray-700">Motivo:</span> {d.reason}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-gray-400">Sin motivo</p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-700">
                              <span className="align-top text-sm font-semibold">{symbol}</span>
                              <span className="ml-0.5">{remaining.toFixed(0)}</span>
                            </p>
                            <p className="text-xs text-gray-500">{d.currency}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ESTADO DE SALDOS */}
            <div className="bg-white rounded-2xl shadow-lg p-6 ring-1 ring-slate-200/60">
              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19V5m0 14h16" />
                  </svg>
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Estado de Saldos</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {summaries.map(s => (
                  <div key={s.memberId} className="rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${normalizeAvatarClass(group.members.find(m => m.id === s.memberId)?.avatar, s.memberName)}`}
                      ></div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-gray-900 truncate">{s.memberName}</p>
                        <p className="text-xs text-gray-500">Saldo neto</p>
                      </div>

                      <div className="ml-auto">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${
                            s.netBalance > 0
                              ? 'bg-green-100 text-green-800'
                              : s.netBalance < 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          ₡{s.netBalance.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-gray-500">Debe</p>
                        <p className={`font-bold ${s.owes > 0 ? 'text-red-600' : 'text-gray-400'}`}>₡{s.owes.toFixed(0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-gray-500">Le deben</p>
                        <p className={`font-bold ${s.isOwed > 0 ? 'text-green-600' : 'text-gray-400'}`}>₡{s.isOwed.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIONS SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500 ring-1 ring-slate-200/60">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Miembro</h3>
              <div className="space-y-3">
                <input
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="Nombre del miembro"
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addMember}
                  disabled={!memberName.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 shadow-sm hover:shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-all"
                >
                  Agregar Miembro
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-gray-700">Miembros actuales</h4>
                <div className="grid grid-cols-3 gap-2">
                  {group.members.map(m => (
                    <div key={m.id} className="rounded-xl bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-200/60 px-2 py-2">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className={`w-7 h-7 rounded-full ${normalizeAvatarClass(m.avatar, m.name)}`}></div>
                        <span className="text-xs font-semibold text-slate-700 truncate w-full text-center">{m.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-purple-500 ring-1 ring-slate-200/60">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Deuda</h3>
              <div className="space-y-3">
                <select
                  value={debtDebtor}
                  onChange={e => setDebtDebtor(e.target.value)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">¿Quién debe?</option>
                  {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                  value={debtLender}
                  onChange={e => setDebtLender(e.target.value)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">¿A quién le deben?</option>
                  {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={debtAmount || ''}
                    onChange={e => setDebtAmount(Number(e.target.value))}
                    placeholder="Monto"
                    className="flex-1 rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={debtCurrency}
                    onChange={e => setDebtCurrency(e.target.value)}
                    className="px-3 py-3 rounded-xl bg-white text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CRC">₡</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                  </select>
                </div>
                <input
                  value={debtReason}
                  onChange={e => setDebtReason(e.target.value)}
                  placeholder="¿Por qué? (opcional)"
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={addDebt}
                  disabled={!debtDebtor || !debtLender || debtAmount <= 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  + Agregar Gasto
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-indigo-500 ring-1 ring-slate-200/60">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Buscar Deuda</h3>
              <div className="space-y-3">
                <select
                  value={searchDebtor}
                  onChange={e => setSearchDebtor(e.target.value)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar deudor</option>
                  {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                  value={searchLender}
                  onChange={e => setSearchLender(e.target.value)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar prestamista</option>
                  {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button
                  onClick={handleSearch}
                  disabled={!searchDebtor || !searchLender}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 shadow-sm hover:shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-all"
                >
                  Buscar
                </button>
                {totalDebt > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-center font-bold text-green-800 text-lg">
                      Deuda total: ₡{totalDebt.toFixed(0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TOTAL GENERAL */}
        <div
          className={`mt-8 rounded-3xl shadow-xl p-8 border bg-gradient-to-br from-white to-slate-50 ${
            totalNet > 0 ? 'border-green-200' : totalNet < 0 ? 'border-red-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                totalNet > 0 ? 'bg-green-100 text-green-700' : totalNet < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
              }`}
              aria-hidden="true"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19V5m0 14h16M7 15l3-3 2 2 5-6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Total General</h2>
          </div>

          <div className="text-center">
            <p
              className={`text-6xl font-extrabold tracking-tighter ${
                totalNet > 0 ? 'text-green-700' : totalNet < 0 ? 'text-red-700' : 'text-slate-700'
              }`}
            >
              {totalNet < 0 ? <span className="align-top text-2xl font-bold mr-1">-</span> : null}
              <span className="align-top text-2xl font-bold">₡</span>
              <span className="ml-1">{Math.abs(totalNet).toFixed(0)}</span>
            </p>
            <p className="text-gray-500 mt-1">Saldo Neto Total</p>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Debes en total</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                <span className="align-top text-sm font-semibold">₡</span>
                <span className="ml-0.5">{totalOwes.toFixed(0)}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Te deben en total</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                <span className="align-top text-sm font-semibold">₡</span>
                <span className="ml-0.5">{totalIsOwed.toFixed(0)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [groups, setGroups] = useState<Record<string, Group>>({});

  useEffect(() => {
    setGroups(getGroups());
  }, []);

  const createGroup = (name: string, type: GroupType, description?: string) => {
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
    setGroups(prev => ({ ...prev, [group.id]: group }));
    return group.id;
  };

  const updateGroup = (group: Group) => {
    setGroup(group);
    setGroups(prev => ({ ...prev, [group.id]: group }));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home onCreateGroup={createGroup} />} />
        <Route path="/group/:id" element={<GroupPage groups={groups} onUpdateGroup={updateGroup} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
