import financeService from '../services/financeService.js';
import userAuth from '../services/userAuth.js';

// ── Status label map ────────────────────────────────
const STATUS_LABELS = {
  por_cobrar: 'Por cobrar',
  pago_parcial: 'Pago parcial',
  cobrado: 'Cobrado',
  atrasado: 'Atrasado',
};

// ── Method badge config ─────────────────────────────
const METHOD_CONFIG = {
  paguelofacil: { label: 'PagueloFacil', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  nfc:          { label: 'NFC',          color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  efectivo:     { label: 'Efectivo',     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  transferencia:{ label: 'Transferencia',color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  otro:         { label: 'Otro',         color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
};

export class ClientPortal {
  constructor(container, currentUser, sub) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.sub = sub; // 'payments' or undefined (default = statement)
    this.client = null;
    this.transactions = [];
    this.payments = [];
    this._boundHashChange = null;
  }

  // ═══════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════

  async render() {
    this.container.innerHTML = `
      <div class="fin-portal">
        <div class="fin-loading">
          <div class="fin-loading__spinner"></div>
          <div class="fin-loading__text">Cargando portal...</div>
        </div>
      </div>
    `;

    try {
      const phone = this.currentUser?.phone || this.currentUser?.id;
      this.client = await financeService.getClientByPortalUser(phone);

      if (!this.client) {
        this._renderNoClient();
        return;
      }

      const [transactions, payments] = await Promise.all([
        financeService.getTransactionsByClient(this.client.id),
        financeService.getPaymentsByClient(this.client.id),
      ]);

      this.transactions = transactions;
      this.payments = payments;
    } catch (e) {
      console.error('Error cargando portal del cliente:', e);
      this._renderError();
      return;
    }

    this._renderShell();
    this._attachListeners();
  }

  // ═══════════════════════════════════════════════════
  //  NO CLIENT STATE
  // ═══════════════════════════════════════════════════

  _renderNoClient() {
    this.container.innerHTML = `
      <div class="fin-portal">
        <button class="fin-back" data-action="back" aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="fin-empty__title">Cuenta no vinculada</div>
          <div class="fin-empty__text">Tu cuenta no esta vinculada a un perfil de cliente. Contacta al administrador para vincular tu perfil.</div>
        </div>
      </div>
    `;
    this._attachListeners();
  }

  // ═══════════════════════════════════════════════════
  //  ERROR STATE
  // ═══════════════════════════════════════════════════

  _renderError() {
    this.container.innerHTML = `
      <div class="fin-portal">
        <button class="fin-back" data-action="back" aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
            </svg>
          </div>
          <div class="fin-empty__title">Error al cargar</div>
          <div class="fin-empty__text">No se pudo cargar la informacion del portal. Por favor intenta de nuevo mas tarde.</div>
        </div>
      </div>
    `;
    this._attachListeners();
  }

  // ═══════════════════════════════════════════════════
  //  MAIN SHELL
  // ═══════════════════════════════════════════════════

  _renderShell() {
    const activeTab = this.sub === 'payments' ? 'payments' : 'statement';
    const pendingTotal = this.transactions.reduce((sum, txn) => {
      if (['por_cobrar', 'pago_parcial', 'atrasado'].includes(txn.status)) {
        return sum + Number(txn.pendingAmount || 0);
      }
      return sum;
    }, 0);

    this.container.innerHTML = `
      <div class="fin-portal">
        <button class="fin-back" data-action="back" aria-label="Volver" style="margin-bottom: var(--space-3);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <div class="fin-portal__header">
          <div class="fin-portal__brand">ACCIOS -- Portal del Cliente</div>
          <div class="fin-portal__welcome">Bienvenido, ${this._esc(this.client.name)}</div>
          <div class="fin-portal__welcome-sub">Balance pendiente: ${financeService.formatCurrency(pendingTotal)}</div>
        </div>

        <div class="fin-portal__tabs">
          <button class="fin-portal__tab ${activeTab === 'statement' ? 'active' : ''}" data-tab="statement">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Estado de Cuenta
          </button>
          <button class="fin-portal__tab ${activeTab === 'payments' ? 'active' : ''}" data-tab="payments">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Historial de Pagos
          </button>
        </div>

        <div class="fin-portal__content" id="portalContent">
          <!-- Tab content rendered here -->
        </div>
      </div>
    `;

    // Render the active tab content
    this._renderTabContent(activeTab);
  }

  // ═══════════════════════════════════════════════════
  //  TAB SWITCHING
  // ═══════════════════════════════════════════════════

  _switchTab(tabName) {
    // Update tab buttons
    const tabs = this.container.querySelectorAll('.fin-portal__tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update hash without re-render
    if (tabName === 'payments') {
      history.replaceState(null, '', '#portal/payments');
    } else {
      history.replaceState(null, '', '#portal');
    }

    this.sub = tabName === 'payments' ? 'payments' : undefined;
    this._renderTabContent(tabName);
  }

  // ═══════════════════════════════════════════════════
  //  TAB CONTENT RENDERER
  // ═══════════════════════════════════════════════════

  _renderTabContent(tabName) {
    const contentEl = this.container.querySelector('#portalContent');
    if (!contentEl) return;

    if (tabName === 'payments') {
      contentEl.innerHTML = this._buildPaymentsView();
    } else {
      contentEl.innerHTML = this._buildStatementView();
    }
  }

  // ═══════════════════════════════════════════════════
  //  TAB 1: ESTADO DE CUENTA
  // ═══════════════════════════════════════════════════

  _buildStatementView() {
    if (this.transactions.length === 0) {
      return `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="fin-empty__title">Sin transacciones</div>
          <div class="fin-empty__text">No tienes transacciones registradas en tu cuenta por el momento.</div>
        </div>
      `;
    }

    const rows = this.transactions.map(txn => {
      const statusLabel = STATUS_LABELS[txn.status] || txn.status;
      const dateStr = txn.createdAt
        ? new Date(txn.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

      return `
        <div class="fin-portal__txn-row" data-action="view-txn" data-txn-id="${txn.id}">
          <div class="fin-portal__txn-row-left">
            <div class="fin-portal__txn-row-desc">${this._esc(txn.description || 'Sin descripcion')}</div>
            <div class="fin-portal__txn-row-meta">
              <span class="fin-status fin-status--${txn.status}">${statusLabel}</span>
              <span>${dateStr}</span>
            </div>
          </div>
          <div class="fin-portal__txn-row-right">
            <span class="fin-portal__amount--total">${financeService.formatCurrency(txn.totalAmount || 0)}</span>
            ${txn.amountPaid > 0 ? `<span class="fin-portal__amount--paid">Abonado: ${financeService.formatCurrency(txn.amountPaid)}</span>` : ''}
            ${txn.pendingAmount > 0 ? `<span class="fin-portal__amount--pending">Pendiente: ${financeService.formatCurrency(txn.pendingAmount)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="fin-portal__statement">${rows}</div>`;
  }

  // ═══════════════════════════════════════════════════
  //  TAB 2: HISTORIAL DE PAGOS
  // ═══════════════════════════════════════════════════

  _buildPaymentsView() {
    if (this.payments.length === 0) {
      return `
        <div class="fin-empty">
          <div class="fin-empty__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div class="fin-empty__title">Sin pagos registrados</div>
          <div class="fin-empty__text">Aun no se han registrado pagos en tu cuenta.</div>
        </div>
      `;
    }

    // Build a map of transaction IDs → descriptions for quick lookup
    const txnMap = {};
    for (const txn of this.transactions) {
      txnMap[txn.id] = txn.description || 'Sin descripcion';
    }

    // Payments are already sorted by most recent first (from the service)
    const items = this.payments.map(payment => {
      const dateStr = payment.createdAt
        ? new Date(payment.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const methodCfg = METHOD_CONFIG[payment.method] || METHOD_CONFIG.otro;
      const txnDesc = txnMap[payment.transactionId] || 'Transaccion';

      return `
        <div class="fin-portal__payment-item fin-portal__payment-item--completed">
          <div class="fin-portal__payment-date">${dateStr}</div>
          <div class="fin-portal__payment-amount">${financeService.formatCurrency(payment.amount || 0)}</div>
          <div class="fin-portal__payment-method">
            <span style="
              display: inline-flex;
              align-items: center;
              padding: 1px 8px;
              border-radius: 999px;
              font-size: 0.65rem;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              color: ${methodCfg.color};
              background: ${methodCfg.bg};
              border: 1px solid ${methodCfg.color}33;
            ">${methodCfg.label}</span>
            ${payment.reference ? `<span style="margin-left: 6px; opacity: 0.6;">Ref: ${this._esc(payment.reference)}</span>` : ''}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">
            ${this._esc(txnDesc)}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="fin-portal__payment-timeline">
        ${items}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  TRANSACTION DETAIL MODAL
  // ═══════════════════════════════════════════════════

  async _showTransactionModal(txnId) {
    const txn = this.transactions.find(t => t.id === txnId);
    if (!txn) return;

    let txnPayments = [];
    try {
      txnPayments = await financeService.getPaymentsByTransaction(txnId);
    } catch (e) {
      console.error('Error cargando pagos de la transaccion:', e);
    }

    const statusLabel = STATUS_LABELS[txn.status] || txn.status;
    const dateStr = txn.createdAt
      ? new Date(txn.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const dueDateStr = txn.dueDate
      ? new Date(txn.dueDate).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    // Build extras list
    const extrasHtml = (txn.extras && txn.extras.length > 0)
      ? txn.extras.map(extra => `
          <div class="fin-portal__invoice-item">
            <span style="color: var(--text-secondary); font-size: var(--text-sm);">${this._esc(extra.description || extra.name || 'Extra')}</span>
            <span style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-primary);">${financeService.formatCurrency(extra.amount || 0)}</span>
          </div>
        `).join('')
      : '';

    // Build payments (abonos) timeline
    let paymentsTimelineHtml = '';
    if (txnPayments.length > 0) {
      const paymentItems = txnPayments.map(payment => {
        const pDate = payment.createdAt
          ? new Date(payment.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        const methodCfg = METHOD_CONFIG[payment.method] || METHOD_CONFIG.otro;
        return `
          <div class="fin-portal__payment-item fin-portal__payment-item--completed">
            <div class="fin-portal__payment-date">${pDate}</div>
            <div class="fin-portal__payment-amount">${financeService.formatCurrency(payment.amount || 0)}</div>
            <div class="fin-portal__payment-method">
              <span style="
                display: inline-flex;
                align-items: center;
                padding: 1px 8px;
                border-radius: 999px;
                font-size: 0.65rem;
                font-weight: 600;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: ${methodCfg.color};
                background: ${methodCfg.bg};
                border: 1px solid ${methodCfg.color}33;
              ">${methodCfg.label}</span>
              ${payment.reference ? `<span style="margin-left: 6px; opacity: 0.6;">Ref: ${this._esc(payment.reference)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      paymentsTimelineHtml = `
        <div style="margin-top: var(--space-5);">
          <div style="font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: var(--space-3);">Abonos realizados</div>
          <div class="fin-portal__payment-timeline">
            ${paymentItems}
          </div>
        </div>
      `;
    } else {
      paymentsTimelineHtml = `
        <div style="margin-top: var(--space-5);">
          <div style="font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: var(--space-3);">Abonos realizados</div>
          <div style="font-size: var(--text-sm); color: var(--text-muted); padding: var(--space-3) 0;">Sin abonos registrados</div>
        </div>
      `;
    }

    // Remaining balance
    const remaining = Number(txn.pendingAmount || 0);

    const modalHtml = `
      <div class="fin-modal-overlay" id="portalModal">
        <div class="fin-modal fin-portal__invoice-modal">
          <div class="fin-modal__header">
            <div class="fin-modal__title">Detalle de transaccion</div>
            <button class="fin-modal__close" data-action="close-modal" aria-label="Cerrar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="fin-modal__body">
            <!-- Invoice header info -->
            <div class="fin-portal__invoice-header">
              <div>
                <div style="font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${this._esc(txn.description || 'Sin descripcion')}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  Creado: ${dateStr}
                  ${dueDateStr ? ` &middot; Vence: ${dueDateStr}` : ''}
                </div>
              </div>
              <span class="fin-status fin-status--${txn.status}">${statusLabel}</span>
            </div>

            <!-- Line items -->
            <div class="fin-portal__invoice-items">
              <div class="fin-portal__invoice-item">
                <span style="color: var(--text-secondary); font-size: var(--text-sm);">Monto base</span>
                <span style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-primary);">${financeService.formatCurrency(txn.totalAmount - (txn.extras || []).reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
              </div>
              ${extrasHtml}
            </div>

            <!-- Totals -->
            <div class="fin-portal__invoice-total">
              <span>Total</span>
              <span style="font-family: var(--font-mono);">${financeService.formatCurrency(txn.totalAmount || 0)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; font-size: var(--text-sm);">
              <span style="color: var(--success);">Abonado</span>
              <span style="font-family: var(--font-mono); color: var(--success);">${financeService.formatCurrency(txn.amountPaid || 0)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding: var(--space-2) 0; font-size: var(--text-sm); font-weight: 600;">
              <span style="color: ${remaining > 0 ? 'var(--warning)' : 'var(--success)'};">Saldo pendiente</span>
              <span style="font-family: var(--font-mono); color: ${remaining > 0 ? 'var(--warning)' : 'var(--success)'};">${financeService.formatCurrency(remaining)}</span>
            </div>

            <!-- Payments timeline -->
            ${paymentsTimelineHtml}
          </div>
        </div>
      </div>
    `;

    // Append modal to body
    const wrapper = document.createElement('div');
    wrapper.id = 'portalModalWrapper';
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);

    // Animate in
    requestAnimationFrame(() => {
      const overlay = document.getElementById('portalModal');
      if (overlay) overlay.classList.add('fin-modal-overlay--visible');
    });

    // Close handlers
    const closeModal = () => {
      const overlay = document.getElementById('portalModal');
      if (overlay) {
        overlay.classList.remove('fin-modal-overlay--visible');
        overlay.classList.add('fin-modal-overlay--closing');
        setTimeout(() => {
          const w = document.getElementById('portalModalWrapper');
          if (w) w.remove();
        }, 350);
      }
    };

    wrapper.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close-modal"]') || e.target.classList.contains('fin-modal-overlay')) {
        closeModal();
      }
    });

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ═══════════════════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════════════════

  _attachListeners() {
    this.container.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;

      switch (action) {
        case 'back':
          location.hash = '#home';
          break;

        case 'view-txn': {
          const txnId = target.dataset.txnId;
          if (txnId) this._showTransactionModal(txnId);
          break;
        }
      }
    });

    // Tab switching
    this.container.addEventListener('click', (e) => {
      const tab = e.target.closest('.fin-portal__tab');
      if (!tab) return;
      const tabName = tab.dataset.tab;
      if (tabName) this._switchTab(tabName);
    });
  }

  // ═══════════════════════════════════════════════════
  //  UNMOUNT
  // ═══════════════════════════════════════════════════

  unmount() {
    // Clean up any open modals
    const modalWrapper = document.getElementById('portalModalWrapper');
    if (modalWrapper) modalWrapper.remove();
  }

  // ═══════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
