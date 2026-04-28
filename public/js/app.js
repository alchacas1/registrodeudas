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

  function toast(msg, type = '') {
    const t = $('toast');
    t.textContent = msg; t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 3000);
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
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
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
        container.innerHTML = `<div class="empty-state"><div class="es-icon">◎</div><p>No tienes grupos aún.<br>Crea uno o únete con un código.</p></div>`;
        return;
      }
      const typeLabels = { familia: 'Familia', amigos: 'Amigos', conocidos: 'Conocidos', otros: 'Otros' };
      container.innerHTML = groups.map(g => `
        <div class="group-card type-${g.type}" onclick="App.openGroup('${g.id}')">
          <div class="gc-type">${typeLabels[g.type] || g.type}</div>
          <div class="gc-name">${escape(g.name)}</div>
          <div class="gc-code">Código: ${g.accessCode}</div>
          <div class="gc-stats">
            <div class="gc-stat"><div class="gc-stat-val">${g.membersCount}</div><div class="gc-stat-label">Miembros</div></div>
            <div class="gc-stat"><div class="gc-stat-val">${g.debtsCount}</div><div class="gc-stat-label">Deudas</div></div>
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
    $('group-type-badge').className = `type-badge`;
    $('group-code').textContent = `Código: ${g.accessCode}`;
    renderSummary(); renderDebts(); renderMembers();
    // Update filter member options
    const sel = $('filter-member');
    const cur = sel.value;
    sel.innerHTML = '<option value="all">Todos los miembros</option>' +
      g.members.map(m => `<option value="${m.id}">${escape(m.name)}</option>`).join('');
    sel.value = cur;
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
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
      const netClass = net > 0 ? 'color-green' : net < 0 ? 'color-red' : '';
      const netPrefix = net > 0 ? '+' : '';
      return `
        <div class="summary-card">
          <div class="sc-avatar" style="background:${m.avatar}">${initials(m.name)}</div>
          <div class="sc-name">${escape(m.name)}</div>
          <div class="sc-rows">
            <div class="sc-row">
              <span class="sc-row-label">Le deben</span>
              <span class="sc-row-val color-green">${fmt(s.isOwed)}</span>
            </div>
            <div class="sc-row">
              <span class="sc-row-label">Debe</span>
              <span class="sc-row-val color-red">${fmt(s.owes)}</span>
            </div>
            <div class="sc-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
              <span class="sc-row-label" style="font-weight:600">Balance</span>
              <span class="sc-row-val ${netClass}" style="font-weight:700">${netPrefix}${fmt(net)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Balance bar chart
    if (!summaries.length) { $('balance-chart').innerHTML = ''; return; }
    const maxAbs = Math.max(...summaries.map(s => Math.abs(s.netBalance)), 1);
    $('balance-chart').innerHTML = `
      <div class="balance-title">Balance neto por miembro</div>
      ${summaries.map(s => {
        const m = membMap[s.memberId]; if (!m) return '';
        const pct = Math.abs(s.netBalance) / maxAbs * 100;
        const pos = s.netBalance >= 0;
        return `
          <div class="balance-bar-row">
            <div class="balance-bar-name">${escape(m.name)}</div>
            <div class="balance-bar-track">
              <div class="balance-bar-fill ${pos ? 'positive' : 'negative'}" style="width:${pct}%"></div>
            </div>
            <div class="balance-bar-amount ${pos ? 'color-green' : 'color-red'}">${pos ? '+':' '}${fmt(s.netBalance)}</div>
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
      $('debts-list').innerHTML = `<div class="empty-state"><div class="es-icon">✦</div><p>No hay deudas registradas.</p></div>`;
      return;
    }

    $('debts-list').innerHTML = list.map(d => {
      const debtor = membMap[d.debtorId];
      const lender = membMap[d.lenderId];
      if (!debtor || !lender) return '';
      const remaining = d.amount - d.paidAmount;
      const pct = (d.paidAmount / d.amount * 100).toFixed(0);
      const settled = d.status === 'pagada';
      return `
        <div class="debt-card ${settled ? 'debt-card-settled' : ''}">
          <div class="debt-main">
            <div class="debt-avatars">
              <div class="debt-avatar" style="background:${debtor.avatar}" title="${escape(debtor.name)}">${initials(debtor.name)}</div>
              <div class="debt-avatar" style="background:${lender.avatar}" title="${escape(lender.name)}">${initials(lender.name)}</div>
            </div>
            <div class="debt-names">
              <strong>${escape(debtor.name)}</strong>
              <span> → </span>
              <strong>${escape(lender.name)}</strong>
            </div>
          </div>

          <div class="debt-amount-col">
            <div class="debt-amount">${fmt(d.amount, d.currency)}</div>
            ${d.paidAmount > 0 && !settled ? `
              <div style="font-size:0.75rem;color:var(--text3)">Pagado: ${fmt(d.paidAmount, d.currency)}</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            ` : ''}
          </div>

          <div class="debt-meta">
            <span class="debt-reason">📌 ${escape(d.reason)}</span>
            <span class="debt-date">${fmtDate(d.date)}</span>
            <span class="status-badge status-${d.status}">${d.status}</span>
          </div>

          <div class="debt-actions">
            ${!settled ? `<button class="btn-icon-sm" onclick="App.openPayDebt('${d.id}')">Registrar pago</button>` : ''}
            <button class="btn-icon-sm danger" onclick="App.deleteDebt('${d.id}')">✕</button>
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
      $('members-list').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">👤</div><p>No hay miembros aún.</p></div>`;
      return;
    }
    $('members-list').innerHTML = g.members.map(m => `
      <div class="member-card">
        <div class="member-avatar" style="background:${m.avatar}">${initials(m.name)}</div>
        <div class="member-info">
          <div class="member-name">${escape(m.name)}</div>
          ${m.email ? `<div class="member-joined">${escape(m.email)}</div>` : `<div class="member-joined">Desde ${fmtDate(m.joinedAt.split('T')[0])}</div>`}
        </div>
        <button class="member-remove" onclick="App.removeMember('${m.id}')" title="Eliminar">✕</button>
      </div>
    `).join('');
  }

  // ─── MODALS ───
  function openModal(html) {
    $('modal-content').innerHTML = html;
    $('modal-overlay').classList.add('open');
  }
  function closeModal() {
    $('modal-overlay').classList.remove('open');
    $('modal-content').innerHTML = '';
  }

  function showCreateGroup() {
    openModal(`
      <div class="modal-title">Crear Grupo</div>
      <div class="form-group">
        <label class="form-label">Nombre del grupo</label>
        <input class="form-input" id="m-gname" placeholder="Ej: Familia Pérez, Trip NYC..." autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="m-gtype">
          <option value="familia">👨‍👩‍👧 Familia</option>
          <option value="amigos">👥 Amigos</option>
          <option value="conocidos">🤝 Conocidos</option>
          <option value="otros">📁 Otros</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción (opcional)</label>
        <textarea class="form-textarea" id="m-gdesc" placeholder="Ej: Gastos del viaje de enero..."></textarea>
      </div>
      <div class="form-footer">
        <button class="btn-ghost btn-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary btn-sm" onclick="App.createGroup()">Crear Grupo</button>
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
      <div class="modal-title">Unirme a un Grupo</div>
      <div class="form-group">
        <label class="form-label">Código de acceso</label>
        <input class="form-input" id="m-jcode" placeholder="Ej: AB3F7" style="text-transform:uppercase;letter-spacing:0.1em;font-family:var(--mono)" autofocus>
      </div>
      <div class="form-footer">
        <button class="btn-ghost btn-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary btn-sm" onclick="App.joinGroup()">Ir al Grupo</button>
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
      <div class="modal-title">Agregar Miembro</div>
      <div class="form-group">
        <label class="form-label">Nombre completo</label>
        <input class="form-input" id="m-mname" placeholder="Ej: María García" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Correo (opcional)</label>
        <input class="form-input" id="m-memail" type="email" placeholder="maria@correo.com">
      </div>
      <div class="form-footer">
        <button class="btn-ghost btn-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary btn-sm" onclick="App.addMember()">Agregar</button>
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
    const memberOptions = g.members.map(m => `<option value="${m.id}">${escape(m.name)}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];
    openModal(`
      <div class="modal-title">Registrar Deuda</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Deudor (quien debe)</label>
          <select class="form-select" id="m-debtor">${memberOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Prestamista (a quién)</label>
          <select class="form-select" id="m-lender">${memberOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Monto</label>
        <div class="currency-input">
          <select class="form-select" id="m-currency">
            <option value="CRC">₡ CRC</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
          <input class="form-input" id="m-amount" type="number" min="1" step="any" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Motivo</label>
        <input class="form-input" id="m-reason" placeholder="Ej: Cena, gasolina, préstamo..." autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input class="form-input" id="m-date" type="date" value="${today}">
      </div>
      <div class="form-footer">
        <button class="btn-ghost btn-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary btn-sm" onclick="App.addDebt()">Registrar Deuda</button>
      </div>
    `);
    // set second option as default lender
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
      <div class="modal-title">Registrar Pago</div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:14px;margin-bottom:20px;font-size:0.875rem;color:var(--text2)">
        Deuda total: <strong style="color:var(--text)">${fmt(debt.amount, debt.currency)}</strong> |
        Pendiente: <strong style="color:var(--yellow)">${fmt(remaining, debt.currency)}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">Monto pagado (total acumulado)</label>
        <input class="form-input" id="m-paid" type="number" min="0" max="${debt.amount}" step="any" value="${debt.paidAmount}" autofocus>
      </div>
      <div class="form-footer">
        <button class="btn-ghost btn-sm" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary btn-sm" onclick="App.payDebt('${debtId}')">Guardar</button>
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
