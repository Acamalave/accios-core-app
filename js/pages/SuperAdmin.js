import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';

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
  }

  _renderStats() {
    const statsEl = this.container.querySelector('#sa-stats');
    if (!statsEl) return;

    const totalUsers = this.users.length;
    const totalBiz = this.businesses.length;
    const totalLinks = this.users.reduce((sum, u) => sum + (u.businesses || []).length, 0);
    const totalOnboarding = this.onboardingResponses.length;
    const completedOnboarding = this.onboardingResponses.filter(r => r.completedAt).length;
    const totalEpisodes = this.episodes.length;
    const unreadComments = this.comments.filter(c => !c.read).length;
    const pendingAppts = this.appointments.filter(a => a.status === 'pendiente').length;

    statsEl.innerHTML = `
      <div class="glass-card sa-stat">
        <div class="sa-stat-value">${totalUsers}</div>
        <div class="sa-stat-label">Usuarios</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value">${totalBiz}</div>
        <div class="sa-stat-label">Negocios</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value">${totalLinks}</div>
        <div class="sa-stat-label">Vinculos</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value">${completedOnboarding}/${totalOnboarding}</div>
        <div class="sa-stat-label">Expedientes</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value">${totalEpisodes}</div>
        <div class="sa-stat-label">Capitulos</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value" style="${unreadComments > 0 ? 'color: #ef4444;' : ''}">${unreadComments}</div>
        <div class="sa-stat-label">Sin Leer</div>
      </div>
      <div class="glass-card sa-stat">
        <div class="sa-stat-value" style="${pendingAppts > 0 ? 'color: #f59e0b;' : ''}">${pendingAppts}</div>
        <div class="sa-stat-label">Citas Pend.</div>
      </div>
    `;

    // Update badges
    this._updateCommentBadge();
    this._updateApptBadge();
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
    } else {
      this._renderLinking(content);
    }
  }

  // ─── USERS TAB ─────────────────────────────────────────

  _renderUsers(content) {
    const rows = this.users.map(user => `
      <tr>
        <td><strong>${user.name || '-'}</strong></td>
        <td>${user.phone || user.id}</td>
        <td><span class="sa-badge sa-badge--${user.role || 'client'}">${user.role || 'client'}</span></td>
        <td>
          <div class="sa-biz-tags">
            ${(user.businesses || []).map(b => {
              const biz = this.businesses.find(x => x.id === b);
              return `<span class="sa-biz-tag">${biz?.nombre || b}</span>`;
            }).join('') || '<span style="color: var(--text-muted); font-size: 0.8rem;">ninguno</span>'}
          </div>
        </td>
        <td>
          <div style="display: flex; gap: var(--space-2);">
            <button class="sa-btn" data-edit-user="${user.phone || user.id}">Editar</button>
            <button class="sa-btn sa-btn--danger" data-delete-user="${user.phone || user.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-user">+ Nuevo Usuario</button>
      </div>
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>Telefono</th><th>Rol</th><th>Negocios</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay usuarios</td></tr>'}</tbody>
        </table>
      </div>
    `;

    content.querySelector('#sa-add-user')?.addEventListener('click', () => this._showUserModal());

    content.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = this.users.find(u => (u.phone || u.id) === btn.dataset.editUser);
        if (user) this._showUserModal(user);
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
  }

  // ─── BUSINESSES TAB ────────────────────────────────────

  _renderBusinesses(content) {
    const rows = this.businesses.map(biz => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            ${biz.logo ? `<img src="${biz.logo}" alt="" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;">` : ''}
            <strong>${biz.nombre}</strong>
          </div>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${biz.id}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); font-size: 0.85rem;">${biz.contenido_valor || '-'}</td>
        <td>
          <div style="display: flex; gap: var(--space-2);">
            <button class="sa-btn" data-edit-biz="${biz.id}">Editar</button>
            <button class="sa-btn sa-btn--danger" data-delete-biz="${biz.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

    content.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-4);">
        <button class="sa-btn sa-btn--primary" id="sa-add-biz">+ Nuevo Negocio</button>
      </div>
      <div class="glass-card" style="overflow-x: auto; padding: 0;">
        <table class="superadmin-table">
          <thead>
            <tr><th>Nombre</th><th>ID</th><th>Contenido</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: var(--space-6);">No hay negocios</td></tr>'}</tbody>
        </table>
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
          await userAuth.updateBusiness(existing.id, { nombre, logo, contenido_valor });
        } else {
          await userAuth.createBusiness({ id, nombre, logo, contenido_valor });
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

  unmount() {}
}
