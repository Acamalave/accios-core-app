import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';
import { db, collection, query, where, orderBy, getDocs, limit, onSnapshot } from '../services/firebase.js';

export class SuperAdmin {
  constructor(container) {
    this.container = container;
    this.tab = 'users';
    this.users = [];
    this.businesses = [];
    this.onboardingResponses = [];
    this.episodes = [];
    this.comments = [];
    this.appointments = [];
    this.billingData = [];
    this.selectedMonth = new Date().toISOString().substring(0, 7);
    this.EVENT_LABELS = {
      page_navigate: { icon: '🧭', label: 'Navego a pagina' },
      page_view: { icon: '👁️', label: 'Vio la pagina' },
      click_back: { icon: '⬅️', label: 'Salio de la presentacion' },
      click_float_cta: { icon: '🔼', label: 'Clic en CTA flotante' },
      click_descubre_mas: { icon: '⬇️', label: 'Hizo scroll "Descubre mas"' },
      nav_prev: { icon: '◀️', label: 'Navego atras' },
      nav_next: { icon: '▶️', label: 'Navego adelante' },
      nav_dot: { icon: '⏺', label: 'Navego a seccion' },
      select_role: { icon: '👤', label: 'Selecciono rol' },
      toggle_addon: { icon: '🔀', label: 'Activo/desactivo addon' },
      click_receipt_cta: { icon: '🧾', label: 'Clic en recibo CTA' },
      click_mobile_pay: { icon: '📱', label: 'Clic en pagar (mobile)' },
      click_pay_tarjeta: { icon: '💳', label: 'Clic en Pagar con Tarjeta' },
      click_pay_yappy: { icon: '📲', label: 'Clic en Yappy/ACH' },
      select_payment_method: { icon: '🏦', label: 'Selecciono metodo de pago' },
      submit_card_payment: { icon: '✅', label: 'Envio pago con tarjeta' },
      payment_confirmed: { icon: '🎉', label: 'Pago confirmado' },
      open_features_modal: { icon: '📋', label: 'Abrio modal de funcionalidades' },
      close_features_modal: { icon: '✖️', label: 'Cerro modal de funcionalidades' },
      expand_feature: { icon: '📖', label: 'Expandio funcionalidad' },
      view_section: { icon: '📄', label: 'Vio seccion' },
    };
  }

