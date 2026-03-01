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
    this.chargesData = [];
    this.quotes = [];
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
          <button class="superadmin-tab ${this.tab === 'quotes' ? 'active' : ''}" data-tab="quotes">Cotizaciones</button>
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
    [this.users, this.businesses, this.onboardingResponses, this.episodes, this.comments, this.appointments, this.quotes] = await Promise.all([
      userAuth.getAllUsers(),
      userAuth.getAllBusinesses(),
      userAuth.getAllOnboardingResponses(),
      userAuth.getAllEpisodes(),
      userAuth.getAllComments(),
      userAuth.getAllAppointments(),
      userAuth.getAllQuotes(),
    ]);
    this.chargesData = await userAuth.ensureMonthlyMemberships(this.businesses, this.selectedMonth);
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
    for (const charge of this.chargesData) {
      if (charge.status === 'cobrado') {
        cobrado += charge.amount || 0;
      } else {
        porCobrar += charge.amount || 0;
      }
    }
    return { porCobrar, cobrado };
  }

  async _changeMonth(delta) {
    const [y, m] = this.selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.selectedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.chargesData = await userAuth.ensureMonthlyMemberships(this.businesses, this.selectedMonth);
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
    } else if (this.tab === 'quotes') {
      this._renderQuotes(content);
    } else if (this.tab === 'behavior') {
      this._renderBehavior(content);
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

    const bizLinked = (user) => {
      const linked = (user.businesses || []);
      if (!linked.length) return '<span style="color: var(--text-muted); font-size: 0.8rem;">Sin negocio</span>';
      return linked.map(b => {
        const biz = this.businesses.find(x => x.id === b);
        return `<span class="sa-biz-tag">${biz?.nombre || b} <button class="sa-unlink-btn" data-unlink-user="${user.phone || user.id}" data-unlink-biz="${b}" title="Desvincular">&times;</button></span>`;
      }).join('');
    };

    // Desktop table rows
    const rows = this.users.map(user => `
      <tr>
        <td><strong>${user.name || '-'}</strong></td>
        <td>${user.phone || user.id}</td>
        <td><span class="sa-badge sa-badge--${user.role || 'client'}">${user.role || 'client'}</span></td>
        <td class="sa-status-cell">${pinBadge(user)}<span class="sa-access-text">Acceso: ${lastLogin(user)}</span></td>
        <td>
          <div class="sa-biz-tags">
            ${bizLinked(user)}
            <button class="sa-btn sa-btn--outline" style="font-size:0.7rem;padding:2px 8px;" data-link-user="${user.phone || user.id}">+ Vincular</button>
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
        <div class="sa-user-link-section">
          <div class="sa-user-link-label">Negocio Vinculado</div>
          <div class="sa-biz-tags">
            ${bizLinked(user)}
          </div>
          <button class="sa-btn sa-btn--outline sa-link-btn" data-link-user="${user.phone || user.id}">+ Vincular Negocio</button>
        </div>
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

    // Business linking
    content.querySelectorAll('[data-link-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const phone = btn.dataset.linkUser;
        const user = this.users.find(u => (u.phone || u.id) === phone);
        if (user) this._showLinkModal(user);
      });
    });

    // Business unlinking
    content.querySelectorAll('[data-unlink-user]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const phone = btn.dataset.unlinkUser;
        const bizId = btn.dataset.unlinkBiz;
        const biz = this.businesses.find(b => b.id === bizId);
        if (!confirm(`Desvincular ${biz?.nombre || bizId}?`)) return;
        try {
          await userAuth.unlinkBusinessFromUser(phone, bizId);
          Toast.success('Desvinculado');
          const user = this.users.find(u => (u.phone || u.id) === phone);
          if (user) user.businesses = (user.businesses || []).filter(b => b !== bizId);
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
          const behaviorRow = content.querySelector(`[data-behavior-row="${phone}"]`);
          if (!behaviorRow) return;
          const isVisible = behaviorRow.style.display !== 'none';
          if (isVisible) { behaviorRow.style.display = 'none'; return; }
          behaviorRow.style.display = '';
          const expandEl = behaviorRow.querySelector('.sa-behavior-expand');
          if (expandEl && !expandEl.dataset.loaded) {
            await this._loadUserBehavior(phone, expandEl);
            expandEl.dataset.loaded = '1';
          }
        } else {
          const expandEl = btn.nextElementSibling;
          if (!expandEl) return;
          const isVisible = expandEl.style.display !== 'none';
          if (isVisible) { expandEl.style.display = 'none'; btn.textContent = 'Comportamiento ▾'; return; }
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

  // ─── LINK BUSINESS MODAL ─────────────────────────────

  _showLinkModal(user) {
    const phone = user.phone || user.id;
    const linked = user.businesses || [];
    const available = this.businesses.filter(b => !linked.includes(b.id));

    if (!available.length) {
      Toast.error('No hay negocios disponibles para vincular');
      return;
    }

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 400px;">
          <h3 class="sa-modal-title">Vincular Negocio</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-4);">${user.name || phone}</p>
          <div class="sa-form-group">
            <label class="sa-form-label">Seleccionar negocio</label>
            <select class="sa-form-select" id="sa-link-biz">
              ${available.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Vincular</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const bizId = root.querySelector('#sa-link-biz').value;
      try {
        await userAuth.linkBusinessToUser(phone, bizId);
        Toast.success('Vinculado');
        user.businesses = [...(user.businesses || []), bizId];
        closeModal();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
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
    const getCharges = (bizId) => this.chargesData.filter(c => c.businessId === bizId);
    const [year, monthNum] = this.selectedMonth.split('-');
    const shortMonth = new Date(year, parseInt(monthNum) - 1).toLocaleString('es', { month: 'short' });

    const TYPE_LABELS = { membresia: 'Membresía', compra: 'Compra', servicio: 'Servicio', sesion: 'Sesión' };

    const statusBadge = (charge) => {
      const isCobrado = charge.status === 'cobrado';
      return `<button class="sa-billing-toggle ${isCobrado ? 'sa-billing-toggle--cobrado' : ''}" data-toggle-charge="${charge.id}">${isCobrado ? '✓' : '$'}</button>`;
    };

    const chargeRow = (charge) => {
      const paid = charge.paidAmount || 0;
      const remaining = charge.amount - paid;
      const hasAbonos = (charge.abonos || []).length > 0 && charge.status !== 'cobrado';
      return `
        <div class="sa-charge-row">
          <div class="sa-charge-info">
            <span class="sa-charge-type">${TYPE_LABELS[charge.type] || charge.type}</span>
            <span class="sa-charge-desc">${charge.description}</span>
          </div>
          <div class="sa-charge-amount">$${charge.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          ${hasAbonos ? `<div class="sa-charge-abono-info">Abonado: $${paid.toFixed(2)} · Resta: $${remaining.toFixed(2)}</div>` : ''}
          <div class="sa-charge-actions">
            ${statusBadge(charge)}
            ${charge.status !== 'cobrado' ? `<button class="sa-btn sa-btn--outline" style="font-size:0.7rem;padding:2px 8px;" data-abono-charge="${charge.id}">Abonar</button>` : ''}
            ${charge.type !== 'membresia' ? `<button class="sa-btn sa-btn--danger" style="font-size:0.7rem;padding:2px 6px;" data-delete-charge="${charge.id}">×</button>` : ''}
          </div>
        </div>`;
    };

    // Mobile card layout
    const cards = this.businesses.map(biz => {
      const charges = getCharges(biz.id);
      const membership = charges.find(c => c.type === 'membresia');
      const additional = charges.filter(c => c.type !== 'membresia');
      const totalMonth = charges.reduce((sum, c) => sum + (c.amount || 0), 0);

      return `
      <div class="sa-biz-card glass-card">
        <div class="sa-biz-card-header">
          ${biz.logo ? `<img src="${biz.logo}" alt="" class="sa-biz-card-logo">` : '<div class="sa-biz-card-logo sa-biz-card-logo--placeholder">🏢</div>'}
          <div class="sa-biz-card-info">
            <div class="sa-biz-card-name">${biz.nombre}</div>
            <div class="sa-biz-card-id">${biz.id} · ${linkedUsers(biz.id)} usuario${linkedUsers(biz.id) !== 1 ? 's' : ''}</div>
          </div>
        </div>

        ${biz.acuerdo_recurrente ? `
          <div class="sa-biz-membership">
            <div class="sa-biz-membership-label">Membresía: $${biz.acuerdo_recurrente.toLocaleString('en-US')}/mes</div>
            ${biz.fecha_corte ? `<div class="sa-biz-membership-dates">Corte: día ${biz.fecha_corte}${biz.fecha_vencimiento ? ` · Venc: día ${biz.fecha_vencimiento}` : ''}</div>` : ''}
          </div>
        ` : ''}

        <div class="sa-charges-section">
          <div class="sa-charges-header">
            <span class="sa-charges-title">Cargos ${shortMonth}</span>
            <span class="sa-charges-total">Total: $${totalMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          ${charges.length ? charges.map(chargeRow).join('') : '<div class="sa-behavior-empty">Sin cargos este mes</div>'}
          <button class="sa-btn sa-btn--outline sa-add-charge-btn" data-add-charge="${biz.id}">+ Agregar Cargo</button>
        </div>

        <div class="sa-card-actions">
          <button class="sa-btn" data-edit-biz="${biz.id}">Editar</button>
          <button class="sa-btn sa-btn--danger" data-delete-biz="${biz.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('');

    // Desktop table rows
    const rows = this.businesses.map(biz => {
      const charges = getCharges(biz.id);
      const totalMonth = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
      const porCobrar = charges.filter(c => c.status === 'por_cobrar').reduce((s, c) => s + c.amount, 0);

      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            ${biz.logo ? `<img src="${biz.logo}" alt="" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;">` : '<div style="width:32px;height:32px;border-radius:6px;background:var(--glass-bg);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;font-size:1rem;">🏢</div>'}
            <div>
              <strong>${biz.nombre}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);">${biz.acuerdo_recurrente ? `$${biz.acuerdo_recurrente}/mes` : 'Sin membresía'}</div>
            </div>
          </div>
        </td>
        <td><span class="sa-biz-tag">${linkedUsers(biz.id)}</span></td>
        <td style="font-size:0.85rem;white-space:nowrap;">$${totalMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="font-size:0.85rem;white-space:nowrap;" class="${porCobrar > 0 ? 'sa-stat-value--warning' : ''}">$${porCobrar.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td>${charges.length} cargo${charges.length !== 1 ? 's' : ''}</td>
        <td>
          <div class="sa-table-actions">
            <button class="sa-btn" data-view-charges="${biz.id}">Cargos</button>
            <button class="sa-btn" data-edit-biz="${biz.id}">Editar</button>
            <button class="sa-btn sa-btn--danger" data-delete-biz="${biz.id}">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-biz">+ Nuevo Negocio</button>
      </div>
      <div class="sa-desktop-only glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>Usuarios</th><th>Total ${shortMonth}</th><th>Pendiente</th><th>Cargos</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay negocios</td></tr>'}</tbody>
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

    // View charges modal (desktop)
    content.querySelectorAll('[data-view-charges]').forEach(btn => {
      btn.addEventListener('click', () => {
        const biz = this.businesses.find(b => b.id === btn.dataset.viewCharges);
        if (biz) this._showChargesModal(biz);
      });
    });

    // Add charge
    content.querySelectorAll('[data-add-charge]').forEach(btn => {
      btn.addEventListener('click', () => {
        const biz = this.businesses.find(b => b.id === btn.dataset.addCharge);
        if (biz) this._showAddChargeModal(biz);
      });
    });

    // Toggle charge status
    content.querySelectorAll('[data-toggle-charge]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await userAuth.toggleChargeStatus(btn.dataset.toggleCharge);
          this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });

    // Delete charge
    content.querySelectorAll('[data-delete-charge]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar este cargo?')) return;
        try {
          await userAuth.deleteCharge(btn.dataset.deleteCharge);
          this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
          Toast.success('Cargo eliminado');
          this._renderStats();
          this._renderTab();
        } catch (e) {
          Toast.error('Error: ' + e.message);
        }
      });
    });

    // Abono
    content.querySelectorAll('[data-abono-charge]').forEach(btn => {
      btn.addEventListener('click', () => {
        const charge = this.chargesData.find(c => c.id === btn.dataset.abonoCharge);
        if (charge) this._showAbonoModal(charge);
      });
    });
  }

  // ─── QUOTES TAB ──────────────────────────────────────

  _renderQuotes(content) {
    const QSTATUS = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', pagada: 'Pagada (Factura)' };
    const QSTATUS_CLS = { pendiente: 'client', aceptada: 'admin', rechazada: '', pagada: 'superadmin' };

    const sorted = [...this.quotes].sort((a, b) => {
      const order = { pendiente: 0, aceptada: 1, pagada: 2, rechazada: 3 };
      if ((order[a.status] || 0) !== (order[b.status] || 0)) return (order[a.status] || 0) - (order[b.status] || 0);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const cards = sorted.map(q => {
      const date = q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      const itemCount = (q.items || []).length;
      const statusCls = QSTATUS_CLS[q.status] || '';
      return `
      <div class="sa-quote-card glass-card">
        <div class="sa-quote-card-header">
          <div>
            <div class="sa-quote-card-client">${q.clientName || q.clientPhone}</div>
            <div class="sa-quote-card-biz">${q.businessName || '-'} · ${date}</div>
          </div>
          <span class="sa-badge sa-badge--${statusCls}" ${!statusCls ? 'style="background:rgba(239,68,68,0.12);color:#ef4444;"' : ''}>${QSTATUS[q.status] || q.status}</span>
        </div>
        <div class="sa-quote-card-items">
          ${(q.items || []).map(i => `
            <div class="sa-quote-item-row">
              <span>${i.description}</span>
              <span>$${(i.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          `).join('')}
        </div>
        <div class="sa-quote-card-total">
          <span>Subtotal: $${(q.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          ${q.fee > 0 ? `<span style="color:var(--text-muted);font-size:0.8rem;">Fee 3.5%: $${q.fee.toFixed(2)}</span>` : ''}
          ${q.status === 'pagada' ? `<span style="color:var(--neon-green);font-weight:600;">Total: $${(q.total || 0).toFixed(2)}</span>` : ''}
        </div>
        ${q.notes ? `<div class="sa-quote-card-notes">${q.notes}</div>` : ''}
        <div class="sa-card-actions">
          ${q.status === 'pendiente' ? `<button class="sa-btn sa-btn--outline" data-edit-quote="${q.id}">Editar</button>` : ''}
          <button class="sa-btn" data-view-quote="${q.id}">Ver</button>
          ${q.status === 'pendiente' || q.status === 'rechazada' ? `<button class="sa-btn sa-btn--danger" data-delete-quote="${q.id}">Eliminar</button>` : ''}
        </div>
      </div>`;
    }).join('');

    // Stats
    const pending = this.quotes.filter(q => q.status === 'pendiente').length;
    const accepted = this.quotes.filter(q => q.status === 'aceptada').length;
    const paid = this.quotes.filter(q => q.status === 'pagada').length;

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-3);">
        <div style="display:flex;gap:var(--space-3);font-size:0.85rem;color:var(--text-secondary);">
          <span>${pending} pendiente${pending !== 1 ? 's' : ''}</span>
          <span style="color:#f59e0b;">${accepted} aceptada${accepted !== 1 ? 's' : ''}</span>
          <span style="color:var(--neon-green);">${paid} factura${paid !== 1 ? 's' : ''}</span>
        </div>
        <button class="sa-btn sa-btn--primary" id="sa-add-quote">+ Nueva Cotización</button>
      </div>
      <div class="sa-card-list">
        ${cards || '<div style="text-align:center;color:var(--text-secondary);padding:var(--space-6);">No hay cotizaciones</div>'}
      </div>
    `;

    content.querySelector('#sa-add-quote')?.addEventListener('click', () => this._showQuoteModal());

    content.querySelectorAll('[data-view-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = this.quotes.find(x => x.id === btn.dataset.viewQuote);
        if (q) this._showQuoteDetailModal(q);
      });
    });

    content.querySelectorAll('[data-edit-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = this.quotes.find(x => x.id === btn.dataset.editQuote);
        if (q) this._showQuoteModal(q);
      });
    });

    content.querySelectorAll('[data-delete-quote]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar esta cotización?')) return;
        try {
          await userAuth.deleteQuote(btn.dataset.deleteQuote);
          Toast.success('Cotización eliminada');
          await this._loadData();
          this._renderTab();
        } catch (e) { Toast.error('Error: ' + e.message); }
      });
    });
  }

  // ─── QUOTE CREATION/EDIT MODAL ──────────────────────

  _showQuoteModal(existing = null) {
    const userOptions = this.users.filter(u => u.role === 'client').map(u =>
      `<option value="${u.phone || u.id}" ${existing?.clientPhone === (u.phone || u.id) ? 'selected' : ''}>${u.name || u.phone || u.id}</option>`
    ).join('');
    const bizOptions = this.businesses.map(b =>
      `<option value="${b.id}" ${existing?.businessId === b.id ? 'selected' : ''}>${b.nombre}</option>`
    ).join('');

    const existingItems = existing?.items || [{ description: '', amount: '' }];

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width:520px;max-height:85vh;overflow-y:auto;">
          <h3 class="sa-modal-title">${existing ? 'Editar' : 'Nueva'} Cotización</h3>
          <div class="sa-acuerdo-grid">
            <div class="sa-form-group">
              <label class="sa-form-label">Cliente</label>
              <select class="sa-form-select" id="sa-q-client">${userOptions}</select>
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Negocio</label>
              <select class="sa-form-select" id="sa-q-biz">${bizOptions}</select>
            </div>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Items</label>
            <div id="sa-q-items">
              ${existingItems.map((item, i) => `
                <div class="sa-quote-item-input" data-item="${i}">
                  <input class="sa-form-input" placeholder="Descripción" value="${item.description || ''}" data-field="desc">
                  <input class="sa-form-input" type="number" min="0" step="0.01" placeholder="$0.00" value="${item.amount || ''}" data-field="amount" inputmode="decimal" style="max-width:120px;">
                  <button class="sa-btn sa-btn--danger" style="padding:4px 8px;font-size:0.8rem;" data-remove-item="${i}">×</button>
                </div>
              `).join('')}
            </div>
            <button class="sa-btn sa-btn--outline" style="width:100%;margin-top:var(--space-2);" id="sa-q-add-item">+ Agregar Item</button>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Notas (opcional)</label>
            <textarea class="sa-form-input" id="sa-q-notes" rows="2" style="resize:vertical;min-height:48px;">${existing?.notes || ''}</textarea>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">${existing ? 'Guardar' : 'Crear Cotización'}</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    // Add item
    let itemCount = existingItems.length;
    root.querySelector('#sa-q-add-item').addEventListener('click', () => {
      const container = root.querySelector('#sa-q-items');
      const div = document.createElement('div');
      div.className = 'sa-quote-item-input';
      div.dataset.item = itemCount;
      div.innerHTML = `
        <input class="sa-form-input" placeholder="Descripción" data-field="desc">
        <input class="sa-form-input" type="number" min="0" step="0.01" placeholder="$0.00" data-field="amount" inputmode="decimal" style="max-width:120px;">
        <button class="sa-btn sa-btn--danger" style="padding:4px 8px;font-size:0.8rem;" data-remove-item="${itemCount}">×</button>
      `;
      container.appendChild(div);
      itemCount++;
      div.querySelector('[data-remove-item]').addEventListener('click', () => div.remove());
    });

    // Remove item handlers
    root.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.sa-quote-item-input').remove());
    });

    // Save
    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const clientPhone = root.querySelector('#sa-q-client').value;
      const clientUser = this.users.find(u => (u.phone || u.id) === clientPhone);
      const bizId = root.querySelector('#sa-q-biz').value;
      const biz = this.businesses.find(b => b.id === bizId);
      const notes = root.querySelector('#sa-q-notes').value.trim();

      const items = [];
      root.querySelectorAll('.sa-quote-item-input').forEach(row => {
        const desc = row.querySelector('[data-field="desc"]').value.trim();
        const amount = parseFloat(row.querySelector('[data-field="amount"]').value) || 0;
        if (desc && amount > 0) items.push({ description: desc, amount });
      });

      if (!items.length) { Toast.error('Agrega al menos un item'); return; }

      try {
        if (existing) {
          const subtotal = items.reduce((s, i) => s + i.amount, 0);
          await userAuth.updateQuote(existing.id, { items, subtotal, total: subtotal, notes, clientPhone, clientName: clientUser?.name || '', businessId: bizId, businessName: biz?.nombre || '' });
        } else {
          await userAuth.createQuote({ clientPhone, clientName: clientUser?.name || '', businessId: bizId, businessName: biz?.nombre || '', items, notes });
        }
        Toast.success(existing ? 'Cotización actualizada' : 'Cotización creada');
        closeModal();
        await this._loadData();
        this._renderTab();
      } catch (e) { Toast.error('Error: ' + e.message); }
    });
  }

  // ─── QUOTE DETAIL MODAL ─────────────────────────────

  _showQuoteDetailModal(q) {
    const QSTATUS = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', pagada: 'Pagada (Factura)' };
    const date = q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-PA', { dateStyle: 'long' }) : '-';
    const paidDate = q.paidAt ? new Date(q.paidAt).toLocaleDateString('es-PA', { dateStyle: 'long' }) : null;
    const acceptDate = q.acceptedAt ? new Date(q.acceptedAt).toLocaleDateString('es-PA', { dateStyle: 'long' }) : null;

    const itemRows = (q.items || []).map(i => `
      <tr>
        <td style="font-size:0.85rem;">${i.description}</td>
        <td style="font-size:0.85rem;text-align:right;white-space:nowrap;">$${(i.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width:520px;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4);">
            <div>
              <h3 class="sa-modal-title" style="margin:0;">${q.status === 'pagada' ? 'Factura' : 'Cotización'}</h3>
              <div style="font-size:0.78rem;color:var(--text-dim);">${date} · ID: ${q.id.substring(0, 8)}</div>
            </div>
            <span class="sa-badge sa-badge--${q.status === 'pagada' ? 'superadmin' : q.status === 'aceptada' ? 'admin' : 'client'}">${QSTATUS[q.status]}</span>
          </div>
          <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-4);font-size:0.85rem;">
            <div><span style="color:var(--text-muted);">Cliente:</span> <strong>${q.clientName || q.clientPhone}</strong></div>
            <div><span style="color:var(--text-muted);">Negocio:</span> <strong>${q.businessName || '-'}</strong></div>
          </div>
          <table class="superadmin-table" style="margin-bottom:var(--space-4);">
            <thead><tr><th>Descripción</th><th style="text-align:right;">Monto</th></tr></thead>
            <tbody>
              ${itemRows}
              <tr style="border-top:2px solid var(--glass-border);">
                <td style="font-weight:600;">Subtotal</td>
                <td style="font-weight:600;text-align:right;">$${(q.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${q.fee > 0 ? `<tr><td style="color:var(--text-muted);font-size:0.85rem;">Fee 3.5%</td><td style="text-align:right;font-size:0.85rem;">$${q.fee.toFixed(2)}</td></tr>` : ''}
              ${q.status === 'pagada' ? `<tr style="color:var(--neon-green);"><td style="font-weight:700;">Total Pagado</td><td style="font-weight:700;text-align:right;">$${(q.total || 0).toFixed(2)}</td></tr>` : ''}
            </tbody>
          </table>
          ${q.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-4);"><strong>Notas:</strong> ${q.notes}</div>` : ''}
          ${acceptDate ? `<div style="font-size:0.8rem;color:var(--text-muted);">Aceptada: ${acceptDate}</div>` : ''}
          ${paidDate ? `<div style="font-size:0.8rem;color:var(--neon-green);">Pagada: ${paidDate} · Método: ${q.paymentMethod || '-'}</div>` : ''}
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });
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
          <div class="sa-form-group">
            <label class="sa-form-label">Membresía Mensual ($/mes)</label>
            <input class="sa-form-input" id="sa-biz-recurrente" type="number" min="0" step="0.01" value="${existing?.acuerdo_recurrente || ''}" placeholder="0.00" inputmode="decimal">
          </div>
          <div class="sa-acuerdo-grid">
            <div class="sa-form-group">
              <label class="sa-form-label">Día de corte</label>
              <input class="sa-form-input" id="sa-biz-corte" type="number" min="1" max="31" value="${existing?.fecha_corte || ''}" placeholder="15" inputmode="numeric">
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Día de vencimiento</label>
              <input class="sa-form-input" id="sa-biz-vencimiento" type="number" min="1" max="31" value="${existing?.fecha_vencimiento || ''}" placeholder="20" inputmode="numeric">
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
      const fecha_corte = parseInt(root.querySelector('#sa-biz-corte').value) || 0;
      const fecha_vencimiento = parseInt(root.querySelector('#sa-biz-vencimiento').value) || 0;

      if (!id || !nombre) { Toast.error('ID y Nombre son requeridos'); return; }

      const saveBtn = root.querySelector('#sa-modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      try {
        if (pendingLogoFile) {
          logo = await this._optimizeImage(pendingLogoFile, 256, 0.7);
        }

        const bizData = { nombre, logo, contenido_valor, acuerdo_recurrente, fecha_corte, fecha_vencimiento };
        if (existing) {
          await userAuth.updateBusiness(existing.id, bizData);
        } else {
          await userAuth.createBusiness({ id, ...bizData });
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

  // ─── ADD CHARGE MODAL ────────────────────────────────────

  _showAddChargeModal(biz) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 440px;">
          <h3 class="sa-modal-title">Nuevo Cargo — ${biz.nombre}</h3>
          <div class="sa-form-group">
            <label class="sa-form-label">Tipo</label>
            <select class="sa-form-select" id="sa-charge-type">
              <option value="compra">Compra</option>
              <option value="servicio">Servicio</option>
              <option value="sesion">Sesión</option>
            </select>
          </div>
          <div class="sa-form-group">
            <label class="sa-form-label">Descripción</label>
            <input class="sa-form-input" id="sa-charge-desc" placeholder="Ej: Producto XYZ, Asesoría legal...">
          </div>
          <div class="sa-acuerdo-grid">
            <div class="sa-form-group">
              <label class="sa-form-label">Monto ($)</label>
              <input class="sa-form-input" id="sa-charge-amount" type="number" min="0" step="0.01" placeholder="0.00" inputmode="decimal">
            </div>
            <div class="sa-form-group">
              <label class="sa-form-label">Fecha</label>
              <input class="sa-form-input" id="sa-charge-date" type="date" value="${new Date().toISOString().substring(0, 10)}">
            </div>
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Crear Cargo</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const type = root.querySelector('#sa-charge-type').value;
      const description = root.querySelector('#sa-charge-desc').value.trim();
      const amount = parseFloat(root.querySelector('#sa-charge-amount').value) || 0;
      const date = root.querySelector('#sa-charge-date').value;

      if (!description || !amount) { Toast.error('Descripción y monto son requeridos'); return; }

      try {
        await userAuth.createCharge({
          businessId: biz.id,
          type,
          description,
          amount,
          date,
          month: this.selectedMonth,
        });
        Toast.success('Cargo creado');
        closeModal();
        this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
        this._renderStats();
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
    });
  }

  // ─── CHARGES DETAIL MODAL (Desktop) ────────────────────

  _showChargesModal(biz) {
    const charges = this.chargesData.filter(c => c.businessId === biz.id);
    const TYPE_LABELS = { membresia: 'Membresía', compra: 'Compra', servicio: 'Servicio', sesion: 'Sesión' };
    const totalMonth = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
    const porCobrar = charges.filter(c => c.status === 'por_cobrar').reduce((s, c) => s + c.amount, 0);

    const [year, monthNum] = this.selectedMonth.split('-');
    const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('es', { month: 'long' });
    const displayMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    const chargeRows = charges.map(c => {
      const paid = c.paidAmount || 0;
      const isCobrado = c.status === 'cobrado';
      return `
        <tr>
          <td style="font-size:0.8rem;color:var(--text-muted);">${c.date || '-'}</td>
          <td><span class="sa-charge-type-badge sa-charge-type-badge--${c.type}">${TYPE_LABELS[c.type] || c.type}</span></td>
          <td style="font-size:0.85rem;">${c.description}</td>
          <td style="font-size:0.85rem;white-space:nowrap;">$${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>${paid > 0 && !isCobrado ? `<span style="font-size:0.8rem;color:var(--text-muted);">$${paid.toFixed(2)}</span>` : '-'}</td>
          <td>
            <button class="sa-billing-toggle ${isCobrado ? 'sa-billing-toggle--cobrado' : ''}" data-modal-toggle="${c.id}">${isCobrado ? '✓ Cobrado' : 'Por cobrar'}</button>
          </td>
          <td>
            <div class="sa-table-actions">
              ${!isCobrado ? `<button class="sa-btn sa-btn--outline" style="font-size:0.7rem;" data-modal-abono="${c.id}">Abonar</button>` : ''}
              ${c.type !== 'membresia' ? `<button class="sa-btn sa-btn--danger" style="font-size:0.7rem;" data-modal-delete="${c.id}">×</button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');

    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 720px; max-height: 85vh; overflow-y: auto;">
          <h3 class="sa-modal-title">${biz.nombre} — ${displayMonth}</h3>
          <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-4);">
            <div style="font-size:0.85rem;color:var(--text-secondary);">Total: <strong>$${totalMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
            <div style="font-size:0.85rem;color:#f59e0b;">Pendiente: <strong>$${porCobrar.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
          </div>
          <div style="overflow-x:auto;">
            <table class="superadmin-table" style="min-width:600px;">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th><th>Abonado</th><th>Estatus</th><th>Acciones</th></tr></thead>
              <tbody>${chargeRows || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:var(--space-6);">Sin cargos</td></tr>'}</tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:var(--space-5);">
            <button class="sa-btn sa-btn--primary" id="sa-modal-add-charge">+ Agregar Cargo</button>
            <button class="sa-btn" id="sa-modal-cancel">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-add-charge')?.addEventListener('click', () => {
      closeModal();
      this._showAddChargeModal(biz);
    });

    root.querySelectorAll('[data-modal-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await userAuth.toggleChargeStatus(btn.dataset.modalToggle);
          this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
          this._renderStats();
          closeModal();
          this._showChargesModal(biz);
          this._renderTab();
        } catch (e) { Toast.error('Error: ' + e.message); }
      });
    });

    root.querySelectorAll('[data-modal-abono]').forEach(btn => {
      btn.addEventListener('click', () => {
        const charge = this.chargesData.find(c => c.id === btn.dataset.modalAbono);
        if (charge) { closeModal(); this._showAbonoModal(charge, biz); }
      });
    });

    root.querySelectorAll('[data-modal-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminar este cargo?')) return;
        try {
          await userAuth.deleteCharge(btn.dataset.modalDelete);
          this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
          Toast.success('Cargo eliminado');
          this._renderStats();
          closeModal();
          this._showChargesModal(biz);
          this._renderTab();
        } catch (e) { Toast.error('Error: ' + e.message); }
      });
    });
  }

  // ─── ABONO MODAL ────────────────────────────────────────

  _showAbonoModal(charge, biz = null) {
    const remaining = (charge.amount || 0) - (charge.paidAmount || 0);
    const root = document.getElementById('modal-root');
    root.classList.add('active');
    root.innerHTML = `
      <div class="sa-modal" id="sa-modal">
        <div class="sa-modal-content" style="max-width: 380px;">
          <h3 class="sa-modal-title">Registrar Abono</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-3);">${charge.description}</p>
          <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-4);font-size:0.85rem;">
            <div>Total: <strong>$${charge.amount.toFixed(2)}</strong></div>
            <div>Abonado: <strong>$${(charge.paidAmount || 0).toFixed(2)}</strong></div>
            <div style="color:#f59e0b;">Resta: <strong>$${remaining.toFixed(2)}</strong></div>
          </div>
          ${(charge.abonos || []).length ? `
            <div style="margin-bottom:var(--space-4);font-size:0.8rem;color:var(--text-muted);">
              <div style="font-weight:600;margin-bottom:var(--space-2);">Historial de abonos:</div>
              ${charge.abonos.map(a => `<div>$${a.amount.toFixed(2)} — ${new Date(a.date).toLocaleDateString('es-PA')}</div>`).join('')}
            </div>
          ` : ''}
          <div class="sa-form-group">
            <label class="sa-form-label">Monto del abono ($)</label>
            <input class="sa-form-input" id="sa-abono-amount" type="number" min="0.01" step="0.01" max="${remaining}" value="${remaining.toFixed(2)}" inputmode="decimal">
          </div>
          <div class="sa-form-actions">
            <button class="sa-btn" id="sa-modal-cancel">Cancelar</button>
            <button class="sa-btn sa-btn--primary" id="sa-modal-save">Registrar Abono</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => { root.innerHTML = ''; root.classList.remove('active'); };
    root.querySelector('#sa-modal-cancel').addEventListener('click', closeModal);
    root.querySelector('#sa-modal').addEventListener('click', (e) => { if (e.target.id === 'sa-modal') closeModal(); });

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const amount = parseFloat(root.querySelector('#sa-abono-amount').value) || 0;
      if (amount <= 0) { Toast.error('Monto inválido'); return; }

      try {
        await userAuth.addAbono(charge.id, amount);
        Toast.success(amount >= remaining ? 'Cargo cobrado' : 'Abono registrado');
        closeModal();
        this.chargesData = await userAuth.getAllChargesForMonth(this.selectedMonth);
        this._renderStats();
        if (biz) this._showChargesModal(biz);
        this._renderTab();
      } catch (e) {
        Toast.error('Error: ' + e.message);
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
