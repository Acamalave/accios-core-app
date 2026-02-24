import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';

export class SuperAdmin {
  constructor(container) {
    this.container = container;
    this.tab = 'users';
    this.users = [];
    this.businesses = [];
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
    [this.users, this.businesses] = await Promise.all([
      userAuth.getAllUsers(),
      userAuth.getAllBusinesses(),
    ]);
  }

  _renderStats() {
    const statsEl = this.container.querySelector('#sa-stats');
    if (!statsEl) return;

    const totalUsers = this.users.length;
    const totalBiz = this.businesses.length;
    const totalLinks = this.users.reduce((sum, u) => sum + (u.businesses || []).length, 0);

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
    `;
  }

  _renderTab() {
    const content = this.container.querySelector('#sa-content');
    if (this.tab === 'users') {
      this._renderUsers(content);
    } else if (this.tab === 'businesses') {
      this._renderBusinesses(content);
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
            <label class="sa-form-label">Logo URL (opcional)</label>
            <input class="sa-form-input" id="sa-biz-logo" value="${existing?.logo || ''}" placeholder="https://...">
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

    root.querySelector('#sa-modal-save').addEventListener('click', async () => {
      const id = root.querySelector('#sa-biz-id').value.trim().toLowerCase().replace(/\s+/g, '-');
      const nombre = root.querySelector('#sa-biz-nombre').value.trim();
      const logo = root.querySelector('#sa-biz-logo').value.trim();
      const contenido_valor = root.querySelector('#sa-biz-contenido').value.trim();

      if (!id || !nombre) { Toast.error('ID y Nombre son requeridos'); return; }

      try {
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
      }
    });
  }

  unmount() {}
}