  async render() {
    const user = userAuth.getCurrentUser();
    if (user?.role !== 'superadmin') {
      this.container.innerHTML = `
        <section class="superadmin-page">
          <h1 class="gradient-text">Acceso Denegado</h1>
          <p style="color: var(--text-secondary); margin-top: var(--space-4);">No tienes permisos de super-admin.</p>
          <a href="#home" style="color: var(--purple-400); margin-top: var(--space-4); display: inline-block;">Volver al inicio</a>
        </section>
      `;
      return;
    }

    this.container.innerHTML = `
      <section class="superadmin-page">
        <div class="superadmin-header">
          <div>
            <a href="#home" class="superadmin-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Volver
            </a>
            <h1 class="page-title gradient-text">Super Admin</h1>
          </div>
        </div>

        <div id="sa-stats" class="sa-stats stagger-in"></div>

        <div class="superadmin-tabs">
          <button class="superadmin-tab ${this.tab === 'users' ? 'active' : ''}" data-tab="users">Usuarios</button>
          <button class="superadmin-tab ${this.tab === 'businesses' ? 'active' : ''}" data-tab="businesses">Negocios</button>
          <button class="superadmin-tab ${this.tab === 'linking' ? 'active' : ''}" data-tab="linking">Vincular</button>
          <button class="superadmin-tab ${this.tab === 'onboarding' ? 'active' : ''}" data-tab="onboarding">Expedientes</button>
          <button class="superadmin-tab ${this.tab === 'episodes' ? 'active' : ''}" data-tab="episodes">Capitulos</button>
          <button class="superadmin-tab ${this.tab === 'comments' ? 'active' : ''}" data-tab="comments">Comentarios<span id="sa-comments-badge" class="sa-notif-badge" style="display:none;"></span></button>
          <button class="superadmin-tab ${this.tab === 'appointments' ? 'active' : ''}" data-tab="appointments">Citas<span id="sa-appts-badge" class="sa-notif-badge" style="display:none;"></span></button>
          <button class="superadmin-tab ${this.tab === 'behavior' ? 'active' : ''}" data-tab="behavior">Comportamiento</button>
        </div>

        <div id="sa-content">
          <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary);">Cargando...</div>
        </div>
      </section>
    `;

    // Tab switching
    this.container.querySelectorAll('.superadmin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.tab = tab.dataset.tab;
        this.container.querySelectorAll('.superadmin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderTab();
      });
    });

    await this._loadData();
    this._renderStats();
    this._renderTab();
  }

  async _loadData() {
    [this.users, this.businesses, this.onboardingResponses, this.episodes, this.comments, this.appointments] = await Promise.all([
      userAuth.getAllUsers(),
      userAuth.getAllBusinesses(),
      userAuth.getAllOnboardingResponses(),
      userAuth.getAllEpisodes(),
      userAuth.getAllComments(),
      userAuth.getAllAppointments(),
    ]);
    this.billingData = await userAuth.ensureBillingDocs(this.businesses, this.selectedMonth);
  }

  _renderStats() {
    const statsEl = this.container.querySelector('#sa-stats');
    if (!statsEl) return;

    const totalUsers = this.users.length;
    const totalBiz = this.businesses.length;
    const { porCobrar, cobrado } = this._calcBillingTotals();

    const [year, monthNum] = this.selectedMonth.split('-');
    const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('es', { month: 'long' });
    const displayMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    statsEl.innerHTML = `
      <div class="sa-month-selector">
        <button class="sa-month-arrow" id="sa-month-prev">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="sa-month-label">${displayMonth}</span>
        <button class="sa-month-arrow" id="sa-month-next">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="sa-stats-grid">
        <div class="glass-card sa-stat">
          <div class="sa-stat-value">${totalUsers}</div>
          <div class="sa-stat-label">Usuarios</div>
        </div>
        <div class="glass-card sa-stat">
          <div class="sa-stat-value">${totalBiz}</div>
          <div class="sa-stat-label">Negocios</div>
        </div>
        <div class="glass-card sa-stat">
          <div class="sa-stat-value sa-stat-value--warning">$${porCobrar.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
          <div class="sa-stat-label">Por Cobrar</div>
        </div>
        <div class="glass-card sa-stat">
          <div class="sa-stat-value">$${cobrado.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
          <div class="sa-stat-label">Cobrado</div>
        </div>
      </div>
    `;

    statsEl.querySelector('#sa-month-prev')?.addEventListener('click', () => this._changeMonth(-1));
    statsEl.querySelector('#sa-month-next')?.addEventListener('click', () => this._changeMonth(1));

    this._updateCommentBadge();
    this._updateApptBadge();
  }

  _calcBillingTotals() {
    let porCobrar = 0;
    let cobrado = 0;
    for (const billing of this.billingData) {
      const biz = this.businesses.find(b => b.id === billing.businessId);
      if (!biz) continue;
      const rec = biz.acuerdo_recurrente || 0;
      const uni = biz.acuerdo_unico || 0;
      if (billing.statusRecurrente === 'cobrado') cobrado += rec; else porCobrar += rec;
      if (billing.statusUnico !== 'na') {
        if (billing.statusUnico === 'cobrado') cobrado += uni; else porCobrar += uni;
      }
    }
    return { porCobrar, cobrado };
  }

  async _changeMonth(delta) {
    const [y, m] = this.selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.selectedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.billingData = await userAuth.ensureBillingDocs(this.businesses, this.selectedMonth);
    this._renderStats();
    if (this.tab === 'businesses') this._renderTab();
  }

  _renderTab() {
    const content = this.container.querySelector('#sa-content');
    if (this.tab === 'users') {
      this._renderUsers(content);
    } else if (this.tab === 'businesses') {
      this._renderBusinesses(content);
    } else if (this.tab === 'onboarding') {
      this._renderOnboarding(content);
    } else if (this.tab === 'episodes') {
      this._renderEpisodes(content);
    } else if (this.tab === 'comments') {
      this._renderComments(content);
    } else if (this.tab === 'appointments') {
      this._renderAppointments(content);
    } else if (this.tab === 'behavior') {
      this._renderBehavior(content);
    } else {
      this._renderLinking(content);
    }
  }

  // ─── USERS TAB ─────────────────────────────────────────

  _renderUsers(content) {
    const pinBadge = (user) => {
      const hasPin = user.pinHash && user.pinHash !== '';
      return hasPin
        ? '<span class="sa-pin-badge sa-pin-badge--active">PIN activo</span>'
        : '<span class="sa-pin-badge sa-pin-badge--none">Sin PIN</span>';
    };
    const lastLogin = (user) => user.lastLogin ? this._timeAgo(user.lastLogin) : 'Nunca';

    // Desktop table rows
    const rows = this.users.map(user => `
      <tr>
        <td><strong>${user.name || '-'}</strong></td>
        <td>${user.phone || user.id}</td>
        <td><span class="sa-badge sa-badge--${user.role || 'client'}">${user.role || 'client'}</span></td>
        <td class="sa-status-cell">${pinBadge(user)}<span class="sa-access-text">Acceso: ${lastLogin(user)}</span></td>
        <td>
          <div class="sa-biz-tags">
            ${(user.businesses || []).map(b => {
              const biz = this.businesses.find(x => x.id === b);
              return `<span class="sa-biz-tag">${biz?.nombre || b}</span>`;
            }).join('') || '<span style="color: var(--text-muted); font-size: 0.8rem;">ninguno</span>'}
          </div>
        </td>
        <td>
          <div class="sa-table-actions">
            <button class="sa-btn" data-edit-user="${user.phone || user.id}">Editar</button>
            <button class="sa-btn sa-btn--outline" data-behavior-phone="${user.phone || user.id}">📊</button>
            <button class="sa-btn sa-btn--outline" data-reset-pin="${user.phone || user.id}">Reset PIN</button>
            <button class="sa-btn sa-btn--danger" data-delete-user="${user.phone || user.id}">Eliminar</button>
          </div>
        </td>
      </tr>
      <tr class="sa-behavior-row" style="display:none;" data-behavior-row="${user.phone || user.id}">
        <td colspan="6"><div class="sa-behavior-expand"></div></td>
      </tr>
    `).join('');

    // Mobile card layout
    const cards = this.users.map(user => `
      <div class="sa-user-card glass-card">
        <div class="sa-user-card-header">
          <div class="sa-user-card-info">
            <div class="sa-user-card-name">${user.name || '-'}</div>
            <div class="sa-user-card-phone">${user.phone || user.id}</div>
          </div>
          <span class="sa-badge sa-badge--${user.role || 'client'}">${user.role || 'client'}</span>
        </div>
        <div class="sa-user-card-status">
          ${pinBadge(user)}
          <span class="sa-user-card-login">Acceso: ${lastLogin(user)}</span>
        </div>
        ${(user.businesses || []).length ? `
          <div class="sa-biz-tags">
            ${(user.businesses || []).map(b => {
              const biz = this.businesses.find(x => x.id === b);
              return `<span class="sa-biz-tag">${biz?.nombre || b}</span>`;
            }).join('')}
          </div>
        ` : ''}
        <div class="sa-user-behavior-section">
          <button class="sa-btn sa-btn--outline sa-behavior-btn" data-behavior-phone="${user.phone || user.id}">Comportamiento ▾</button>
          <div class="sa-behavior-expand" style="display:none;"></div>
        </div>
        <div class="sa-card-actions">
          <button class="sa-btn" data-edit-user="${user.phone || user.id}">Editar</button>
          <button class="sa-btn sa-btn--outline" data-reset-pin="${user.phone || user.id}">Reset PIN</button>
          <button class="sa-btn sa-btn--danger" data-delete-user="${user.phone || user.id}">Eliminar</button>
        </div>
      </div>
    `).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-user">+ Nuevo Usuario</button>
      </div>
      <div class="sa-desktop-only glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>Telefono</th><th>Rol</th><th>Status</th><th>Negocios</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay usuarios</td></tr>'}</tbody>
        </table>
      </div>
      <div class="sa-mobile-only sa-card-list">
        ${cards || '<div style="text-align:center;color:var(--text-secondary);padding:var(--space-6);">No hay usuarios</div>'}
      </div>
    `;

    content.querySelector('#sa-add-user')?.addEventListener('click', () => this._showUserModal());

    content.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = this.users.find(u => (u.phone || u.id) === btn.dataset.editUser);
        if (user) this._showUserModal(user);
      });
    });

    content.querySelectorAll('[data-reset-pin]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const user = this.users.find(u => (u.phone || u.id) === btn.dataset.resetPin);
        if (!confirm(`Resetear PIN de ${user?.name || btn.dataset.resetPin}? Debera crear uno nuevo al iniciar sesion.`)) return;
        try {
          await userAuth.resetPin(btn.dataset.resetPin);
          Toast.success('PIN reseteado');
          await this._loadData();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });

    content.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar este usuario?')) return;
        try {
          await userAuth.deleteUser(btn.dataset.deleteUser);
          Toast.success('Usuario eliminado');
          await this._loadData();
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });

    // Behavior expand toggle
    content.querySelectorAll('[data-behavior-phone]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const phone = btn.dataset.behaviorPhone;
        const isInTable = btn.closest('.sa-desktop-only');

        if (isInTable) {
          // Desktop: toggle the hidden row
          const behaviorRow = content.querySelector(`[data-behavior-row="${phone}"]`);
          if (!behaviorRow) return;
          const isVisible = behaviorRow.style.display !== 'none';
          if (isVisible) {
            behaviorRow.style.display = 'none';
            return;
          }
          behaviorRow.style.display = '';
          const expandEl = behaviorRow.querySelector('.sa-behavior-expand');
          if (expandEl && !expandEl.dataset.loaded) {
            await this._loadUserBehavior(phone, expandEl);
            expandEl.dataset.loaded = '1';
          }
        } else {
          // Mobile: toggle the expand div inside the card
          const expandEl = btn.nextElementSibling;
          if (!expandEl) return;
          const isVisible = expandEl.style.display !== 'none';
          if (isVisible) {
            expandEl.style.display = 'none';
            btn.textContent = 'Comportamiento ▾';
            return;
          }
          expandEl.style.display = 'block';
          btn.textContent = 'Comportamiento ▴';
          if (!expandEl.dataset.loaded) {
            await this._loadUserBehavior(phone, expandEl);
            expandEl.dataset.loaded = '1';
          }
        }
      });
    });
  }

  // ─── USER BEHAVIOR LOADER ─────────────────────────────

  async _loadUserBehavior(phone, container) {
    container.innerHTML = '<div style="padding:var(--space-3);color:var(--text-muted);font-size:0.85rem;">Cargando...</div>';
    try {
      const q2 = query(
        collection(db, 'behavior_events'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      const snap = await getDocs(q2);
      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.userPhone === phone)
        .slice(0, 5);

      if (!events.length) {
        container.innerHTML = '<div class="sa-behavior-empty">Sin actividad registrada</div>';
        return;
      }

      container.innerHTML = events.map(evt => {
        const info = this.EVENT_LABELS[evt.action] || { icon: '❓', label: evt.action };
        const dataStr = this._formatEventData(evt);
        return `<div class="sa-behavior-event">
          <span class="sa-behavior-event-icon">${info.icon}</span>
          <div class="sa-behavior-event-info">
            <div>${info.label}</div>
            ${dataStr ? `<div class="sa-behavior-event-data">${dataStr}</div>` : ''}
          </div>
          <span class="sa-behavior-event-time">${this._timeAgo(evt.timestamp)}</span>
        </div>`;
      }).join('');
    } catch (e) {
      console.error('Load user behavior failed:', e);
      container.innerHTML = '<div class="sa-behavior-empty">Error al cargar datos</div>';
    }
  }

  // ─── BUSINESSES TAB ────────────────────────────────────

  _renderBusinesses(content) {
    const linkedUsers = (bizId) => this.users.filter(u => (u.businesses || []).includes(bizId)).length;
    const getBilling = (bizId) => this.billingData.find(b => b.businessId === bizId);
    const [year, monthNum] = this.selectedMonth.split('-');
    const shortMonth = new Date(year, parseInt(monthNum) - 1).toLocaleString('es', { month: 'short' });

    const billingToggle = (bizId, field, status) => {
      if (status === 'na') return '<span class="sa-billing-na">N/A</span>';
      const isCobrado = status === 'cobrado';
      return `<button class="sa-billing-toggle ${isCobrado ? 'sa-billing-toggle--cobrado' : ''}" data-toggle-billing="${bizId}" data-billing-field="${field}">${isCobrado ? '✓' : '$'}</button>`;
    };

    const acuerdoDisplay = (biz) => {
      const parts = [];
      if (biz.acuerdo_recurrente) parts.push(`$${biz.acuerdo_recurrente}/mes`);
      if (biz.acuerdo_unico) parts.push(`$${biz.acuerdo_unico} unico`);
      return parts.length ? parts.join(' + ') : '-';
    };

    // Desktop table rows
    const rows = this.businesses.map(biz => {
      const billing = getBilling(biz.id) || {};
      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            ${biz.logo ? `<img src="${biz.logo}" alt="" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;">` : '<div style="width:32px;height:32px;border-radius:6px;background:var(--glass-bg);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;font-size:1rem;">🏢</div>'}
            <strong>${biz.nombre}</strong>
          </div>
        </td>
        <td><span class="sa-biz-tag">${linkedUsers(biz.id)} usuario${linkedUsers(biz.id) !== 1 ? 's' : ''}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;">${acuerdoDisplay(biz)}</td>
        <td>
          <div class="sa-billing-cell">
            ${biz.acuerdo_recurrente ? `<span class="sa-billing-label">Rec:</span>${billingToggle(biz.id, 'statusRecurrente', billing.statusRecurrente || 'por_cobrar')}` : ''}
            ${biz.acuerdo_unico ? `<span class="sa-billing-label">Uni:</span>${billingToggle(biz.id, 'statusUnico', billing.statusUnico || 'por_cobrar')}` : ''}
            ${!biz.acuerdo_recurrente && !biz.acuerdo_unico ? '<span style="color:var(--text-muted);font-size:0.8rem;">Sin acuerdo</span>' : ''}
          </div>
        </td>
        <td>
          <div class="sa-table-actions">
            <button class="sa-btn" data-edit-biz="${biz.id}">Editar</button>
            <button class="sa-btn sa-btn--danger" data-delete-biz="${biz.id}">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Mobile card layout
    const cards = this.businesses.map(biz => {
      const billing = getBilling(biz.id) || {};
      return `
      <div class="sa-biz-card glass-card">
        <div class="sa-biz-card-header">
          ${biz.logo ? `<img src="${biz.logo}" alt="" class="sa-biz-card-logo">` : '<div class="sa-biz-card-logo sa-biz-card-logo--placeholder">🏢</div>'}
          <div class="sa-biz-card-info">
            <div class="sa-biz-card-name">${biz.nombre}</div>
            <div class="sa-biz-card-id">${biz.id}</div>
          </div>
          <span class="sa-biz-tag">${linkedUsers(biz.id)}</span>
        </div>
        <div class="sa-biz-card-acuerdo">${acuerdoDisplay(biz)}</div>
        <div class="sa-biz-card-billing">
          ${biz.acuerdo_recurrente ? `<div class="sa-biz-card-billing-row"><span>Recurrente</span>${billingToggle(biz.id, 'statusRecurrente', billing.statusRecurrente || 'por_cobrar')}</div>` : ''}
          ${biz.acuerdo_unico ? `<div class="sa-biz-card-billing-row"><span>Unico</span>${billingToggle(biz.id, 'statusUnico', billing.statusUnico || 'por_cobrar')}</div>` : ''}
          ${!biz.acuerdo_recurrente && !biz.acuerdo_unico ? '<div style="color:var(--text-muted);font-size:0.8rem;">Sin acuerdo</div>' : ''}
        </div>
        <div class="sa-card-actions">
          <button class="sa-btn" data-edit-biz="${biz.id}">Editar</button>
          <button class="sa-btn sa-btn--danger" data-delete-biz="${biz.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-biz">+ Nuevo Negocio</button>
      </div>
      <div class="sa-desktop-only glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>Usuarios</th><th>Acuerdo</th><th>Cobro ${shortMonth}</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay negocios</td></tr>'}</tbody>
        </table>
      </div>
      <div class="sa-mobile-only sa-card-list">
        ${cards || '<div style="text-align:center;color:var(--text-secondary);padding:var(--space-6);">No hay negocios</div>'}
      </div>
    `;

    content.querySelector('#sa-add-biz')?.addEventListener('click', () => this._showBusinessModal());

    content.querySelectorAll('[data-edit-biz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const biz = this.businesses.find(b => b.id === btn.dataset.editBiz);
        if (biz) this._showBusinessModal(biz);
      });
    });

    content.querySelectorAll('[data-delete-biz]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar este negocio?')) return;
        try {
          await userAuth.deleteBusiness(btn.dataset.deleteBiz);
          Toast.success('Negocio eliminado');
          await this._loadData();
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });

    // Billing toggle handlers
    content.querySelectorAll('[data-toggle-billing]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bizId = btn.dataset.toggleBilling;
        const field = btn.dataset.billingField;
        btn.disabled = true;
        try {
          await userAuth.toggleBillingStatus(bizId, this.selectedMonth, field);
          this.billingData = await userAuth.getBillingForMonth(this.selectedMonth);
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });
  }

  // ─── LINKING TAB ───────────────────────────────────────

  _renderLinking(content) {
    const userOptions = this.users.map(u =>
      `<option value="${u.phone || u.id}">${u.name || u.phone || u.id}</option>`
    ).join('');

    const userRows = this.users.map(user => {
      const bizCheckboxes = this.businesses.map(biz => {
        const isLinked = (user.businesses || []).includes(biz.id);
        return `
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer; padding: 4px 0;">
            <input type="checkbox" value="${biz.id}" data-user-phone="${user.phone || user.id}" ${isLinked ? 'checked' : ''} class="link-checkbox">
            ${biz.nombre}
          </label>
        `;
      }).join('');

      return `
        <div class="glass-card" style="margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <div class="avatar">${(user.name || '?')[0].toUpperCase()}</div>
            <div>
              <div style="font-weight: 600;">${user.name || 'Sin nombre'}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${user.phone || user.id}</div>
            </div>
            <span class="sa-badge sa-badge--${user.role || 'client'}" style="margin-left: auto;">${user.role || 'client'}</span>
          </div>
          <div style="padding-left: var(--space-2);">
            ${this.businesses.length > 0 ? bizCheckboxes : '<span style="color: var(--text-muted); font-size: 0.85rem;">Crea negocios primero</span>'}
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <p style="color: var(--text-secondary); margin-bottom: var(--space-5); font-size: 0.9rem;">
        Marca las casillas para vincular negocios a cada usuario. Los cambios se guardan automaticamente.
      </p>
      ${userRows || '<div style="text-align: center; padding: var(--space-6); color: var(--text-muted);">No hay usuarios para vincular.</div>'}
    `;

    // Auto-save on checkbox change
    content.querySelectorAll('.link-checkbox').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const phone = e.target.dataset.userPhone;
        const bizId = e.target.value;
        const shouldLink = e.target.checked;

        try {
          if (shouldLink) {
            await userAuth.linkBusinessToUser(phone, bizId);
          } else {
            await userAuth.unlinkBusinessFromUser(phone, bizId);
          }
          Toast.success(shouldLink ? 'Vinculado' : 'Desvinculado');
          // Update local data
          const user = this.users.find(u => (u.phone || u.id) === phone);
          if (user) {
            if (shouldLink && !(user.businesses || []).includes(bizId)) {
              user.businesses = [...(user.businesses || []), bizId];
            } else if (!shouldLink) {
              user.businesses = (user.businesses || []).filter(b => b !== bizId);
            }
          }
          this._renderStats();
        } catch (e) {
          Toast.error('Error: ' + e.message);
          cb.checked = !shouldLink; // Revert
        }
      });
    });
  }

  // ─── ONBOARDING TAB ───────────────────────────────────

  _renderOnboarding(content) {
    const rows = this.onboardingResponses.map(resp => {
      const answeredCount = Object.values(resp.answers || {}).filter(a => a && a.trim()).length;
      const status = resp.completedAt
        ? '<span class="sa-badge sa-badge--superadmin">Completado</span>'
        : `<span class="sa-badge sa-badge--client">En progreso (${answeredCount}/12)</span>`;
      const date = resp.completedAt
        ? new Date(resp.completedAt).toLocaleDateString('es-PA')
        : resp.updatedAt ? new Date(resp.updatedAt).toLocaleDateString('es-PA') : '-';

      return `
        <tr>
          <td><strong>${resp.userName || resp.userId}</strong></td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${resp.businessId}</td>
          <td>${status}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${date}</td>
          <td>
            <button class="sa-btn" data-view-onboarding="${resp.id}">Ver</button>
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Talento</th><th>Negocio</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay expedientes</td></tr>'}</tbody>
        </table>
      </div>
    `;

    content.querySelectorAll('[data-view-onboarding]').forEach(btn => {
      btn.addEventListener('click', () => {
        const resp = this.onboardingResponses.find(r => r.id === btn.dataset.viewOnboarding);
        if (resp) this._showOnboardingModal(resp);
      });
    });
  }

  _showOnboardingModal(resp) {
    const SECTION_NAMES = [
      { title: 'I. Protocolo de Hospitalidad', keys: ['q1','q2','q3','q4'] },
      { title: 'II. El Circulo de Confianza', keys: ['q5','q6','q7','q8'] },
      { title: 'III. Psicologia de Escena', keys: ['q9','q10','q11','q12'] },
    ];
    const Q_TITLES = {
      q1: 'El Combustible Exacto', q2: 'El Rescate de Emergencia',
      q3: 'El Entorno Ideal', q4: 'El "No-Go" Visual y Gastrico',
      q5: 'El Complice de Riesgo', q6: 'El Ancla a Tierra',
      q7: 'La Linea Roja Invisible', q8: 'Veto Absoluto',
      q9: 'La Mentira de Sociedad', q10: 'El Boton Rojo',
      q11: 'El Superpoder de Negociacion', q12: 'El Trofeo Invisible',
    };

    let answersHTML = '';
    for (const section of SECTION_NAMES) {
      answersHTML += `<div style="margin-bottom: var(--space-5);">
        <div style="font-size: 0.75rem; font-weight: 600; color: var(--purple-400); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid rgba(124,58,237,0.1);">${section.title}</div>`;
      for (const key of section.keys) {
        const answer = resp.answers?.[key];
        answersHTML += `
          <div style="margin-bottom: var(--space-3);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 2px;">${Q_TITLES[key]}</div>
            <div style="font-size: 0.85rem; color: ${answer ? 'var(--text-muted)' : 'var(--text-dim)'}; line-height: 1.6; font-style: ${answer ? 'italic' : 'normal'};">
              ${answer ? `"${answer}"` : 'Sin respuesta'}
            </div>
          </div>`;
      }
      answersHTML += '</div>';
    }

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 560px; max-height: 80vh; overflow-y: auto;">
          <h3 class="sa-modal-title">Expediente: ${resp.userName || resp.userId}</h3>
          <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: var(--space-5);">
            ${resp.completedAt ? 'Completado el ' + new Date(resp.completedAt).toLocaleDateString('es-PA') : 'En progreso'}
          </div>
          ${answersHTML}
          <div class="sa-form-actions">
            <button class="sa-btn sa-btn--primary" id="sa-modal-cancel">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });
  }

  // ─── USER MODAL ────────────────────────────────────────

  _showUserModal(existing = null) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content">
          <h3 class="sa-modal-title">${existing ? 'Editar' : 'Nuevo'} Usuario</h3>
          <div class="sa-form-group">
            <label class="sa-form-label">Telefono (+507)</label>
            <input class="sa-form-input" id="sa-user-phone" value="${existing?.phone?.replace('+507', '') || ''}" ${existing ? 'readonly style="opacity:0.6"' : ''} placeholder="6XXXXXXX" inputmode="tel">
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Nombre</label>
            <input class="sa-form-input" id="sa-user-name" value="${existing?.name || ''}" placeholder="Maria Garcia">
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Rol</label>
            <select class="sa-form-select" id="sa-user-role">
              <option value="client" ${existing?.role === 'client' ? 'selected' : ''}>Client</option>
              <option value="admin" ${existing?.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="superadmin" ${existing?.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
            </select>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Guardar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };

    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const phone = root.querySelector('#sa-user-phone').value.trim();
      const name = root.querySelector('#sa-user-name').value.trim();
      const role = root.querySelector('#sa-user-role').value;

      if (!phone || !name) { Toast.error('Telefono y Nombre son requeridos'); return; }

      try {
        if (existing) {
          await userAuth.updateUser(existing.phone || existing.id, { name, role });
        } else {
          await userAuth.createUser({ phone, name, role, businesses: [] });
        }
        Toast.success(existing ? 'Usuario actualizado' : 'Usuario creado');
        closeModal();
        await this._loadData();
        this._renderStats();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
    });
  }

  // ─── BUSINESS MODAL ────────────────────────────────────

  _showBusinessModal(existing = null) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content">
          <h3 class="sa-modal-title">${existing ? 'Editar' : 'Nuevo'} Negocio</h3>
          <div class="sa-form-group">
            <label class="sa-form-label">ID (unico, sin espacios)</label>
            <input class="sa-form-input" id="sa-biz-id" value="${existing?.id || ''}" ${existing ? 'readonly style="opacity:0.6"' : ''} placeholder="ej: restaurante-luna">
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Nombre del negocio</label>
            <input class="sa-form-input" id="sa-biz-nombre" value="${existing?.nombre || ''}" placeholder="Restaurante Luna">
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Logo (opcional)</label>
            <div class="sa-logo-upload" id="sa-logo-upload">
              <input type="file" id="sa-biz-logo-file" accept="image/*" style="display:none;">
              <div class="sa-logo-preview" id="sa-logo-preview" style="${existing?.logo ? '' : 'display:none;'}">
                <img id="sa-logo-img" src="${existing?.logo || ''}" alt="">
                <button type="button" class="sa-logo-remove" id="sa-logo-remove" title="Quitar logo">&times;</button>
              </div>
              <button type="button" class="sa-btn sa-btn--outline" id="sa-logo-btn" style="${existing?.logo ? 'display:none;' : ''}">
                Seleccionar imagen
              </button>
              <span class="sa-logo-hint" id="sa-logo-hint">JPG, PNG o WebP. Se optimiza automaticamente.</span>
            </div>
            <input type="hidden" id="sa-biz-logo" value="${existing?.logo || ''}">
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Contenido de valor</label>
            <textarea class="sa-form-input" id="sa-biz-contenido" rows="4" placeholder="Informacion estrategica, reportes, recursos..." style="resize: vertical; min-height: 80px;">${existing?.contenido_valor || ''}</textarea>
          </div>
          <div class="sa-acuerdo-grid">
            <div class="sa-form-group">
              <label class="sa-form-label">Recurrente ($/mes)</label>
              <input class="sa-form-input" id="sa-biz-recurrente" type="number" min="0" step="0.01" value="${existing?.acuerdo_recurrente || ''}" placeholder="0.00" inputmode="decimal">
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Unico ($)</label>
              <input class="sa-form-input" id="sa-biz-unico" type="number" min="0" step="0.01" value="${existing?.acuerdo_unico || ''}" placeholder="0.00" inputmode="decimal">
            </div>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Guardar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };

    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    // ── Logo file upload handling ──
    let pendingLogoFile = null;
    const fileInput = root.querySelector('#sa-biz-logo-file');
    const logoBtn = root.querySelector('#sa-logo-btn');
    const logoPreview = root.querySelector('#sa-logo-preview');
    const logoImg = root.querySelector('#sa-logo-img');
    const logoRemove = root.querySelector('#sa-logo-remove');
    const logoHidden = root.querySelector('#sa-biz-logo');

    logoBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { Toast.error('Solo se permiten imagenes'); return; }
      if (file.size > 10 * 1024 * 1024) { Toast.error('Imagen muy grande (max 10MB)'); return; }
      pendingLogoFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        logoImg.src = ev.target.result;
        logoPreview.style.display = '';
        logoBtn.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    logoRemove.addEventListener('click', () => {
      pendingLogoFile = null;
      logoHidden.value = '';
      logoImg.src = '';
      logoPreview.style.display = 'none';
      logoBtn.style.display = '';
      fileInput.value = '';
    });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const id = root.querySelector('#sa-biz-id').value.trim().toLowerCase().replace(/\s+/g, '-');
      const nombre = root.querySelector('#sa-biz-nombre').value.trim();
      let logo = logoHidden.value.trim();
      const contenido_valor = root.querySelector('#sa-biz-contenido').value.trim();
      const acuerdo_recurrente = parseFloat(root.querySelector('#sa-biz-recurrente').value) || 0;
      const acuerdo_unico = parseFloat(root.querySelector('#sa-biz-unico').value) || 0;

      if (!id || !nombre) { Toast.error('ID y Nombre son requeridos'); return; }

      const saveBtn = root.querySelector('#sa-modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      try {
        // Optimize and convert to data URL if a file was selected
        if (pendingLogoFile) {
          logo = await this._optimizeImage(pendingLogoFile, 256, 0.7);
        }

        if (existing) {
          await userAuth.updateBusiness(existing.id, { nombre, logo, contenido_valor, acuerdo_recurrente, acuerdo_unico });
        } else {
          await userAuth.createBusiness({ id, nombre, logo, contenido_valor, acuerdo_recurrente, acuerdo_unico });
        }
        // Update billing doc if acuerdo_unico was added/removed
        const bizId = existing ? existing.id : id;
        const currentBilling = this.billingData.find(b => b.businessId === bizId);
        if (currentBilling) {
          if (acuerdo_unico > 0 && currentBilling.statusUnico === 'na') {
            await userAuth.upsertBilling(bizId, this.selectedMonth, { statusUnico: 'por_cobrar' });
          } else if (!acuerdo_unico && currentBilling.statusUnico !== 'na') {
            await userAuth.upsertBilling(bizId, this.selectedMonth, { statusUnico: 'na' });
          }
        }

        Toast.success(existing ? 'Negocio actualizado' : 'Negocio creado');
        closeModal();
        await this._loadData();
        this._renderStats();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
      }
    });
  }

  // ─── IMAGE OPTIMIZATION ──────────────────────────────────

  _optimizeImage(file, maxSize = 256, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Scale down if larger than maxSize
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Return as data URL (stored directly in Firestore)
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  // ─── EPISODES TAB ──────────────────────────────────

  _renderEpisodes(content) {
    const rows = this.episodes
      .sort((a, b) => (a.num || '').localeCompare(b.num || ''))
      .map(ep => `
        <tr>
          <td><span class="sa-badge" style="background: rgba(124,58,237,0.15); color: var(--purple-400);">EP. ${ep.num}</span></td>
          <td><strong>${ep.title}</strong></td>
          <td><span class="sa-badge sa-badge--${ep.status === 'publicado' ? 'superadmin' : 'client'}">${ep.status}</span></td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${ep.duration || '-'}</td>
          <td>
            <div style="display: flex; gap: var(--space-2);">
              <button class="sa-btn" data-edit-ep="${ep.id}">Editar</button>
              <button class="sa-btn sa-btn--danger" data-delete-ep="${ep.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-ep">+ Nuevo Capitulo</button>
      </div>
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Num</th><th>Titulo</th><th>Estado</th><th>Duracion</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay capitulos</td></tr>'}</tbody>
        </table>
      </div>
    `;

    content.querySelector('#sa-add-ep')?.addEventListener('click', () => this._showEpisodeModal());

    content.querySelectorAll('[data-edit-ep]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ep = this.episodes.find(e => e.id === btn.dataset.editEp);
        if (ep) this._showEpisodeModal(ep);
      });
    });

    content.querySelectorAll('[data-delete-ep]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar este capitulo?')) return;
        try {
          await userAuth.deleteEpisode(btn.dataset.deleteEp);
          Toast.success('Capitulo eliminado');
          await this._loadData();
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });
  }

  _showEpisodeModal(existing = null) {
    const bizOptions = this.businesses.map(b =>
      `<option value="${b.id}" ${existing?.businessId === b.id ? 'selected' : ''}>${b.nombre}</option>`
    ).join('');

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 560px; max-height: 85vh; overflow-y: auto;">
          <h3 class="sa-modal-title">${existing ? 'Editar' : 'Nuevo'} Capitulo</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="sa-form-group">
              <label class="sa-form-label">ID (unico)</label>
              <input class="sa-form-input" id="sa-ep-id" value="${existing?.id || ''}" ${existing ? 'readonly style="opacity:0.6"' : ''} placeholder="ep-002">
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Numero</label>
              <input class="sa-form-input" id="sa-ep-num" value="${existing?.num || ''}" placeholder="002">
            </div>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Titulo</label>
            <input class="sa-form-input" id="sa-ep-title" value="${existing?.title || ''}" placeholder="Nombre del capitulo">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="sa-form-group">
              <label class="sa-form-label">Estado</label>
              <select class="sa-form-select" id="sa-ep-status">
                <option value="pre-produccion" ${existing?.status === 'pre-produccion' ? 'selected' : ''}>Pre-Produccion</option>
                <option value="grabacion" ${existing?.status === 'grabacion' ? 'selected' : ''}>Grabacion</option>
                <option value="editando" ${existing?.status === 'editando' ? 'selected' : ''}>Editando</option>
                <option value="publicado" ${existing?.status === 'publicado' ? 'selected' : ''}>Publicado</option>
              </select>
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Duracion</label>
              <input class="sa-form-input" id="sa-ep-duration" value="${existing?.duration || ''}" placeholder="15 — 20 min">
            </div>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Frase / Quote</label>
            <textarea class="sa-form-input" id="sa-ep-quote" rows="2" style="resize: vertical; min-height: 48px;">${existing?.quote || ''}</textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div class="sa-form-group">
              <label class="sa-form-label">Color</label>
              <input class="sa-form-input" id="sa-ep-color" value="${existing?.color || '#7C3AED'}" placeholder="#7C3AED">
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Negocio</label>
              <select class="sa-form-select" id="sa-ep-biz">
                ${bizOptions || '<option value="mdn-podcast">mdn-podcast</option>'}
              </select>
            </div>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Contenido detallado (opcional)</label>
            <textarea class="sa-form-input" id="sa-ep-rich" rows="6" style="resize: vertical; min-height: 100px;" placeholder="Contenido HTML o texto del capitulo...">${existing?.richContent || ''}</textarea>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Guardar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const id = root.querySelector('#sa-ep-id').value.trim().toLowerCase().replace(/\s+/g, '-');
      const num = root.querySelector('#sa-ep-num').value.trim();
      const title = root.querySelector('#sa-ep-title').value.trim();
      const status = root.querySelector('#sa-ep-status').value;
      const duration = root.querySelector('#sa-ep-duration').value.trim();
      const quote = root.querySelector('#sa-ep-quote').value.trim();
      const color = root.querySelector('#sa-ep-color').value.trim();
      const businessId = root.querySelector('#sa-ep-biz').value;
      const richContent = root.querySelector('#sa-ep-rich').value.trim();

      if (!id || !num || !title) { Toast.error('ID, Numero y Titulo son requeridos'); return; }

      try {
        if (existing) {
          await userAuth.updateEpisode(existing.id, { num, title, status, duration, quote, color, businessId, richContent });
        } else {
          await userAuth.createEpisode({ id, num, title, status, duration, quote, color, businessId, richContent });
        }
        Toast.success(existing ? 'Capitulo actualizado' : 'Capitulo creado');
        closeModal();
        await this._loadData();
        this._renderStats();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
    });
  }

  // ─── COMMENTS TAB ─────────────────────────────────

  _renderComments(content) {
    const unreadCount = this.comments.filter(c => !c.read).length;

    const sorted = [...this.comments].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const rows = sorted.map(c => {
      const ep = this.episodes.find(e => e.id === c.episodeId);
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : '-';
      return `
        <tr style="${!c.read ? 'background: rgba(124,58,237,0.05);' : ''}">
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${!c.read ? '<span style="width:8px; height:8px; border-radius:50%; background: var(--purple-400); flex-shrink:0;"></span>' : ''}
              <strong>${c.userName || c.userId}</strong>
            </div>
          </td>
          <td><span class="sa-badge" style="background: rgba(124,58,237,0.15); color: var(--purple-400);">EP. ${ep?.num || '?'}</span></td>
          <td style="max-width: 300px; font-size: 0.85rem; color: var(--text-muted);">${c.text}</td>
          <td style="font-size: 0.8rem; color: var(--text-dim);">${date}</td>
          <td>
            ${!c.read ? `<button class="sa-btn" data-mark-read="${c.id}">Leido</button>` : '<span style="color: var(--text-dim); font-size: 0.75rem;">Leido</span>'}
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <span style="color: var(--text-secondary); font-size: 0.9rem;">${unreadCount} sin leer</span>
        ${unreadCount > 0 ? '<button class="sa-btn sa-btn--primary" id="sa-mark-all-read">Marcar todos como leidos</button>' : ''}
      </div>
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Usuario</th><th>Capitulo</th><th>Comentario</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay comentarios</td></tr>'}</tbody>
        </table>
      </div>
    `;

    content.querySelectorAll('[data-mark-read]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await userAuth.markCommentRead(btn.dataset.markRead);
        Toast.success('Marcado como leido');
        await this._loadData();
        this._renderStats();
        this._renderTab();
      });
    });

    content.querySelector('#sa-mark-all-read')?.addEventListener('click', async () => {
      await userAuth.markAllCommentsRead();
      Toast.success('Todos marcados como leidos');
      await this._loadData();
      this._renderStats();
      this._renderTab();
    });
  }

  _updateCommentBadge() {
    const badge = this.container.querySelector('#sa-comments-badge');
    if (!badge) return;
    const unread = this.comments.filter(c => !c.read).length;
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  _updateApptBadge() {
    const badge = this.container.querySelector('#sa-appts-badge');
    if (!badge) return;
    const pending = this.appointments.filter(a => a.status === 'pendiente').length;
    if (pending > 0) {
      badge.textContent = pending;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── APPOINTMENTS TAB ───────────────────────────────

  _renderAppointments(content) {
    const pendingCount = this.appointments.filter(a => a.status === 'pendiente').length;

    const sorted = [...this.appointments].sort((a, b) => {
      // Pending first, then by date descending
      if (a.status !== b.status) {
        if (a.status === 'pendiente') return -1;
        if (b.status === 'pendiente') return 1;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const statusBadge = (status) => {
      const map = {
        'pendiente': { cls: 'client', label: 'Pendiente' },
        'confirmada': { cls: 'superadmin', label: 'Confirmada' },
        'completada': { cls: 'admin', label: 'Completada' },
        'cancelada': { cls: '', label: 'Cancelada' },
      };
      const s = map[status] || map['pendiente'];
      return `<span class="sa-badge sa-badge--${s.cls}" ${!s.cls ? 'style="background: rgba(239,68,68,0.12); color: #ef4444;"' : ''}>${s.label}</span>`;
    };

    const rows = sorted.map(appt => {
      const date = appt.date || '-';
      const time = appt.time || '-';
      const createdDate = appt.createdAt ? new Date(appt.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : '-';

      return `
        <tr style="${appt.status === 'pendiente' ? 'background: rgba(245,158,11,0.04);' : ''}">
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${appt.status === 'pendiente' ? '<span style="width:8px; height:8px; border-radius:50%; background: #f59e0b; flex-shrink:0;"></span>' : ''}
              <strong>${appt.name || 'Sin nombre'}</strong>
            </div>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${appt.business || '-'}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${date} ${time}</td>
          <td>${statusBadge(appt.status)}</td>
          <td style="font-size: 0.8rem; color: var(--text-dim);">${createdDate}</td>
          <td>
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              <button class="sa-btn" data-view-appt="${appt.id}">Ver</button>
              ${appt.status === 'pendiente' ? `<button class="sa-btn sa-btn--primary" data-confirm-appt="${appt.id}" style="font-size: 0.72rem; padding: 4px 10px;">Confirmar</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
        <span style="color: var(--text-secondary); font-size: 0.9rem;">${pendingCount} cita${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} · ${this.appointments.length} total</span>
      </div>
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>Negocio</th><th>Fecha / Hora</th><th>Estado</th><th>Creada</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay citas agendadas</td></tr>'}</tbody>
        </table>
      </div>
    `;

    // View detail
    content.querySelectorAll('[data-view-appt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const appt = this.appointments.find(a => a.id === btn.dataset.viewAppt);
        if (appt) this._showAppointmentDetailModal(appt);
      });
    });

    // Quick confirm
    content.querySelectorAll('[data-confirm-appt]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await userAuth.updateAppointment(btn.dataset.confirmAppt, { status: 'confirmada' });
          Toast.success('Cita confirmada');
          await this._loadData();
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });
  }

  _showAppointmentDetailModal(appt) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');

    const formatDate = (d) => d ? new Date(d).toLocaleString('es-PA', { dateStyle: 'long', timeStyle: 'short' }) : '-';

    const fields = [
      { label: 'Nombre completo', value: appt.name || '-' },
      { label: 'Telefono / WhatsApp', value: appt.phone || '-' },
      { label: 'Nombre del negocio', value: appt.business || '-' },
      { label: 'Fecha preferida', value: appt.date || '-' },
      { label: 'Hora preferida', value: appt.time || '-' },
      { label: 'Mensaje', value: appt.message || 'Sin mensaje' },
      { label: 'Estado', value: appt.status || 'pendiente' },
      { label: 'Usuario registrado', value: appt.userId || '-' },
      { label: 'Fecha de solicitud', value: formatDate(appt.createdAt) },
    ];

    const fieldsHTML = fields.map(f => `
      <div style="margin-bottom: var(--space-4);">
        <div style="font-size: 0.72rem; font-weight: 600; color: var(--purple-400); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">${f.label}</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; ${f.label === 'Mensaje' ? 'font-style: italic;' : ''}">${f.value}</div>
      </div>
    `).join('');

    const statusOptions = ['pendiente', 'confirmada', 'completada', 'cancelada'].map(s =>
      `<option value="${s}" ${appt.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('');

    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 520px; max-height: 85vh; overflow-y: auto;">
          <h3 class="sa-modal-title">Cita Agendada</h3>
          <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: var(--space-5);">
            ID: ${appt.id}
          </div>

          ${fieldsHTML}

          <div style="margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid rgba(124,58,237,0.1);">
            <div class="sa-form-group">
              <label class="sa-form-label">Cambiar estado</label>
              <select class="sa-form-select" id="sa-appt-status">${statusOptions}</select>
            </div>
          </div>

          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cerrar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Guardar Estado</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const newStatus = root.querySelector('#sa-appt-status').value;
      try {
        await userAuth.updateAppointment(appt.id, { status: newStatus });
        Toast.success('Estado actualizado');
        closeModal();
        await this._loadData();
        this._renderStats();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
    });
  }

  // ─── BEHAVIOR TAB ─────────────────────────────────────

  async _renderBehavior(content) {
    const EVENT_LABELS = this.EVENT_LABELS;

    content.innerHTML = `
      <div class="sa-behavior-search">
        <input type="text" id="sa-behavior-filter" placeholder="Buscar por nombre, telefono o ID...">
      </div>
      <div class="sa-behavior-layout">
        <div class="sa-visitor-list" id="sa-visitor-list">
          <div class="sa-behavior-loading">Cargando visitantes en tiempo real...</div>
        </div>
        <div class="sa-timeline-panel" id="sa-timeline-panel">
          <div class="sa-timeline-empty">Selecciona un visitante para ver su recorrido</div>
        </div>
      </div>
    `;

    // Real-time listener
    const visitors = new Map();
    let visitorList = [];
    let currentFilter = '';
    let selectedVisitorId = null;

    const rebuildVisitorList = () => {
      visitorList = [...visitors.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    };

    const renderVisitorList = () => {
      const listEl = content.querySelector('#sa-visitor-list');
      if (!listEl) return;
      const filter = currentFilter;
      const filtered = filter
        ? visitorList.filter(v =>
            (v.userName || '').toLowerCase().includes(filter) ||
            (v.userPhone || '').includes(filter) ||
            v.visitorId.toLowerCase().includes(filter)
          )
        : visitorList;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="sa-behavior-loading">No se encontraron visitantes</div>`;
        return;
      }

      listEl.innerHTML = filtered.map(v => `
        <div class="sa-visitor-card${v.visitorId === selectedVisitorId ? ' active' : ''}" data-visitor="${v.visitorId}">
          <div class="sa-visitor-name">${v.userName || 'Visitante Anonimo'}</div>
          ${v.userPhone ? `<div class="sa-visitor-phone">${v.userPhone}</div>` : ''}
          <div class="sa-visitor-meta">
            <span class="sa-visitor-sessions">${v.sessions.size} sesion${v.sessions.size > 1 ? 'es' : ''}</span>
            <span>${this._timeAgo(v.lastSeen)}</span>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.sa-visitor-card').forEach(card => {
        card.addEventListener('click', () => {
          selectedVisitorId = card.dataset.visitor;
          listEl.querySelectorAll('.sa-visitor-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this._renderBehaviorTimeline(content.querySelector('#sa-timeline-panel'), visitors.get(selectedVisitorId), EVENT_LABELS);
        });
      });
    };

    const q = query(collection(db, 'behavior_events'), orderBy('timestamp', 'desc'), limit(1000));

    // Unsubscribe previous listener if any
    if (this._behaviorUnsub) {
      this._behaviorUnsub();
      this._behaviorUnsub = null;
    }

    this._behaviorUnsub = onSnapshot(q, (snap) => {
      visitors.clear();
      snap.docs.forEach(d => {
        const evt = { id: d.id, ...d.data() };
        if (!visitors.has(evt.visitorId)) {
          visitors.set(evt.visitorId, {
            visitorId: evt.visitorId,
            events: [],
            userName: null,
            userPhone: null,
            lastSeen: evt.timestamp,
            sessions: new Set(),
          });
        }
        const v = visitors.get(evt.visitorId);
        v.events.push(evt);
        if (evt.userName && !v.userName) v.userName = evt.userName;
        if (evt.userPhone && !v.userPhone) v.userPhone = evt.userPhone;
        v.sessions.add(evt.sessionId);
      });

      rebuildVisitorList();
      renderVisitorList();

      // Auto-refresh selected visitor timeline
      if (selectedVisitorId && visitors.has(selectedVisitorId)) {
        this._renderBehaviorTimeline(content.querySelector('#sa-timeline-panel'), visitors.get(selectedVisitorId), EVENT_LABELS);
      }
    }, (err) => {
      console.error('[behavior] realtime error:', err);
      const listEl = content.querySelector('#sa-visitor-list');
      if (listEl) listEl.innerHTML = `<div class="sa-behavior-loading" style="color:#ef4444;">Error al cargar datos</div>`;
    });

    // Search filter
    content.querySelector('#sa-behavior-filter')?.addEventListener('input', (e) => {
      currentFilter = e.target.value.toLowerCase().trim();
      renderVisitorList();
    });
  }

  _renderBehaviorTimeline(panel, visitor, EVENT_LABELS) {
    // Group events by sessionId
    const sessions = new Map();
    visitor.events.forEach(evt => {
      if (!sessions.has(evt.sessionId)) {
        sessions.set(evt.sessionId, []);
      }
      sessions.get(evt.sessionId).push(evt);
    });

    // Sort sessions by first event timestamp (newest first)
    const sortedSessions = [...sessions.entries()].sort((a, b) => {
      return b[1][0].timestamp.localeCompare(a[1][0].timestamp);
    });

    // Sort events within each session by timestamp ascending
    sortedSessions.forEach(([, events]) => {
      events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    });

    const PAYMENT_ACTIONS = ['click_pay_tarjeta', 'click_pay_yappy', 'select_payment_method', 'submit_card_payment', 'payment_confirmed'];

    panel.innerHTML = `
      <div class="sa-timeline-header">${visitor.userName || 'Visitante Anonimo'} ${visitor.userPhone ? `<span style="font-weight:normal;font-size:var(--text-sm);color:var(--purple-400);margin-left:var(--space-2);">${visitor.userPhone}</span>` : ''}</div>
      ${sortedSessions.map(([sessionId, events], si) => `
        <div class="sa-session-block">
          <div class="sa-session-title" data-session="${si}">
            <span class="chevron">▼</span>
            Sesion ${sortedSessions.length - si} — ${this._formatDate(events[0].timestamp)} (${events.length} eventos)
          </div>
          <div class="sa-session-events" data-session-body="${si}">
            <div class="sa-timeline">
              ${events.map(evt => {
                const info = EVENT_LABELS[evt.action] || { icon: '❓', label: evt.action };
                const isPayment = PAYMENT_ACTIONS.includes(evt.action);
                const dataStr = this._formatEventData(evt);
                return `
                  <div class="sa-timeline-node${isPayment ? ' payment' : ''}">
                    <div class="sa-timeline-node-header">
                      <span class="sa-timeline-icon">${info.icon}</span>
                      <span class="sa-timeline-label">${info.label}</span>
                      <span class="sa-timeline-time">${this._formatTime(evt.timestamp)}</span>
                    </div>
                    ${dataStr ? `<div class="sa-timeline-data">${dataStr}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    `;

    // Collapse/expand session blocks
    panel.querySelectorAll('.sa-session-title').forEach(title => {
      title.addEventListener('click', () => {
        const idx = title.dataset.session;
        const body = panel.querySelector(`[data-session-body="${idx}"]`);
        title.classList.toggle('collapsed');
        body.classList.toggle('hidden');
      });
    });
  }

  _formatEventData(evt) {
    const d = evt.data;
    if (!d || !Object.keys(d).length) return '';

    // Rich display for payment_confirmed
    if (evt.action === 'payment_confirmed' && d.paymentMethod) {
      const methods = { card: 'Tarjeta', yappy: 'Yappy', ach: 'ACH' };
      const parts = [`<strong>${methods[d.paymentMethod] || d.paymentMethod}</strong>`];
      parts.push(`Hoy: <strong>$${(d.totalHoy || 0).toFixed(2)}</strong>`);
      parts.push(`Mensual: <strong>$${(d.mensualidad || 0).toFixed(2)}</strong>`);
      if (d.addons?.length) parts.push(`Addons: ${d.addons.map(a => a.name).join(', ')}`);
      else parts.push('Sin addons');
      return parts.join(' · ');
    }

    const parts = [];
    if (d.route) parts.push(`#${d.route}`);
    if (d.role) parts.push(`Rol: ${d.role}`);
    if (d.addonId) parts.push(`Addon: ${d.addonId} ${d.checked ? '(activado)' : '(desactivado)'}`);
    if (d.price) parts.push(`Precio: $${d.price}`);
    if (d.method) parts.push(`Metodo: ${d.method}`);
    if (d.feature) parts.push(`${d.feature}`);
    if (d.section !== undefined) parts.push(`Seccion ${d.section}`);
    if (d.from !== undefined) parts.push(`Desde seccion ${d.from}`);
    return parts.join(' · ');
  }

  _timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(isoStr).toLocaleDateString('es-PA');
  }

  _formatDate(isoStr) {
    return new Date(isoStr).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  _formatTime(isoStr) {
    return new Date(isoStr).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  unmount() {
    if (this._behaviorUnsub) {
      this._behaviorUnsub();
      this._behaviorUnsub = null;
    }
  }
}
