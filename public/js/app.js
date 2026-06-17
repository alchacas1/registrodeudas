const App = (() => {
  let currentGroup = null;
  let allDebts = [];

  // ─── UTILS ───
  const $ = id => document.getElementById(id);
  const fmt = (n, cur = 'CRC') => {
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '₡';
    return `${sym}${Number(n).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };
  const initials = name => name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const fmtDate = d => { const dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const typeColorClass = type => {
    const map = { familia: 'text-red-400', amigos: 'text-blue-400', conocidos: 'text-amber-400', otros: 'text-zinc-400' };
    return map[type] || 'text-zinc-400';
  };
  const typeBadgeColorBg = type => {
    const map = { familia: 'bg-red-500/15', amigos: 'bg-blue-500/15', conocidos: 'bg-amber-500/15', otros: 'bg-zinc-500/15' };
    return map[type] || 'bg-zinc-500/15';
  };

  function toast(msg, type = '') {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'fixed bottom-6 right-6 z-[200] bg-surface-3 text-text px-5 py-3 rounded-lg text-sm font-medium transition-all duration-250 pointer-events-none max-w-xs translate-y-0 opacity-100';
    if (type === 'success') t.className += ' border border-emerald-400 text-emerald-400';
    else if (type === 'error') t.className += ' border border-rose-400 text-rose-400';
    else t.className += ' border border-border-2';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.remove('translate-y-0', 'opacity-100');
      t.classList.add('translate-y-5', 'opacity-0');
    }, 3000);
  }

  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' }, ...opts
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    return data;
  }

  // ─── SCREENS ───
  function showScreen(id) {
    $('screen-home').classList.add('hidden');
    $('screen-home').classList.remove('flex');
    $('screen-group').classList.add('hidden');
    $('screen-group').classList.remove('flex');
    $(id).classList.remove('hidden');
    $(id).classList.add('flex');
  }

  function goHome() {
    currentGroup = null; allDebts = [];
    showScreen('screen-home');
    loadGroups();
  }

  // ─── HOME ───
  async function loadGroups() {
    try {
      const groups = await api('/groups');
      const container = $('groups-list');
      if (!groups.length) {
        container.innerHTML = `<div class="text-center py-20 px-6 text-text3 col-span-full"><div class="text-5xl mb-4 opacity-40">◎</div><p class="text-base">No tienes grupos aún.<br>Crea uno o únete con un código.</p></div>`;
        return;
      }
      const typeLabels = { familia: 'Familia', amigos: 'Amigos', conocidos: 'Conocidos', otros: 'Otros' };
      container.innerHTML = groups.map(g => `
        <div class="bg-surface-2 border border-border rounded-[14px] p-6 cursor-pointer transition-all duration-200 relative overflow-hidden hover:border-border-2 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-accent before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100" onclick="App.openGroup('${g.id}')">
          <div class="text-xs font-semibold uppercase tracking-widest mb-2 ${typeColorClass(g.type)}">${typeLabels[g.type] || g.type}</div>
          <div class="text-[1.2rem] font-bold mb-1 tracking-tight">${escape(g.name)}</div>
          <div class="font-mono text-[0.8rem] text-text3 mb-4">Código: ${g.accessCode}</div>
          <div class="flex gap-4">
            <div class="flex flex-col gap-0.5">
              <div class="text-[1.1rem] font-bold">${g.membersCount}</div>
              <div class="text-[0.72rem] text-text3 uppercase tracking-widest">Miembros</div>
            </div>
            <div class="flex flex-col gap-0.5">
              <div class="text-[1.1rem] font-bold">${g.debtsCount}</div>
              <div class="text-[0.72rem] text-text3 uppercase tracking-widest">Deudas</div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) { toast(e.message, 'error'); }
  }

  function escape(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── GROUP ───
  async function openGroup(id) {
    try {
      currentGroup = await api(`/groups/${id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen();
      showScreen('screen-group');
      switchTab('resumen');
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderGroupScreen() {
    const g = currentGroup;
    $('group-title').textContent = g.name;
    $('group-type-badge').textContent = g.type;
    $('group-type-badge').className = `text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${typeBadgeColorBg(g.type)} ${typeColorClass(g.type)}`;
    $('group-code').textContent = `Código: ${g.accessCode}`;
    renderSummary(); renderDebts(); renderMembers();
    const sel = $('filter-member');
    const cur = sel.value;
    sel.innerHTML = '<option value="all">Todos los miembros</option>' +
      g.members.map(m => `<option value="${m.id}">${escape(m.name)}</option>`).join('');
    sel.value = cur;
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => delete b.dataset.active);
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).dataset.active = 'true';
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
  }

  // ─── SUMMARY TAB ───
  function renderSummary() {
    const g = currentGroup;
    const summaries = g.summaries || [];
    const members = g.members;
    const membMap = {};
    members.forEach(m => membMap[m.id] = m);

    $('summary-cards').innerHTML = summaries.map(s => {
      const m = membMap[s.memberId]; if (!m) return '';
      const net = s.netBalance;
      const netClass = net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : '';
      const netPrefix = net > 0 ? '+' : '';
      return `
        <div class="bg-surface-2 border border-border rounded-[14px] p-5 transition-all duration-200 hover:border-border-2">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base mb-3 text-white" style="background:${m.avatar}">${initials(m.name)}</div>
          <div class="font-semibold mb-3 text-[0.95rem]">${escape(m.name)}</div>
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center">
              <span class="text-[0.75rem] text-text3">Le deben</span>
              <span class="font-mono text-[0.85rem] font-medium text-emerald-400">${fmt(s.isOwed)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[0.75rem] text-text3">Debe</span>
              <span class="font-mono text-[0.85rem] font-medium text-rose-400">${fmt(s.owes)}</span>
            </div>
            <div class="flex justify-between items-center border-t border-border pt-1.5 mt-1">
              <span class="text-[0.75rem] text-text3 font-semibold">Balance</span>
              <span class="font-mono text-[0.85rem] font-bold ${netClass}">${netPrefix}${fmt(net)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (!summaries.length) { $('balance-chart').innerHTML = ''; return; }
    const maxAbs = Math.max(...summaries.map(s => Math.abs(s.netBalance)), 1);
    $('balance-chart').innerHTML = `
      <div class="text-[0.85rem] font-semibold uppercase tracking-widest text-text3 mb-4">Balance neto por miembro</div>
      ${summaries.map(s => {
        const m = membMap[s.memberId]; if (!m) return '';
        const pct = Math.abs(s.netBalance) / maxAbs * 100;
        const pos = s.netBalance >= 0;
        return `
          <div class="flex items-center gap-3.5 mb-2.5">
            <div class="text-sm font-medium min-w-[100px]">${escape(m.name)}</div>
            <div class="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden relative">
              <div class="h-full rounded-full transition-all duration-500 ${pos ? 'bg-emerald-400' : 'bg-rose-400 ml-auto'}" style="width:${pct}%"></div>
            </div>
            <div class="font-mono text-[0.8rem] min-w-[90px] text-right ${pos ? 'text-emerald-400' : 'text-rose-400'}">${pos ? '+' : ' '}${fmt(s.netBalance)}</div>
          </div>
        `;
      }).join('')}
    `;
  }

  // ─── DEBTS TAB ───
  function renderDebts(debts) {
    const g = currentGroup;
    const membMap = {};
    g.members.forEach(m => membMap[m.id] = m);
    const list = debts || allDebts;

    if (!list.length) {
      $('debts-list').innerHTML = `<div class="text-center py-20 px-6 text-text3"><div class="text-5xl mb-4 opacity-40">✦</div><p class="text-base">No hay deudas registradas.</p></div>`;
      return;
    }

    $('debts-list').innerHTML = list.map(d => {
      const debtor = membMap[d.debtorId];
      const lender = membMap[d.lenderId];
      if (!debtor || !lender) return '';
      const remaining = d.amount - d.paidAmount;
      const pct = (d.paidAmount / d.amount * 100).toFixed(0);
      const settled = d.status === 'pagada';
      const statusColors = {
        pendiente: 'bg-amber-500/15 text-amber-400',
        parcial: 'bg-orange-500/15 text-orange-400',
        pagada: 'bg-emerald-500/15 text-emerald-400',
      };
      return `
        <div class="bg-surface-2 border border-border rounded-[14px] p-[18px_20px] grid gap-2 gap-x-4 transition-colors duration-150 hover:border-border-2 ${settled ? 'opacity-[0.55]' : ''}" style="grid-template-columns:1fr auto;grid-template-rows:auto auto">
          <div class="flex items-center gap-3">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-[0.8rem] font-bold text-white border-2 border-surface-2" style="background:${debtor.avatar}" title="${escape(debtor.name)}">${initials(debtor.name)}</div>
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-[0.8rem] font-bold text-white border-2 border-surface-2 -ml-2" style="background:${lender.avatar}" title="${escape(lender.name)}">${initials(lender.name)}</div>
            </div>
            <div class="text-sm">
              <strong class="font-semibold">${escape(debtor.name)}</strong>
              <span class="text-text2"> → </span>
              <strong class="font-semibold">${escape(lender.name)}</strong>
            </div>
          </div>

          <div class="text-right flex flex-col gap-1 items-end">
            <div class="font-mono text-[1.1rem] font-bold">${fmt(d.amount, d.currency)}</div>
            ${d.paidAmount > 0 && !settled ? `
              <div class="text-[0.75rem] text-text3">Pagado: ${fmt(d.paidAmount, d.currency)}</div>
              <div class="h-1 bg-surface-3 rounded-full overflow-hidden w-20"><div class="h-full bg-emerald-400 rounded-full transition-all duration-400" style="width:${pct}%"></div></div>
            ` : ''}
          </div>

          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[0.825rem] text-text2">📌 ${escape(d.reason)}</span>
            <span class="text-[0.78rem] text-text3 font-mono">${fmtDate(d.date)}</span>
            <span class="text-[0.7rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusColors[d.status] || 'bg-zinc-500/15 text-zinc-400'}">${d.status}</span>
          </div>

          <div class="flex gap-1.5 items-center">
            ${!settled ? `<button class="bg-surface-3 border border-border text-text2 cursor-pointer rounded-md px-2.5 py-1 text-[0.78rem] font-sans transition-all duration-150 hover:border-accent hover:text-text" onclick="App.openPayDebt('${d.id}')">Registrar pago</button>` : ''}
            <button class="bg-surface-3 border border-border text-text2 cursor-pointer rounded-md px-2.5 py-1 text-[0.78rem] font-sans transition-all duration-150 hover:border-rose-400 hover:text-rose-400" onclick="App.deleteDebt('${d.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function filterDebts() {
    const status = $('filter-status').value;
    const memberId = $('filter-member').value;
    let filtered = allDebts;
    if (status !== 'all') filtered = filtered.filter(d => d.status === status);
    if (memberId !== 'all') filtered = filtered.filter(d => d.debtorId === memberId || d.lenderId === memberId);
    renderDebts(filtered);
  }

  // ─── MEMBERS TAB ───
  function renderMembers() {
    const g = currentGroup;
    if (!g.members.length) {
      $('members-list').innerHTML = `<div class="text-center py-20 px-6 text-text3 col-span-full"><div class="text-5xl mb-4 opacity-40">👤</div><p class="text-base">No hay miembros aún.</p></div>`;
      return;
    }
    $('members-list').innerHTML = g.members.map(m => `
      <div class="bg-surface-2 border border-border rounded-[14px] p-5 flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0" style="background:${m.avatar}">${initials(m.name)}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-[0.95rem] whitespace-nowrap overflow-hidden text-ellipsis">${escape(m.name)}</div>
          ${m.email ? `<div class="text-[0.75rem] text-text3 mt-0.5">${escape(m.email)}</div>` : `<div class="text-[0.75rem] text-text3 mt-0.5">Desde ${fmtDate(m.joinedAt.split('T')[0])}</div>`}
        </div>
        <button class="bg-none border-none text-text3 cursor-pointer text-base p-1 rounded transition-colors duration-150 leading-none hover:text-rose-400" onclick="App.removeMember('${m.id}')" title="Eliminar">✕</button>
      </div>
    `).join('');
  }

  // ─── MODALS ───
  function openModal(html) {
    $('modal-content').innerHTML = html;
    $('modal-overlay').classList.remove('hidden');
    $('modal-overlay').classList.add('flex');
  }
  function closeModal() {
    $('modal-overlay').classList.remove('flex');
    $('modal-overlay').classList.add('hidden');
    $('modal-content').innerHTML = '';
  }

  function showCreateGroup() {
    openModal(`
      <div class="text-[1.2rem] font-bold mb-6 tracking-tight">Crear Grupo</div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Nombre del grupo</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-gname" placeholder="Ej: Familia Pérez, Trip NYC..." autofocus>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Tipo</label>
        <select class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-gtype">
          <option value="familia" class="bg-surface-3">👨‍👩‍👧 Familia</option>
          <option value="amigos" class="bg-surface-3">👥 Amigos</option>
          <option value="conocidos" class="bg-surface-3">🤝 Conocidos</option>
          <option value="otros" class="bg-surface-3">📁 Otros</option>
        </select>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Descripción (opcional)</label>
        <textarea class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent resize-y min-h-[80px]" id="m-gdesc" placeholder="Ej: Gastos del viaje de enero..."></textarea>
      </div>
      <div class="flex gap-2.5 justify-end mt-6">
        <button class="bg-transparent text-text border border-border-2 cursor-pointer font-sans font-medium rounded-lg transition-all duration-200 hover:bg-surface-3 hover:border-accent px-4 py-2 text-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="bg-accent text-white border-none cursor-pointer font-sans font-semibold rounded-lg transition-all duration-200 hover:bg-accent-2 px-4 py-2 text-sm" onclick="App.createGroup()">Crear Grupo</button>
      </div>
    `);
  }

  async function createGroup() {
    const name = $('m-gname').value.trim();
    const type = $('m-gtype').value;
    const description = $('m-gdesc').value.trim();
    if (!name) { toast('El nombre es requerido', 'error'); return; }
    try {
      await api('/groups', { method: 'POST', body: JSON.stringify({ name, type, description }) });
      closeModal(); toast('Grupo creado ✓', 'success'); loadGroups();
    } catch (e) { toast(e.message, 'error'); }
  }

  function showJoinGroup() {
    openModal(`
      <div class="text-[1.2rem] font-bold mb-6 tracking-tight">Unirme a un Grupo</div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Código de acceso</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent uppercase tracking-widest font-mono" id="m-jcode" placeholder="Ej: AB3F7" autofocus>
      </div>
      <div class="flex gap-2.5 justify-end mt-6">
        <button class="bg-transparent text-text border border-border-2 cursor-pointer font-sans font-medium rounded-lg transition-all duration-200 hover:bg-surface-3 hover:border-accent px-4 py-2 text-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="bg-accent text-white border-none cursor-pointer font-sans font-semibold rounded-lg transition-all duration-200 hover:bg-accent-2 px-4 py-2 text-sm" onclick="App.joinGroup()">Ir al Grupo</button>
      </div>
    `);
  }

  async function joinGroup() {
    const code = $('m-jcode').value.trim();
    if (!code) { toast('Ingresa el código', 'error'); return; }
    try {
      const r = await api('/groups/join', { method: 'POST', body: JSON.stringify({ code }) });
      closeModal(); toast(`Unido a "${r.name}"`, 'success'); openGroup(r.groupId);
    } catch (e) { toast(e.message, 'error'); }
  }

  function openAddMember() {
    openModal(`
      <div class="text-[1.2rem] font-bold mb-6 tracking-tight">Agregar Miembro</div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Nombre completo</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-mname" placeholder="Ej: María García" autofocus>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Correo (opcional)</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-memail" type="email" placeholder="maria@correo.com">
      </div>
      <div class="flex gap-2.5 justify-end mt-6">
        <button class="bg-transparent text-text border border-border-2 cursor-pointer font-sans font-medium rounded-lg transition-all duration-200 hover:bg-surface-3 hover:border-accent px-4 py-2 text-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="bg-accent text-white border-none cursor-pointer font-sans font-semibold rounded-lg transition-all duration-200 hover:bg-accent-2 px-4 py-2 text-sm" onclick="App.addMember()">Agregar</button>
      </div>
    `);
  }

  async function addMember() {
    const name = $('m-mname').value.trim();
    const email = $('m-memail').value.trim();
    if (!name) { toast('El nombre es requerido', 'error'); return; }
    try {
      await api(`/groups/${currentGroup.id}/members`, { method: 'POST', body: JSON.stringify({ name, email }) });
      currentGroup = await api(`/groups/${currentGroup.id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen();
      closeModal(); toast(`${name} agregado ✓`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function removeMember(memberId) {
    const m = currentGroup.members.find(x => x.id === memberId);
    if (!confirm(`¿Eliminar a ${m?.name} del grupo?`)) return;
    try {
      await api(`/groups/${currentGroup.id}/members/${memberId}`, { method: 'DELETE' });
      currentGroup = await api(`/groups/${currentGroup.id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen(); toast('Miembro eliminado', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  function openAddDebt() {
    const g = currentGroup;
    if (g.members.length < 2) { toast('Necesitas al menos 2 miembros para registrar una deuda', 'error'); return; }
    const memberOptions = g.members.map(m => `<option value="${m.id}" class="bg-surface-3">${escape(m.name)}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];
    openModal(`
      <div class="text-[1.2rem] font-bold mb-6 tracking-tight">Registrar Deuda</div>
      <div class="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
        <div class="mb-4">
          <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Deudor (quien debe)</label>
          <select class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-debtor">${memberOptions}</select>
        </div>
        <div class="mb-4">
          <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Prestamista (a quién)</label>
          <select class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-lender">${memberOptions}</select>
        </div>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Monto</label>
        <div class="flex">
          <select class="w-20 bg-surface-3 text-text border border-border-2 border-r-0 rounded-l-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-currency">
            <option value="CRC" class="bg-surface-3">₡ CRC</option>
            <option value="USD" class="bg-surface-3">$ USD</option>
            <option value="EUR" class="bg-surface-3">€ EUR</option>
          </select>
          <input class="flex-1 bg-surface-3 text-text border border-border-2 rounded-r-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-amount" type="number" min="1" step="any" placeholder="0">
        </div>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Motivo</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-reason" placeholder="Ej: Cena, gasolina, préstamo..." autofocus>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Fecha</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-date" type="date" value="${today}">
      </div>
      <div class="flex gap-2.5 justify-end mt-6">
        <button class="bg-transparent text-text border border-border-2 cursor-pointer font-sans font-medium rounded-lg transition-all duration-200 hover:bg-surface-3 hover:border-accent px-4 py-2 text-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="bg-accent text-white border-none cursor-pointer font-sans font-semibold rounded-lg transition-all duration-200 hover:bg-accent-2 px-4 py-2 text-sm" onclick="App.addDebt()">Registrar Deuda</button>
      </div>
    `);
    if (g.members.length >= 2) $('m-lender').selectedIndex = 1;
  }

  async function addDebt() {
    const debtorId = $('m-debtor').value;
    const lenderId = $('m-lender').value;
    const amount = $('m-amount').value;
    const currency = $('m-currency').value;
    const reason = $('m-reason').value.trim();
    const date = $('m-date').value;
    if (!amount || !reason) { toast('Completa todos los campos', 'error'); return; }
    if (debtorId === lenderId) { toast('Deudor y prestamista deben ser distintos', 'error'); return; }
    try {
      await api(`/groups/${currentGroup.id}/debts`, {
        method: 'POST',
        body: JSON.stringify({ debtorId, lenderId, amount, currency, reason, date })
      });
      currentGroup = await api(`/groups/${currentGroup.id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen();
      closeModal(); toast('Deuda registrada ✓', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  function openPayDebt(debtId) {
    const debt = allDebts.find(d => d.id === debtId);
    if (!debt) return;
    const remaining = debt.amount - debt.paidAmount;
    openModal(`
      <div class="text-[1.2rem] font-bold mb-6 tracking-tight">Registrar Pago</div>
      <div class="bg-surface-3 rounded-lg p-3.5 mb-5 text-sm text-text2">
        Deuda total: <strong class="text-text">${fmt(debt.amount, debt.currency)}</strong> |
        Pendiente: <strong class="text-amber-400">${fmt(remaining, debt.currency)}</strong>
      </div>
      <div class="mb-4">
        <label class="block text-[0.8rem] font-semibold uppercase tracking-widest text-text2 mb-2">Monto pagado (total acumulado)</label>
        <input class="w-full bg-surface-3 text-text border border-border-2 rounded-lg px-3.5 py-2.5 font-sans text-sm outline-none transition-colors duration-150 focus:border-accent" id="m-paid" type="number" min="0" max="${debt.amount}" step="any" value="${debt.paidAmount}" autofocus>
      </div>
      <div class="flex gap-2.5 justify-end mt-6">
        <button class="bg-transparent text-text border border-border-2 cursor-pointer font-sans font-medium rounded-lg transition-all duration-200 hover:bg-surface-3 hover:border-accent px-4 py-2 text-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="bg-accent text-white border-none cursor-pointer font-sans font-semibold rounded-lg transition-all duration-200 hover:bg-accent-2 px-4 py-2 text-sm" onclick="App.payDebt('${debtId}')">Guardar</button>
      </div>
    `);
  }

  async function payDebt(debtId) {
    const paidAmount = $('m-paid').value;
    try {
      await api(`/groups/${currentGroup.id}/debts/${debtId}`, {
        method: 'PATCH', body: JSON.stringify({ paidAmount })
      });
      currentGroup = await api(`/groups/${currentGroup.id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen(); filterDebts();
      closeModal(); toast('Pago actualizado ✓', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function deleteDebt(debtId) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    try {
      await api(`/groups/${currentGroup.id}/debts/${debtId}`, { method: 'DELETE' });
      currentGroup = await api(`/groups/${currentGroup.id}`);
      allDebts = currentGroup.debts;
      renderGroupScreen(); filterDebts();
      toast('Deuda eliminada', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  // ─── INIT ───
  loadGroups();

  return {
    goHome, openGroup, switchTab,
    showCreateGroup, createGroup,
    showJoinGroup, joinGroup,
    openAddMember, addMember, removeMember,
    openAddDebt, addDebt,
    openPayDebt, payDebt, deleteDebt,
    filterDebts, closeModal,
  };
})();
