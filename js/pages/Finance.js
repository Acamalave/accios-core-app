import financeService from '../services/financeService.js';
import userAuth from '../services/userAuth.js';
import { ChatPanel } from '../components/ChatPanel.js';
import { apiUrl } from '../services/apiConfig.js';
import nfcService from '../services/nfcService.js';
import emvReader from '../services/emvReader.js';

const STATUS_LABELS = {
  por_cobrar: 'Por Cobrar',
  pago_parcial: 'Pago Parcial',
  cobrado: 'Cobrado',
  atrasado: 'Atrasado',
};

const TYPE_LABELS = {
  unico: 'Unico',
  recurrente: 'Recurrente',
  one_time: 'Unico',
};

const METHOD_LABELS = {
  paguelofacil: 'PagueloFacil',
  nfc: 'NFC',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

const TAB_CONFIG = [
  { key: 'resumen', label: 'Resumen', hash: '#finance' },
  { key: 'transactions', label: 'Transacciones', hash: '#finance/transactions' },
  { key: 'clients', label: 'Clientes', hash: '#finance/clients' },
  { key: 'checkout', label: 'Checkout', hash: '#finance/checkout' },
  { key: 'chat', label: 'AI Chat', hash: '#finance/chat' },
];

export class Finance {
  constructor(container, currentUser, sub) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.currentTab = this._resolveTab(sub);
    this.clients = [];
    this.transactions = [];
    this.auditLog = [];
    this.txnView = 'list';
    this.txnSearch = '';
    this.chatPanel = null;
    this.checkoutSelectedClient = null;
    this.checkoutSelectedItems = new Set();
  }

  _resolveTab(sub) {
    if (!sub) return 'resumen';
    const found = TAB_CONFIG.find(t => t.key === sub);
    return found ? found.key : 'resumen';
  }

  async render() {
    this.container.innerHTML = `
      <div class="fin-page">
        <div class="fin-loading">
          <div class="fin-loading__spinner"></div>
          <div class="fin-loading__text">Cargando finanzas...</div>
        </div>
      </div>
    `;

    try {
      const [clients, transactions, auditLog] = await Promise.all([
        financeService.getAllClients(),
        financeService.getAllTransactions(),
        financeService.getFullAuditLog(),
      ]);
      this.clients = clients;
      this.transactions = transactions;
      this.auditLog = auditLog;
    } catch (e) {
      console.error('Error cargando datos financieros:', e);
    }

    this._renderShell();
  }

  _renderShell() {
    const tabsHTML = TAB_CONFIG.map(t => `
      <a href="${t.hash}" class="fin-tab ${this.currentTab === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label}</a>
    `).join('');

    this.container.innerHTML = `
      <div class="fin-page">
        <header class="fin-header">
          <div class="fin-header-row">
            <a href="#home" class="fin-back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </a>
            <div class="fin-brand">
              <div class="fin-brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span class="fin-brand-name">Finanzas</span>
            </div>
          </div>
          <nav class="fin-tabs">${tabsHTML}</nav>
        </header>
        <main class="fin-content" id="fin-content"></main>
      </div>
    `;

    this._attachTabListeners();
    this._renderCurrentTab();
  }

  _attachTabListeners() {
    this.container.querySelectorAll('.fin-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const key = tab.dataset.tab;
        if (key === this.currentTab) return;
        this._switchTab(key);
      });
    });
  }

  _switchTab(tabName) {
    if (this.chatPanel) {
      this.chatPanel.destroy();
      this.chatPanel = null;
    }
    this.currentTab = tabName;
    this.container.querySelectorAll('.fin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    const tabConf = TAB_CONFIG.find(t => t.key === tabName);
    if (tabConf) {
      history.replaceState(null, '', tabConf.hash);
    }
    this._renderCurrentTab();
  }

  _renderCurrentTab() {
    const content = this.container.querySelector('#fin-content');
    if (!content) return;

    switch (this.currentTab) {
      case 'resumen':
        this._renderResumen(content);
        break;
      case 'transactions':
        this._renderTransactions(content);
        break;
      case 'clients':
        this._renderClients(content);
        break;
      case 'checkout':
        this._renderCheckout(content);
        break;
      case 'chat':
        this._renderChat(content);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 1: RESUMEN
  // ═══════════════════════════════════════════════════════════

  async _renderResumen(content) {
    content.innerHTML = `
      <div class="fin-loading">
        <div class="fin-loading__spinner"></div>
        <div class="fin-loading__text">Calculando KPIs...</div>
      </div>
    `;

    const now = new Date();
    let monthlyIncome = 0, pendingTotal = 0, overdueTotal = 0;
    let proj30 = { total: 0 }, proj60 = { total: 0 }, proj90 = { total: 0 };

    try {
      [monthlyIncome, pendingTotal, overdueTotal, proj30, proj60, proj90] = await Promise.all([
        financeService.getMonthlyIncome(now.getFullYear(), now.getMonth() + 1),
        financeService.getPendingTotal(),
        financeService.getOverdueTotal(),
        financeService.getProjections(30),
        financeService.getProjections(60),
        financeService.getProjections(90),
      ]);
    } catch (e) {
      console.error('Error cargando KPIs:', e);
    }

    const maxProj = Math.max(proj30.total, proj60.total, proj90.total, 1);

    const recentLogs = (this.auditLog || []).slice(0, 5);

    const activityHTML = recentLogs.length > 0
      ? recentLogs.map(log => {
          const icon = log.action === 'record_payment'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
            : log.action === 'create_transaction'
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple-400)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
              : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

          const text = this._formatAuditText(log);
          const time = this._timeAgo(log.timestamp);

          return `
            <div class="fin-activity__item">
              <div class="fin-activity__icon">${icon}</div>
              <div class="fin-activity__text">${text}</div>
              <div class="fin-activity__time">${time}</div>
            </div>
          `;
        }).join('')
      : `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="fin-empty__title">Sin actividad reciente</div>
          <div class="fin-empty__text">Las transacciones y pagos apareceran aqui</div>
        </div>
      `;

    content.innerHTML = `
      <div class="fin-kpi-grid">
        <div class="fin-kpi-card fin-kpi-card--income">
          <div class="fin-kpi-card__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="fin-kpi-card__value">${financeService.formatCurrency(monthlyIncome)}</div>
          <div class="fin-kpi-card__label">Ingresos del Mes</div>
          <div class="fin-kpi-card__trend">${now.toLocaleString('es', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div class="fin-kpi-card fin-kpi-card--pending">
          <div class="fin-kpi-card__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="fin-kpi-card__value">${financeService.formatCurrency(pendingTotal)}</div>
          <div class="fin-kpi-card__label">Pendiente</div>
          <div class="fin-kpi-card__trend">${this.transactions.filter(t => ['por_cobrar', 'pago_parcial'].includes(t.status)).length} transacciones</div>
        </div>
        <div class="fin-kpi-card fin-kpi-card--overdue">
          <div class="fin-kpi-card__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="fin-kpi-card__value">${financeService.formatCurrency(overdueTotal)}</div>
          <div class="fin-kpi-card__label">Atrasado</div>
          <div class="fin-kpi-card__trend">${this.transactions.filter(t => t.status === 'atrasado').length} transacciones</div>
        </div>
      </div>

      <div class="fin-section-header">
        <h3 class="fin-section-title">Proyecciones</h3>
      </div>
      <div class="fin-proj">
        <div class="fin-proj__row">
          <span class="fin-proj__label">30 dias</span>
          <div class="fin-proj__bar"><div class="fin-proj__bar-fill" style="width: ${(proj30.total / maxProj * 100).toFixed(1)}%"></div></div>
          <span class="fin-proj__value">${financeService.formatCurrency(proj30.total)}</span>
        </div>
        <div class="fin-proj__row">
          <span class="fin-proj__label">60 dias</span>
          <div class="fin-proj__bar"><div class="fin-proj__bar-fill" style="width: ${(proj60.total / maxProj * 100).toFixed(1)}%"></div></div>
          <span class="fin-proj__value">${financeService.formatCurrency(proj60.total)}</span>
        </div>
        <div class="fin-proj__row">
          <span class="fin-proj__label">90 dias</span>
          <div class="fin-proj__bar"><div class="fin-proj__bar-fill" style="width: ${(proj90.total / maxProj * 100).toFixed(1)}%"></div></div>
          <span class="fin-proj__value">${financeService.formatCurrency(proj90.total)}</span>
        </div>
      </div>

      <div class="fin-section-header">
        <h3 class="fin-section-title">Actividad Reciente</h3>
      </div>
      <div class="fin-activity">
        ${activityHTML}
      </div>
    `;
  }

  _formatAuditText(log) {
    if (log.action === 'record_payment') {
      const amt = log.newValue?.paymentAmount || log.newValue?.amount || 0;
      const clientName = this._findClientName(log.clientId);
      return `Pago de ${financeService.formatCurrency(amt)} registrado${clientName ? ' — ' + clientName : ''}`;
    }
    if (log.action === 'create_transaction') {
      const desc = log.newValue?.description || '';
      const amt = log.newValue?.totalAmount || 0;
      return `Nueva transaccion: ${desc} por ${financeService.formatCurrency(amt)}`;
    }
    if (log.action === 'update_transaction') {
      return `Transaccion actualizada`;
    }
    return log.action || 'Accion registrada';
  }

  _findClientName(clientId) {
    if (!clientId) return '';
    const client = this.clients.find(c => c.id === clientId);
    return client ? client.name : '';
  }

  _timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(timestamp).toLocaleDateString('es');
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 2: TRANSACCIONES
  // ═══════════════════════════════════════════════════════════

  _renderTransactions(content) {
    content.innerHTML = `
      <div class="fin-txn-controls">
        <div class="fin-txn-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="fin-txn-search" placeholder="Buscar transaccion..." value="${this.txnSearch}" id="fin-txn-search" />
        </div>
        <div class="fin-txn-view-toggle">
          <button class="fin-txn-view-btn ${this.txnView === 'list' ? 'active' : ''}" data-view="list" title="Lista">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button class="fin-txn-view-btn ${this.txnView === 'kanban' ? 'active' : ''}" data-view="kanban" title="Kanban">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          </button>
        </div>
        <button class="glass-btn glass-btn--primary" id="fin-txn-new">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva
        </button>
      </div>
      <div id="fin-txn-body"></div>
    `;

    this._renderTxnBody();
    this._attachTxnListeners(content);
  }

  _getFilteredTransactions() {
    if (!this.txnSearch) return this.transactions;
    const q = this.txnSearch.toLowerCase();
    return this.transactions.filter(t =>
      (t.clientName || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  _renderTxnBody() {
    const body = this.container.querySelector('#fin-txn-body');
    if (!body) return;

    const filtered = this._getFilteredTransactions();

    if (this.txnView === 'kanban') {
      this._renderKanban(body, filtered);
    } else {
      this._renderTxnTable(body, filtered);
    }
  }

  _renderTxnTable(body, txns) {
    if (txns.length === 0) {
      body.innerHTML = `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="fin-empty__title">Sin transacciones</div>
          <div class="fin-empty__text">Crea tu primera transaccion con el boton "Nueva"</div>
        </div>
      `;
      return;
    }

    const rowsHTML = txns.map(t => `
      <tr class="fin-txn-row" data-id="${t.id}">
        <td>${t.clientName || '—'}</td>
        <td>${t.description || '—'}</td>
        <td>${financeService.formatCurrency(t.totalAmount || 0)}</td>
        <td>${financeService.formatCurrency(t.amountPaid || 0)}</td>
        <td>${financeService.formatCurrency(t.pendingAmount || 0)}</td>
        <td><span class="fin-status fin-status--${t.status}">${STATUS_LABELS[t.status] || t.status}</span></td>
        <td><span class="fin-type fin-type--${t.type === 'recurrente' ? 'recurrente' : 'unico'}">${TYPE_LABELS[t.type] || t.type}</span></td>
        <td>
          <button class="glass-btn glass-btn--sm fin-txn-pay-btn" data-id="${t.id}" title="Registrar Pago" ${t.status === 'cobrado' ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </button>
          <button class="glass-btn glass-btn--sm fin-txn-edit-btn" data-id="${t.id}" title="Editar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    body.innerHTML = `
      <div class="fin-txn-table-wrap">
        <table class="fin-txn-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descripcion</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('.fin-txn-pay-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showPaymentModal(btn.dataset.id);
      });
    });

    body.querySelectorAll('.fin-txn-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showEditTransactionModal(btn.dataset.id);
      });
    });

    body.querySelectorAll('.fin-txn-row').forEach(row => {
      row.addEventListener('click', () => {
        this._showEditTransactionModal(row.dataset.id);
      });
    });
  }

  _renderKanban(body, txns) {
    const columns = ['por_cobrar', 'pago_parcial', 'cobrado', 'atrasado'];

    const colsHTML = columns.map(status => {
      const colTxns = txns.filter(t => t.status === status);
      const cardsHTML = colTxns.length > 0
        ? colTxns.map(t => `
            <div class="fin-kanban__card" data-id="${t.id}">
              <div style="font-weight:600;font-size:0.85rem;margin-bottom:4px;">${t.clientName || '—'}</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px;">${t.description || ''}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;font-size:0.85rem;">${financeService.formatCurrency(t.pendingAmount || 0)}</span>
                <span style="font-size:0.7rem;color:var(--text-dim);">${t.dueDate || ''}</span>
              </div>
            </div>
          `).join('')
        : '<div style="text-align:center;padding:var(--space-4);color:var(--text-dim);font-size:0.78rem;">Vacio</div>';

      return `
        <div class="fin-kanban__col">
          <div class="fin-kanban__col-header">
            <span class="fin-status fin-status--${status}">${STATUS_LABELS[status]}</span>
            <span class="fin-kanban__col-count">${colTxns.length}</span>
          </div>
          <div class="fin-kanban__cards">${cardsHTML}</div>
        </div>
      `;
    }).join('');

    body.innerHTML = `<div class="fin-kanban">${colsHTML}</div>`;

    body.querySelectorAll('.fin-kanban__card').forEach(card => {
      card.addEventListener('click', () => {
        this._showEditTransactionModal(card.dataset.id);
      });
    });
  }

  _attachTxnListeners(content) {
    const searchInput = content.querySelector('#fin-txn-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.txnSearch = e.target.value;
        this._renderTxnBody();
      });
    }

    content.querySelectorAll('.fin-txn-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.txnView = btn.dataset.view;
        content.querySelectorAll('.fin-txn-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderTxnBody();
      });
    });

    const newBtn = content.querySelector('#fin-txn-new');
    if (newBtn) {
      newBtn.addEventListener('click', () => this._showNewTransactionModal());
    }
  }

  // ── Transaction Modal: Create ──

  _showNewTransactionModal() {
    const clientOptions = this.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    this._showModal('Nueva Transaccion', `
      <div class="fin-form-group">
        <label class="fin-form-label">Cliente</label>
        <select class="fin-form-select" id="fin-modal-client">
          <option value="">Seleccionar cliente...</option>
          ${clientOptions}
        </select>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Descripcion</label>
        <input type="text" class="fin-form-input" id="fin-modal-desc" placeholder="Descripcion del servicio" />
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Monto Total</label>
          <input type="number" class="fin-form-input" id="fin-modal-amount" placeholder="0.00" step="0.01" min="0" />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Tipo</label>
          <select class="fin-form-select" id="fin-modal-type">
            <option value="unico">Unico</option>
            <option value="recurrente">Recurrente</option>
          </select>
        </div>
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Fecha de Vencimiento</label>
          <input type="date" class="fin-form-input" id="fin-modal-due" />
        </div>
        <div class="fin-form-group" id="fin-modal-recurrence-wrap" style="display:none;">
          <label class="fin-form-label">Dia de Recurrencia</label>
          <input type="number" class="fin-form-input" id="fin-modal-recday" placeholder="15" min="1" max="31" />
        </div>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Extras (opcional)</label>
        <div id="fin-modal-extras"></div>
        <button class="glass-btn glass-btn--sm" id="fin-modal-add-extra" type="button" style="margin-top:var(--space-2);">+ Agregar Extra</button>
      </div>
    `, async () => {
      const clientId = this.container.querySelector('#fin-modal-client').value;
      const client = this.clients.find(c => c.id === clientId);
      const description = this.container.querySelector('#fin-modal-desc').value.trim();
      const totalAmount = parseFloat(this.container.querySelector('#fin-modal-amount').value) || 0;
      const type = this.container.querySelector('#fin-modal-type').value;
      const dueDate = this.container.querySelector('#fin-modal-due').value || null;
      const recurrenceDay = this.container.querySelector('#fin-modal-recday')?.value || null;

      if (!clientId || !description || totalAmount <= 0) {
        this._toast('Completa todos los campos obligatorios', 'error');
        return false;
      }

      const extraEls = this.container.querySelectorAll('.fin-extra-row');
      const extras = [];
      extraEls.forEach(row => {
        const name = row.querySelector('.fin-extra-name')?.value?.trim();
        const amt = parseFloat(row.querySelector('.fin-extra-amount')?.value) || 0;
        if (name && amt > 0) extras.push({ name, amount: amt });
      });

      try {
        await financeService.createTransaction({
          clientId,
          clientName: client?.name || '',
          description,
          totalAmount,
          extras,
          type,
          recurrenceDay: type === 'recurrente' ? recurrenceDay : null,
          dueDate,
          createdBy: this.currentUser?.phone || '',
        });
        this._toast('Transaccion creada exitosamente', 'success');
        await this._refreshData();
        this._renderTxnBody();
        return true;
      } catch (e) {
        console.error('Error creando transaccion:', e);
        this._toast('Error al crear transaccion', 'error');
        return false;
      }
    });

    // Type toggle for recurrence
    const typeSelect = this.container.querySelector('#fin-modal-type');
    const recWrap = this.container.querySelector('#fin-modal-recurrence-wrap');
    if (typeSelect && recWrap) {
      typeSelect.addEventListener('change', () => {
        recWrap.style.display = typeSelect.value === 'recurrente' ? '' : 'none';
      });
    }

    // Add extra fields
    const addExtraBtn = this.container.querySelector('#fin-modal-add-extra');
    const extrasContainer = this.container.querySelector('#fin-modal-extras');
    if (addExtraBtn && extrasContainer) {
      addExtraBtn.addEventListener('click', () => {
        this._addExtraRow(extrasContainer);
      });
    }
  }

  _addExtraRow(container) {
    const row = document.createElement('div');
    row.className = 'fin-extra-row';
    row.style.cssText = 'display:flex;gap:var(--space-2);margin-bottom:var(--space-2);align-items:center;';
    row.innerHTML = `
      <input type="text" class="fin-form-input fin-extra-name" placeholder="Nombre del extra" style="flex:1;" />
      <input type="number" class="fin-form-input fin-extra-amount" placeholder="Monto" step="0.01" min="0" style="width:100px;" />
      <button class="glass-btn glass-btn--sm fin-extra-remove" type="button" style="flex-shrink:0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(row);
    row.querySelector('.fin-extra-remove').addEventListener('click', () => row.remove());
  }

  // ── Transaction Modal: Edit ──

  _showEditTransactionModal(txnId) {
    const txn = this.transactions.find(t => t.id === txnId);
    if (!txn) return;

    const clientOptions = this.clients.map(c =>
      `<option value="${c.id}" ${c.id === txn.clientId ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    this._showModal('Editar Transaccion', `
      <div class="fin-form-group">
        <label class="fin-form-label">Cliente</label>
        <select class="fin-form-select" id="fin-modal-client">
          <option value="">Seleccionar cliente...</option>
          ${clientOptions}
        </select>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Descripcion</label>
        <input type="text" class="fin-form-input" id="fin-modal-desc" value="${txn.description || ''}" />
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Monto Total</label>
          <input type="number" class="fin-form-input" id="fin-modal-amount" value="${txn.totalAmount || 0}" step="0.01" min="0" />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Tipo</label>
          <select class="fin-form-select" id="fin-modal-type">
            <option value="unico" ${txn.type !== 'recurrente' ? 'selected' : ''}>Unico</option>
            <option value="recurrente" ${txn.type === 'recurrente' ? 'selected' : ''}>Recurrente</option>
          </select>
        </div>
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Fecha de Vencimiento</label>
          <input type="date" class="fin-form-input" id="fin-modal-due" value="${txn.dueDate || ''}" />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Status</label>
          <select class="fin-form-select" id="fin-modal-status">
            <option value="por_cobrar" ${txn.status === 'por_cobrar' ? 'selected' : ''}>Por Cobrar</option>
            <option value="pago_parcial" ${txn.status === 'pago_parcial' ? 'selected' : ''}>Pago Parcial</option>
            <option value="cobrado" ${txn.status === 'cobrado' ? 'selected' : ''}>Cobrado</option>
            <option value="atrasado" ${txn.status === 'atrasado' ? 'selected' : ''}>Atrasado</option>
          </select>
        </div>
      </div>
      <div style="padding:var(--space-3);background:rgba(255,255,255,0.03);border-radius:var(--radius-sm);margin-bottom:var(--space-3);">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary);">
          <span>Pagado: ${financeService.formatCurrency(txn.amountPaid || 0)}</span>
          <span>Pendiente: ${financeService.formatCurrency(txn.pendingAmount || 0)}</span>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <button class="glass-btn glass-btn--primary glass-btn--sm" id="fin-modal-regpay" ${txn.status === 'cobrado' ? 'disabled' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Registrar Pago
        </button>
      </div>
    `, async () => {
      const clientId = this.container.querySelector('#fin-modal-client').value;
      const client = this.clients.find(c => c.id === clientId);
      const description = this.container.querySelector('#fin-modal-desc').value.trim();
      const totalAmount = parseFloat(this.container.querySelector('#fin-modal-amount').value) || 0;
      const type = this.container.querySelector('#fin-modal-type').value;
      const dueDate = this.container.querySelector('#fin-modal-due').value || null;
      const status = this.container.querySelector('#fin-modal-status').value;

      if (!description || totalAmount <= 0) {
        this._toast('Completa los campos obligatorios', 'error');
        return false;
      }

      try {
        await financeService.updateTransaction(txnId, {
          clientId: clientId || txn.clientId,
          clientName: client?.name || txn.clientName,
          description,
          totalAmount,
          type,
          dueDate,
          status,
          pendingAmount: totalAmount - (txn.amountPaid || 0),
        }, this.currentUser?.phone || '');
        this._toast('Transaccion actualizada', 'success');
        await this._refreshData();
        this._renderTxnBody();
        return true;
      } catch (e) {
        console.error('Error actualizando transaccion:', e);
        this._toast('Error al actualizar', 'error');
        return false;
      }
    });

    // Register payment button inside edit modal
    const regPayBtn = this.container.querySelector('#fin-modal-regpay');
    if (regPayBtn) {
      regPayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._closeModal();
        setTimeout(() => this._showPaymentModal(txnId), 200);
      });
    }
  }

  // ── Payment Modal ──

  _showPaymentModal(txnId) {
    const txn = this.transactions.find(t => t.id === txnId);
    if (!txn) return;

    this._showModal(`Registrar Pago — ${txn.clientName || ''}`, `
      <div style="padding:var(--space-3);background:rgba(255,255,255,0.03);border-radius:var(--radius-sm);margin-bottom:var(--space-3);">
        <div style="font-size:0.85rem;font-weight:600;margin-bottom:4px;">${txn.description || ''}</div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary);">
          <span>Total: ${financeService.formatCurrency(txn.totalAmount || 0)}</span>
          <span>Pendiente: ${financeService.formatCurrency(txn.pendingAmount || 0)}</span>
        </div>
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Monto del Pago</label>
          <input type="number" class="fin-form-input" id="fin-modal-pay-amount" placeholder="0.00" step="0.01" min="0" value="${txn.pendingAmount || 0}" />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Metodo de Pago</label>
          <select class="fin-form-select" id="fin-modal-pay-method">
            <option value="paguelofacil">PagueloFacil</option>
            <option value="nfc">NFC</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Referencia</label>
        <input type="text" class="fin-form-input" id="fin-modal-pay-ref" placeholder="Numero de referencia (opcional)" />
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Notas</label>
        <input type="text" class="fin-form-input" id="fin-modal-pay-notes" placeholder="Notas adicionales (opcional)" />
      </div>
    `, async () => {
      const amount = parseFloat(this.container.querySelector('#fin-modal-pay-amount').value) || 0;
      const method = this.container.querySelector('#fin-modal-pay-method').value;
      const reference = this.container.querySelector('#fin-modal-pay-ref').value.trim();
      const notes = this.container.querySelector('#fin-modal-pay-notes').value.trim();

      if (amount <= 0) {
        this._toast('Ingresa un monto valido', 'error');
        return false;
      }

      try {
        await financeService.recordPayment({
          transactionId: txnId,
          clientId: txn.clientId,
          amount,
          method,
          reference,
          notes,
          createdBy: this.currentUser?.phone || '',
        });
        this._toast('Pago registrado exitosamente', 'success');
        await this._refreshData();
        this._renderTxnBody();
        return true;
      } catch (e) {
        console.error('Error registrando pago:', e);
        this._toast('Error al registrar pago', 'error');
        return false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 3: CLIENTES
  // ═══════════════════════════════════════════════════════════

  _renderClients(content) {
    const cardsHTML = this.clients.length > 0
      ? this.clients.map(c => {
          const initial = (c.name || '?')[0].toUpperCase();
          const clientTxns = this.transactions.filter(t => t.clientId === c.id);
          const pendingAmt = clientTxns.reduce((sum, t) => {
            if (['por_cobrar', 'pago_parcial', 'atrasado'].includes(t.status)) {
              return sum + (t.pendingAmount || 0);
            }
            return sum;
          }, 0);

          return `
            <div class="fin-client-card" data-id="${c.id}">
              <div class="fin-client-card__avatar">${initial}</div>
              <div class="fin-client-card__name">${c.name || '—'}</div>
              <div class="fin-client-card__detail">${c.contactName || ''}</div>
              <div class="fin-client-card__detail">${c.phone || ''}</div>
              <div class="fin-client-card__detail">${c.email || ''}</div>
              <div class="fin-client-card__stats">
                <div class="fin-client-card__stat">
                  <span style="font-size:0.7rem;color:var(--text-dim);">Transacciones</span>
                  <span style="font-weight:700;">${clientTxns.length}</span>
                </div>
                <div class="fin-client-card__stat">
                  <span style="font-size:0.7rem;color:var(--text-dim);">Pendiente</span>
                  <span style="font-weight:700;color:${pendingAmt > 0 ? 'var(--warning)' : 'var(--text-secondary)'};">${financeService.formatCurrency(pendingAmt)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `
        <div class="fin-empty" style="grid-column:1/-1;">
          <div class="fin-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="fin-empty__title">Sin clientes</div>
          <div class="fin-empty__text">Agrega tu primer cliente para empezar</div>
        </div>
      `;

    content.innerHTML = `
      <div class="fin-section-header">
        <h3 class="fin-section-title">Clientes</h3>
        <button class="glass-btn glass-btn--primary fin-section-action" id="fin-client-new">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Cliente
        </button>
      </div>
      <div class="fin-client-grid">${cardsHTML}</div>
    `;

    content.querySelector('#fin-client-new')?.addEventListener('click', () => {
      this._showNewClientModal();
    });

    content.querySelectorAll('.fin-client-card').forEach(card => {
      card.addEventListener('click', () => {
        this._showEditClientModal(card.dataset.id);
      });
    });
  }

  _showNewClientModal() {
    this._showModal('Nuevo Cliente', `
      <div class="fin-form-group">
        <label class="fin-form-label">Nombre de Empresa / Cliente</label>
        <input type="text" class="fin-form-input" id="fin-modal-cname" placeholder="Nombre del cliente" />
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Persona de Contacto</label>
        <input type="text" class="fin-form-input" id="fin-modal-ccontact" placeholder="Nombre del contacto" />
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Telefono</label>
          <input type="tel" class="fin-form-input" id="fin-modal-cphone" placeholder="+507..." />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Email</label>
          <input type="email" class="fin-form-input" id="fin-modal-cemail" placeholder="correo@ejemplo.com" />
        </div>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Notas</label>
        <input type="text" class="fin-form-input" id="fin-modal-cnotes" placeholder="Notas adicionales (opcional)" />
      </div>
    `, async () => {
      const name = this.container.querySelector('#fin-modal-cname').value.trim();
      const contactName = this.container.querySelector('#fin-modal-ccontact').value.trim();
      const phone = this.container.querySelector('#fin-modal-cphone').value.trim();
      const email = this.container.querySelector('#fin-modal-cemail').value.trim();
      const notes = this.container.querySelector('#fin-modal-cnotes').value.trim();

      if (!name) {
        this._toast('El nombre del cliente es obligatorio', 'error');
        return false;
      }

      try {
        await financeService.createClient({ name, contactName, phone, email, notes });
        this._toast('Cliente creado exitosamente', 'success');
        await this._refreshData();
        this._renderClients(this.container.querySelector('#fin-content'));
        return true;
      } catch (e) {
        console.error('Error creando cliente:', e);
        this._toast('Error al crear cliente', 'error');
        return false;
      }
    });
  }

  _showEditClientModal(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    this._showModal('Editar Cliente', `
      <div class="fin-form-group">
        <label class="fin-form-label">Nombre de Empresa / Cliente</label>
        <input type="text" class="fin-form-input" id="fin-modal-cname" value="${client.name || ''}" />
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Persona de Contacto</label>
        <input type="text" class="fin-form-input" id="fin-modal-ccontact" value="${client.contactName || ''}" />
      </div>
      <div class="fin-form-row">
        <div class="fin-form-group">
          <label class="fin-form-label">Telefono</label>
          <input type="tel" class="fin-form-input" id="fin-modal-cphone" value="${client.phone || ''}" />
        </div>
        <div class="fin-form-group">
          <label class="fin-form-label">Email</label>
          <input type="email" class="fin-form-input" id="fin-modal-cemail" value="${client.email || ''}" />
        </div>
      </div>
      <div class="fin-form-group">
        <label class="fin-form-label">Notas</label>
        <input type="text" class="fin-form-input" id="fin-modal-cnotes" value="${client.notes || ''}" />
      </div>
      <div style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-subtle);">
        <button class="glass-btn glass-btn--sm" id="fin-modal-delete-client" style="color:var(--error);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Eliminar Cliente
        </button>
      </div>
    `, async () => {
      const name = this.container.querySelector('#fin-modal-cname').value.trim();
      const contactName = this.container.querySelector('#fin-modal-ccontact').value.trim();
      const phone = this.container.querySelector('#fin-modal-cphone').value.trim();
      const email = this.container.querySelector('#fin-modal-cemail').value.trim();
      const notes = this.container.querySelector('#fin-modal-cnotes').value.trim();

      if (!name) {
        this._toast('El nombre es obligatorio', 'error');
        return false;
      }

      try {
        await financeService.updateClient(clientId, { name, contactName, phone, email, notes });
        this._toast('Cliente actualizado', 'success');
        await this._refreshData();
        this._renderClients(this.container.querySelector('#fin-content'));
        return true;
      } catch (e) {
        console.error('Error actualizando cliente:', e);
        this._toast('Error al actualizar', 'error');
        return false;
      }
    });

    const deleteBtn = this.container.querySelector('#fin-modal-delete-client');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Estas seguro de eliminar este cliente?')) return;
        try {
          await financeService.deleteClient(clientId);
          this._toast('Cliente eliminado', 'success');
          this._closeModal();
          await this._refreshData();
          this._renderClients(this.container.querySelector('#fin-content'));
        } catch (e) {
          console.error('Error eliminando cliente:', e);
          this._toast('Error al eliminar', 'error');
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 4: CHECKOUT
  // ═══════════════════════════════════════════════════════════

  _renderCheckout(content) {
    const clientOptions = this.clients.map(c =>
      `<option value="${c.id}" ${this.checkoutSelectedClient === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    content.innerHTML = `
      <div class="fin-checkout">
        <div class="fin-section-header">
          <h3 class="fin-section-title">Checkout</h3>
        </div>
        <div class="fin-checkout__selector">
          <label class="fin-form-label">Seleccionar Cliente</label>
          <select class="fin-form-select" id="fin-checkout-client">
            <option value="">Seleccionar cliente...</option>
            ${clientOptions}
          </select>
        </div>
        <div class="fin-checkout__items" id="fin-checkout-items"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-4) 0;border-top:1px solid var(--border-subtle);margin-top:var(--space-3);">
          <div>
            <div style="font-size:0.78rem;color:var(--text-dim);">Total Seleccionado</div>
            <div class="fin-checkout__total-value" id="fin-checkout-total">${financeService.formatCurrency(0)}</div>
          </div>
          <div class="fin-checkout__actions">
            <button class="glass-btn glass-btn--primary" id="fin-checkout-link" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Generar Link de Pago
            </button>
            <button class="glass-btn" id="fin-checkout-nfc" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
              Cobrar con NFC
            </button>
          </div>
        </div>
      </div>
    `;

    const clientSelect = content.querySelector('#fin-checkout-client');
    clientSelect.addEventListener('change', () => {
      this.checkoutSelectedClient = clientSelect.value || null;
      this.checkoutSelectedItems.clear();
      this._renderCheckoutItems();
    });

    if (this.checkoutSelectedClient) {
      this._renderCheckoutItems();
    }

    content.querySelector('#fin-checkout-link').addEventListener('click', () => this._generatePaymentLink());
    content.querySelector('#fin-checkout-nfc').addEventListener('click', () => this._showNfcModal());
  }

  _renderCheckoutItems() {
    const itemsContainer = this.container.querySelector('#fin-checkout-items');
    if (!itemsContainer) return;

    if (!this.checkoutSelectedClient) {
      itemsContainer.innerHTML = `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="fin-empty__title">Selecciona un cliente</div>
          <div class="fin-empty__text">Las transacciones pendientes apareceran aqui</div>
        </div>
      `;
      return;
    }

    const pendingTxns = this.transactions.filter(t =>
      t.clientId === this.checkoutSelectedClient &&
      ['por_cobrar', 'pago_parcial', 'atrasado'].includes(t.status)
    );

    if (pendingTxns.length === 0) {
      itemsContainer.innerHTML = `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="fin-empty__title">Sin transacciones pendientes</div>
          <div class="fin-empty__text">Este cliente no tiene cobros pendientes</div>
        </div>
      `;
      this._updateCheckoutTotal();
      return;
    }

    itemsContainer.innerHTML = pendingTxns.map(t => `
      <div class="fin-checkout__item ${this.checkoutSelectedItems.has(t.id) ? 'selected' : ''}" data-id="${t.id}">
        <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer;width:100%;">
          <input type="checkbox" ${this.checkoutSelectedItems.has(t.id) ? 'checked' : ''} style="accent-color:var(--purple-400);width:18px;height:18px;" />
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.85rem;">${t.description || '—'}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">
              <span class="fin-status fin-status--${t.status}" style="font-size:0.7rem;">${STATUS_LABELS[t.status]}</span>
              ${t.dueDate ? ' — Vence: ' + t.dueDate : ''}
            </div>
          </div>
          <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;">${financeService.formatCurrency(t.pendingAmount || 0)}</div>
        </label>
      </div>
    `).join('');

    itemsContainer.querySelectorAll('.fin-checkout__item').forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const handler = () => {
        const id = item.dataset.id;
        if (this.checkoutSelectedItems.has(id)) {
          this.checkoutSelectedItems.delete(id);
          item.classList.remove('selected');
          checkbox.checked = false;
        } else {
          this.checkoutSelectedItems.add(id);
          item.classList.add('selected');
          checkbox.checked = true;
        }
        this._updateCheckoutTotal();
      };
      checkbox.addEventListener('change', handler);
      item.addEventListener('click', (e) => {
        if (e.target === checkbox) return;
        handler();
      });
    });

    this._updateCheckoutTotal();
  }

  _updateCheckoutTotal() {
    const totalEl = this.container.querySelector('#fin-checkout-total');
    const linkBtn = this.container.querySelector('#fin-checkout-link');
    const nfcBtn = this.container.querySelector('#fin-checkout-nfc');

    let total = 0;
    this.checkoutSelectedItems.forEach(id => {
      const txn = this.transactions.find(t => t.id === id);
      if (txn) total += (txn.pendingAmount || 0);
    });

    if (totalEl) totalEl.textContent = financeService.formatCurrency(total);
    if (linkBtn) linkBtn.disabled = total <= 0;
    if (nfcBtn) nfcBtn.disabled = total <= 0;
  }

  async _generatePaymentLink() {
    const total = this._getCheckoutTotal();
    if (total <= 0) return;

    const client = this.clients.find(c => c.id === this.checkoutSelectedClient);
    const descriptions = [];
    this.checkoutSelectedItems.forEach(id => {
      const txn = this.transactions.find(t => t.id === id);
      if (txn) descriptions.push(txn.description || 'Transaccion');
    });

    try {
      const response = await fetch(apiUrl('/api/paguelofacil-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          description: descriptions.join(', '),
          clientName: client?.name || '',
          clientEmail: client?.email || '',
        }),
      });

      if (!response.ok) throw new Error(`Error generando link: ${response.status}`);
      const data = await response.json();
      const paymentUrl = data.paymentUrl || data.url || data.link || `https://paguelofacil.com/pay?amount=${total}`;

      this._showModal('Link de Pago Generado', `
        <div style="text-align:center;padding:var(--space-4);">
          <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-3);">Comparte este link con el cliente:</div>
          <div style="background:rgba(255,255,255,0.05);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:var(--space-3);word-break:break-all;font-family:monospace;font-size:0.8rem;margin-bottom:var(--space-3);">
            <a href="${paymentUrl}" target="_blank" style="color:var(--purple-400);">${paymentUrl}</a>
          </div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--purple-400);">${financeService.formatCurrency(total)}</div>
          <div style="font-size:0.78rem;color:var(--text-dim);margin-top:var(--space-1);">${client?.name || ''}</div>
          <button class="glass-btn glass-btn--primary" id="fin-copy-link" style="margin-top:var(--space-3);">Copiar Link</button>
        </div>
      `, null);

      const copyBtn = this.container.querySelector('#fin-copy-link');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(paymentUrl);
            copyBtn.textContent = 'Copiado!';
            setTimeout(() => { copyBtn.textContent = 'Copiar Link'; }, 2000);
          } catch (e) {
            copyBtn.textContent = 'Error al copiar';
          }
        });
      }
    } catch (e) {
      console.error('Error generando link de pago:', e);
      this._toast('Error al generar link de pago', 'error');
    }
  }

  _getCheckoutTotal() {
    let total = 0;
    this.checkoutSelectedItems.forEach(id => {
      const txn = this.transactions.find(t => t.id === id);
      if (txn) total += (txn.pendingAmount || 0);
    });
    return total;
  }

  _showNfcModal() {
    const total = this._getCheckoutTotal();
    if (total <= 0) return;

    const client = this.clients.find(c => c.id === this.checkoutSelectedClient);
    const descriptions = [];
    this.checkoutSelectedItems.forEach(id => {
      const txn = this.transactions.find(t => t.id === id);
      if (txn) descriptions.push(txn.description || 'Transaccion');
    });

    const useEmvReader = emvReader.isAvailable();
    const useNativeNfc = useEmvReader || nfcService.isAvailable();

    const overlay = document.createElement('div');
    overlay.className = 'fin-nfc-modal';
    overlay.innerHTML = `
        <div class="fin-nfc-card">
          <button class="fin-modal__close" id="fin-nfc-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="fin-nfc-amount">${financeService.formatCurrency(total)}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-4);">${client?.name || ''} — ${descriptions.join(', ')}</div>
          <div id="fin-nfc-native" style="display:flex;flex-direction:column;align-items:center;gap:var(--space-3);">
            ${useNativeNfc ? `<div class="fin-nfc-pulse"></div>` : ''}
            <div class="fin-nfc-status" id="fin-nfc-status">${useNativeNfc ? 'Acerca la tarjeta al dispositivo...' : 'Ingresa los datos de la tarjeta'}</div>
            <div id="fin-nfc-result" style="${useNativeNfc ? 'display:none;' : ''}text-align:center;width:100%;"></div>
          </div>
        </div>
    `;

    this.container.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('fin-nfc-modal--visible'));

    const statusEl = this.container.querySelector('#fin-nfc-status');
    const resultEl = this.container.querySelector('#fin-nfc-result');

    if (useEmvReader) {
      // EMV Reader: read card data via APDU and auto-charge
      this._startEmvPayment(total, client, descriptions.join(', '), resultEl, statusEl);
    } else if (useNativeNfc) {
      // Basic NFC: detect card then show form
      this._startNativeNfc(total, client, descriptions.join(', '));
    } else {
      // Web/no-NFC: show card form directly
      this._showCardForm(total, client, descriptions.join(', '), resultEl, statusEl);
    }

    const closeAndCleanup = () => {
      emvReader.stopReading();
      nfcService.stopReading();
      overlay.remove();
    };

    overlay.querySelector('#fin-nfc-close').addEventListener('click', closeAndCleanup);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAndCleanup();
    });
  }

  async _startEmvPayment(total, client, description, resultEl, statusEl) {
    try {
      // Step 1: Read card via EMV/APDU
      const cardData = await emvReader.readCard(30000);

      if (!cardData || !cardData.pan) {
        // Fallback to card form if EMV read fails
        if (statusEl) { statusEl.textContent = 'No se pudo leer la tarjeta'; statusEl.style.color = 'var(--red-400)'; }
        setTimeout(() => {
          if (statusEl) { statusEl.textContent = 'Ingresa los datos manualmente'; statusEl.style.color = ''; }
          if (resultEl) resultEl.style.display = 'block';
          this._showCardForm(total, client, description, resultEl, statusEl);
        }, 1500);
        return;
      }

      // Step 2: Show card detected + processing
      if (statusEl) statusEl.textContent = 'Tarjeta leida — Procesando cobro...';
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
          <div style="text-align:center;padding:12px 0;">
            <div style="color:var(--green-400);font-size:1.1rem;font-weight:600;margin-bottom:8px;">
              ✓ ${cardData.cardType} ****${cardData.last4}
            </div>
            <div class="fin-nfc-pulse"></div>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:12px;">
              Cobrando ${financeService.formatCurrency(total)}...
            </div>
          </div>
        `;
      }

      // Step 3: Direct charge via PagueloFacil AUTH_CAPTURE
      console.log('[EMV] Charging:', { cardType: cardData.cardType, last4: cardData.last4, amount: total });

      const response = await fetch(apiUrl('/api/paguelofacil-charge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          description: description || 'Cobro NFC',
          email: client?.email || 'cobro@accios.app',
          phone: client?.phone || '68204698',
          cardNumber: cardData.pan,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: '000',
          firstName: cardData.name ? cardData.name.split(' ')[0] : 'Cliente',
          lastName: cardData.name ? cardData.name.split(' ').slice(1).join(' ') : '',
          cardType: cardData.cardType,
        }),
      });

      const data = await response.json();
      console.log('[EMV] Charge response:', JSON.stringify(data));

      // Step 4: Show result
      if (data.success) {
        if (statusEl) statusEl.textContent = '';
        resultEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(74,222,128,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--green-400);margin-bottom:8px;">
              Cobro Exitoso
            </div>
            <div style="font-size:2.2rem;font-weight:800;color:#fff;margin-bottom:8px;">
              ${financeService.formatCurrency(total)}
            </div>
            <div style="font-size:0.9rem;color:var(--text-secondary);">
              ${data.cardType || cardData.cardType} ${data.displayNum || '****' + cardData.last4}
            </div>
            ${data.codOper ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">Ref: ${data.codOper}</div>` : ''}
            ${client?.name ? `<div style="font-size:0.9rem;color:var(--text-secondary);margin-top:8px;">${client.name}</div>` : ''}
          </div>
        `;
      } else {
        if (statusEl) statusEl.textContent = '';
        resultEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(248,113,113,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--red-400);margin-bottom:8px;">
              Cobro Denegado
            </div>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">
              ${data.message || 'La transaccion no fue aprobada'}
            </div>
            <button class="glass-btn" id="nfc-retry-btn" style="padding:10px 24px;">Reintentar</button>
          </div>
        `;
        resultEl.querySelector('#nfc-retry-btn')?.addEventListener('click', () => {
          resultEl.style.display = 'none';
          if (statusEl) { statusEl.textContent = 'Acerca la tarjeta al dispositivo...'; statusEl.style.color = ''; }
          this._startEmvPayment(total, client, description, resultEl, statusEl);
        });
      }
    } catch (e) {
      console.error('[EMV] Payment error:', e);
      if (statusEl) { statusEl.textContent = 'Error: ' + (e.message || 'No se pudo leer la tarjeta'); statusEl.style.color = 'var(--red-400)'; }
      // Fallback to card form
      setTimeout(() => {
        if (statusEl) { statusEl.textContent = 'Ingresa los datos manualmente'; statusEl.style.color = ''; }
        if (resultEl) resultEl.style.display = 'block';
        this._showCardForm(total, client, description, resultEl, statusEl);
      }, 2000);
    }
  }

  async _startNativeNfc(total, client, description) {
    const statusEl = this.container.querySelector('#fin-nfc-status');
    const resultEl = this.container.querySelector('#fin-nfc-result');

    const started = await nfcService.startReading(
      // onTagRead
      (tagData) => {
        nfcService.stopReading();

        if (statusEl) statusEl.textContent = 'Tarjeta detectada!';
        if (resultEl) {
          resultEl.style.display = 'block';
        }

        // Show card form for direct charge
        this._showCardForm(total, client, description, resultEl, statusEl);
      },
      // onError
      (errorMsg) => {
        if (statusEl) {
          statusEl.textContent = `Error NFC: ${errorMsg}`;
          statusEl.style.color = 'var(--red-400)';
        }
        // Fall back to card form
        setTimeout(() => {
          if (statusEl) {
            statusEl.textContent = 'Ingresa los datos de la tarjeta';
            statusEl.style.color = '';
          }
          if (resultEl) resultEl.style.display = 'block';
          this._showCardForm(total, client, description, resultEl, statusEl);
        }, 1500);
      }
    );

    if (!started && statusEl) {
      statusEl.textContent = 'Ingresa los datos de la tarjeta';
      if (resultEl) resultEl.style.display = 'block';
      this._showCardForm(total, client, description, resultEl, statusEl);
    }
  }

  _detectCardType(number) {
    const n = (number || '').replace(/\s/g, '');
    if (/^4/.test(n)) return 'VISA';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'MASTERCARD';
    if (/^3[47]/.test(n)) return 'AMEX';
    if (/^6/.test(n)) return 'DISCOVER';
    return 'VISA';
  }

  _showCardForm(total, client, description, resultEl, statusEl) {
    if (!resultEl) return;

    const inputStyle = 'width:100%;padding:12px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(124,58,237,0.3);border-radius:10px;color:#fff;font-size:0.95rem;outline:none;transition:border 0.2s;box-sizing:border-box;';

    resultEl.innerHTML = `
      <div style="text-align:left;max-width:320px;margin:0 auto;">
        <div style="margin-bottom:12px;">
          <input type="text" id="nfc-card-number" placeholder="Numero de tarjeta"
            maxlength="19" inputmode="numeric" autocomplete="cc-number"
            style="${inputStyle}" />
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input type="text" id="nfc-card-exp" placeholder="MM/AA"
            maxlength="5" inputmode="numeric" autocomplete="cc-exp"
            style="${inputStyle}flex:1;" />
          <input type="text" id="nfc-card-cvv" placeholder="CVV"
            maxlength="4" inputmode="numeric" autocomplete="cc-csc"
            style="${inputStyle}flex:1;" />
        </div>
        <div style="margin-bottom:16px;">
          <input type="text" id="nfc-card-name" placeholder="Nombre en la tarjeta"
            autocomplete="cc-name"
            style="${inputStyle}" />
        </div>
        <button class="glass-btn glass-btn--primary" id="nfc-charge-btn"
          style="width:100%;padding:14px;font-size:1rem;font-weight:700;border-radius:12px;">
          Cobrar ${financeService.formatCurrency(total)}
        </button>
      </div>
    `;

    // Format card number with spaces
    const cardInput = resultEl.querySelector('#nfc-card-number');
    cardInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 16);
      v = v.replace(/(.{4})/g, '$1 ').trim();
      e.target.value = v;
    });

    // Format expiry MM/YY
    const expInput = resultEl.querySelector('#nfc-card-exp');
    expInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
      e.target.value = v;
    });

    // Charge button
    resultEl.querySelector('#nfc-charge-btn').addEventListener('click', () => {
      this._executeDirectCharge(total, client, description, resultEl, statusEl);
    });

    // Focus first input
    setTimeout(() => cardInput.focus(), 100);
  }

  async _executeDirectCharge(total, client, description, resultEl, statusEl) {
    const cardNumber = (resultEl.querySelector('#nfc-card-number')?.value || '').replace(/\s/g, '');
    const expRaw = resultEl.querySelector('#nfc-card-exp')?.value || '';
    const cvv = resultEl.querySelector('#nfc-card-cvv')?.value || '';
    const name = resultEl.querySelector('#nfc-card-name')?.value || '';

    // Validate
    if (cardNumber.length < 13) {
      if (statusEl) { statusEl.textContent = 'Numero de tarjeta invalido'; statusEl.style.color = 'var(--red-400)'; }
      return;
    }
    if (!expRaw.includes('/') || expRaw.length < 4) {
      if (statusEl) { statusEl.textContent = 'Fecha de expiracion invalida'; statusEl.style.color = 'var(--red-400)'; }
      return;
    }
    if (cvv.length < 3) {
      if (statusEl) { statusEl.textContent = 'CVV invalido'; statusEl.style.color = 'var(--red-400)'; }
      return;
    }

    const [expMonth, expYear] = expRaw.split('/');
    const cardType = this._detectCardType(cardNumber);

    // Show processing state
    if (statusEl) { statusEl.textContent = 'Procesando cobro...'; statusEl.style.color = ''; }
    resultEl.innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <div class="fin-nfc-pulse"></div>
        <div style="font-size:1rem;color:var(--text-secondary);margin-top:16px;">
          Procesando cobro de ${financeService.formatCurrency(total)}...
        </div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:8px;">
          ${cardType} ****${cardNumber.slice(-4)}
        </div>
      </div>
    `;

    try {
      console.log('[ACCIOS] Direct charge:', { amount: total, cardType, last4: cardNumber.slice(-4) });

      const response = await fetch(apiUrl('/api/paguelofacil-charge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          description: description || 'Cobro ACCIOS',
          email: client?.email || '',
          phone: client?.phone || '',
          cardNumber,
          expMonth,
          expYear,
          cvv,
          firstName: name.split(' ')[0] || 'Cliente',
          lastName: name.split(' ').slice(1).join(' ') || '',
          cardType,
        }),
      });

      const data = await response.json();
      console.log('[ACCIOS] Charge response:', JSON.stringify(data));

      if (data.success) {
        // SUCCESS
        if (statusEl) statusEl.textContent = '';
        resultEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(74,222,128,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--green-400);margin-bottom:8px;">
              Transaccion Exitosa
            </div>
            <div style="font-size:2rem;font-weight:800;color:#fff;margin-bottom:8px;">
              ${financeService.formatCurrency(total)}
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary);">
              ${data.cardType || cardType} ${data.displayNum || '****' + cardNumber.slice(-4)}
            </div>
            ${data.codOper ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">Ref: ${data.codOper}</div>` : ''}
            ${client?.name ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:8px;">${client.name}</div>` : ''}
          </div>
        `;
      } else {
        // DENIED
        if (statusEl) statusEl.textContent = '';
        resultEl.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(248,113,113,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--red-400);margin-bottom:8px;">
              Transaccion Denegada
            </div>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">
              ${data.message || 'La transaccion no fue aprobada'}
            </div>
            <button class="glass-btn" id="nfc-retry-btn" style="padding:10px 24px;">
              Reintentar
            </button>
          </div>
        `;
        resultEl.querySelector('#nfc-retry-btn')?.addEventListener('click', () => {
          this._showCardForm(total, client, description, resultEl, statusEl);
          if (statusEl) { statusEl.textContent = 'Ingresa los datos de la tarjeta'; statusEl.style.color = ''; }
        });
      }
    } catch (e) {
      console.error('[ACCIOS] Charge error:', e);
      if (statusEl) statusEl.textContent = '';
      resultEl.innerHTML = `
        <div style="text-align:center;padding:16px 0;">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(248,113,113,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--red-400);margin-bottom:8px;">
            Error de conexion
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">
            ${e.message || 'No se pudo conectar al procesador'}
          </div>
          <button class="glass-btn" id="nfc-retry-btn" style="padding:10px 24px;">
            Reintentar
          </button>
        </div>
      `;
      resultEl.querySelector('#nfc-retry-btn')?.addEventListener('click', () => {
        this._showCardForm(total, client, description, resultEl, statusEl);
        if (statusEl) { statusEl.textContent = 'Ingresa los datos de la tarjeta'; statusEl.style.color = ''; }
      });
    }
  }

  async _generateNfcQr(total, client, description) {
    const qrContainer = this.container.querySelector('#fin-nfc-qr');
    const statusEl = this.container.querySelector('#fin-nfc-status');
    if (!qrContainer) return;

    try {
      const response = await fetch(apiUrl('/api/paguelofacil-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          description,
          clientName: client?.name || '',
          clientEmail: client?.email || '',
          method: 'nfc',
        }),
      });

      if (!response.ok) throw new Error(`Error generando link NFC: ${response.status}`);
      const data = await response.json();
      console.log('[ACCIOS] PagueloFacil response:', JSON.stringify(data));
      const paymentUrl = data.paymentUrl || data.url || data.link || `https://paguelofacil.com/nfc?amount=${total}`;

      qrContainer.innerHTML = `
        <div style="width:160px;height:160px;background:white;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;padding:8px;">
          <div style="text-align:center;">
            <div style="font-size:0.65rem;color:#333;word-break:break-all;line-height:1.3;">${paymentUrl}</div>
          </div>
        </div>
      `;

      if (statusEl) statusEl.textContent = 'Acerca el dispositivo NFC o escanea el codigo';
    } catch (e) {
      console.error('Error generando QR NFC:', e);
      qrContainer.innerHTML = `
        <div style="width:160px;height:160px;background:rgba(255,255,255,0.05);border:2px dashed var(--border-subtle);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:0.78rem;color:var(--error);">
          Error al generar
        </div>
      `;
      if (statusEl) statusEl.textContent = 'Error al conectar con el servicio de pago';
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TAB 5: AI CHAT
  // ═══════════════════════════════════════════════════════════

  _renderChat(content) {
    content.innerHTML = '<div id="fin-chat-container" style="height:100%;display:flex;flex-direction:column;"></div>';

    const chatContainer = content.querySelector('#fin-chat-container');

    this.chatPanel = new ChatPanel(chatContainer, {
      clients: this.clients,
      transactions: this.transactions,
      onDataSaved: async (actionData) => {
        await this._handleChatAction(actionData);
      },
    });

    this.chatPanel.render();
  }

  async _handleChatAction(actionData) {
    const { action, data } = actionData;

    if (action === 'create_transaction') {
      let clientId = data.clientId || '';
      let clientName = data.clientName || '';

      if (!clientId && clientName) {
        const match = this.clients.find(c =>
          c.name.toLowerCase().includes(clientName.toLowerCase())
        );
        if (match) {
          clientId = match.id;
          clientName = match.name;
        }
      }

      await financeService.createTransaction({
        clientId,
        clientName,
        description: data.description || '',
        totalAmount: data.totalAmount || 0,
        extras: data.extras || [],
        type: data.type || 'unico',
        recurrenceDay: data.recurrenceDay || null,
        dueDate: data.dueDate || null,
        createdBy: this.currentUser?.phone || '',
      });

      this._toast('Transaccion creada desde AI Chat', 'success');
      await this._refreshData();
      if (this.chatPanel) {
        this.chatPanel.updateContext(this.clients, this.transactions);
      }

    } else if (action === 'record_payment') {
      let transactionId = data.transactionId || '';

      if (!transactionId && data.clientName) {
        const match = this.transactions.find(t =>
          t.clientName?.toLowerCase().includes(data.clientName.toLowerCase()) &&
          t.status !== 'cobrado'
        );
        if (match) transactionId = match.id;
      }

      if (!transactionId) {
        throw new Error('No se encontro la transaccion para registrar el pago');
      }

      const txn = this.transactions.find(t => t.id === transactionId);

      await financeService.recordPayment({
        transactionId,
        clientId: txn?.clientId || data.clientId || '',
        amount: data.amount || 0,
        method: data.method || 'otro',
        reference: data.reference || '',
        notes: data.notes || data.description || '',
        createdBy: this.currentUser?.phone || '',
      });

      this._toast('Pago registrado desde AI Chat', 'success');
      await this._refreshData();
      if (this.chatPanel) {
        this.chatPanel.updateContext(this.clients, this.transactions);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SHARED: Modal System
  // ═══════════════════════════════════════════════════════════

  _showModal(title, bodyHTML, onSave) {
    this._closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'fin-modal-overlay';
    overlay.id = 'fin-active-modal';
    overlay.innerHTML = `
      <div class="fin-modal">
        <div class="fin-modal__header">
          <h3 class="fin-modal__title">${title}</h3>
          <button class="fin-modal__close" id="fin-modal-close-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="fin-modal__body">${bodyHTML}</div>
        ${onSave ? `
          <div class="fin-form-actions">
            <button class="glass-btn" id="fin-modal-cancel">Cancelar</button>
            <button class="glass-btn glass-btn--primary" id="fin-modal-save">Guardar</button>
          </div>
        ` : ''}
      </div>
    `;

    this.container.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('fin-modal-overlay--visible'));

    // Close handlers
    overlay.querySelector('#fin-modal-close-btn').addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeModal();
    });

    const cancelBtn = overlay.querySelector('#fin-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._closeModal());
    }

    // Save handler
    if (onSave) {
      const saveBtn = overlay.querySelector('#fin-modal-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Guardando...';
          const result = await onSave();
          if (result !== false) {
            this._closeModal();
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar';
          }
        });
      }
    }

    // Focus first input
    const firstInput = overlay.querySelector('input, select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  _closeModal() {
    const modal = this.container.querySelector('#fin-active-modal');
    if (modal) {
      modal.classList.remove('fin-modal-overlay--visible');
      modal.classList.add('fin-modal-overlay--closing');
      setTimeout(() => modal.remove(), 350);
      return;
    }

    // Also remove any NFC modals
    const nfcModal = this.container.querySelector('.fin-modal-overlay');
    if (nfcModal) {
      nfcModal.classList.remove('fin-modal-overlay--visible');
      nfcModal.classList.add('fin-modal-overlay--closing');
      setTimeout(() => nfcModal.remove(), 350);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SHARED: Helpers
  // ═══════════════════════════════════════════════════════════

  async _refreshData() {
    try {
      const [clients, transactions, auditLog] = await Promise.all([
        financeService.getAllClients(),
        financeService.getAllTransactions(),
        financeService.getFullAuditLog(),
      ]);
      this.clients = clients;
      this.transactions = transactions;
      this.auditLog = auditLog;
    } catch (e) {
      console.error('Error refrescando datos:', e);
    }
  }

  _toast(message, type = 'info') {
    document.dispatchEvent(new CustomEvent('toast', {
      detail: { message, type },
    }));
  }

  unmount() {
    if (this.chatPanel) {
      this.chatPanel.destroy();
      this.chatPanel = null;
    }
    this._closeModal();
  }
}
