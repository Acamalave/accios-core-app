import userAuth from '../services/userAuth.js';

export class Home {
  constructor(container, currentUser) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businesses = [];
  }

  async render() {
    const user = this.currentUser;
    const isSuperAdmin = user?.role === 'superadmin';

    // Show loading state
    this.container.innerHTML = `
      <section class="home-page">
        <div class="home-content">
          <div class="home-badge slide-up">Digital Ecosystem</div>
          <h1 class="home-title home-title--cinematic">
            <span class="gradient-text">ACCIOS CORE</span>
          </h1>
          <p class="home-subtitle slide-up">Digital Ecosystem</p>
          <div style="text-align: center; padding: var(--space-6); color: var(--text-muted);">
            Cargando tu ecosistema...
          </div>
        </div>
      </section>
    `;

    // Fetch user's linked businesses from Firestore
    try {
      this.businesses = await userAuth.getUserBusinesses(user?.phone);
    } catch (e) {
      console.error('Failed to load businesses:', e);
      this.businesses = [];
    }

    // Re-render with actual data
    this.container.innerHTML = `
      <section class="home-page">
        <div class="home-content">
          <div class="home-badge slide-up">Digital Ecosystem</div>
          <h1 class="home-title home-title--cinematic">
            <span class="gradient-text">ACCIOS CORE</span>
          </h1>
          <p class="home-subtitle slide-up">Digital Ecosystem</p>

          ${this.businesses.length > 0 ? `
            <div class="home-cards monolith-stagger">
              ${this._buildCards()}
            </div>
          ` : `
            <div class="home-empty fade-in">
              <div class="home-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h2 class="home-empty-title">Sin negocios vinculados</h2>
              <p class="home-empty-text">
                Aun no tienes unidades de negocio asignadas a tu perfil.
                Contacta al administrador para que vincule los negocios a tu cuenta.
              </p>
            </div>
          `}
        </div>

        <div class="home-actions">
          ${isSuperAdmin ? `
            <button class="home-admin" id="home-superadmin-btn" title="Super Admin" style="position: fixed; top: var(--space-5); right: var(--space-5);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
          ` : ''}
          <button class="home-action-btn" id="home-logout" title="Cerrar sesion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Salir</span>
          </button>
        </div>
      </section>
    `;

    // Stagger scanline delays
    this.container.querySelectorAll('.home-card-scanline').forEach((el, i) => {
      el.style.setProperty('--scan-delay', `${i * 1.2}s`);
    });

    this._attachListeners();
  }

  _buildCards() {
    const hudElements = `
      <div class="home-card-scanline"></div>
      <div class="home-card-hud home-card-hud--tl"></div>
      <div class="home-card-hud home-card-hud--tr"></div>
      <div class="home-card-hud home-card-hud--bl"></div>
      <div class="home-card-hud home-card-hud--br"></div>
    `;
    const indicator = `<div class="home-card-indicator"></div>`;
    const reflection = `<div class="monolith-reflection" aria-hidden="true"></div>`;

    let cards = this.businesses.map(biz => {
      const hasContent = biz.contenido_valor && biz.contenido_valor.trim().length > 0;

      return `
        <div class="monolith-wrapper">
          <div class="home-card" data-business-id="${biz.id}" data-has-content="${hasContent}" style="cursor: pointer;">
            <div class="home-card-glow"></div>
            ${hudElements}
            <div class="home-card-photo">
              ${biz.logo ? `<img src="${biz.logo}" alt="${biz.nombre}" />` : `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--purple-400);">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              `}
            </div>
            <h2 class="home-card-title">${biz.nombre}</h2>
            ${indicator}
          </div>
          ${reflection}
        </div>
      `;
    }).join('');

    // "Proximamente" card
    cards += `
      <div class="monolith-wrapper">
        <div class="home-card home-card--coming">
          <div class="home-card-glow"></div>
          ${hudElements}
          <div class="home-card-photo home-card-photo--plus">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <h2 class="home-card-title">Proximamente</h2>
          ${indicator}
        </div>
        ${reflection}
      </div>
    `;

    return cards;
  }

  _attachListeners() {
    // SuperAdmin button
    this.container.querySelector('#home-superadmin-btn')?.addEventListener('click', () => {
      window.location.hash = '#superadmin';
    });

    // Logout
    this.container.querySelector('#home-logout')?.addEventListener('click', () => {
      userAuth.clearSession();
      window.location.hash = '#login';
      window.location.reload();
    });

    // Business card clicks — show coming-soon or content popup
    this.container.querySelectorAll('[data-business-id]').forEach(card => {
      card.addEventListener('click', () => {
        const bizId = card.dataset.businessId;
        const biz = this.businesses.find(b => b.id === bizId);
        if (biz) {
          this._showBusinessPopup(biz);
        }
      });
    });
  }

  _showBusinessPopup(biz) {
    const root = document.getElementById('modal-root');
    root.classList.add('active');

    const hasContent = biz.contenido_valor && biz.contenido_valor.trim().length > 0;

    if (hasContent) {
      root.innerHTML = `
        <div class="coming-soon-overlay" id="biz-overlay">
          <div class="coming-soon-popup" style="max-width: 600px;">
            ${biz.logo ? `
              <div class="coming-soon-logo">
                <img src="${biz.logo}" alt="${biz.nombre}" />
              </div>
            ` : ''}
            <h2 class="coming-soon-title"><strong>${biz.nombre}</strong></h2>
            <div style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8; text-align: left; white-space: pre-wrap; margin-bottom: var(--space-5);">${this._escapeHtml(biz.contenido_valor)}</div>
            <button class="login-btn" id="biz-popup-close" style="max-width: 200px; margin: 0 auto;">
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      `;
    } else {
      root.innerHTML = `
        <div class="coming-soon-overlay" id="biz-overlay">
          <div class="coming-soon-popup">
            <div class="coming-soon-gears">
              <svg class="coming-soon-gear coming-soon-gear--big" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <svg class="coming-soon-gear coming-soon-gear--small" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            ${biz.logo ? `
              <div class="coming-soon-logo">
                <img src="${biz.logo}" alt="${biz.nombre}" />
              </div>
            ` : ''}
            <h2 class="coming-soon-title">Estamos trabajando en<br><strong>${biz.nombre}</strong></h2>
            <p class="coming-soon-text">Nuestro equipo esta construyendo algo increible. Muy pronto podras gestionar todo desde aqui.</p>
            <div class="coming-soon-progress">
              <div class="coming-soon-progress-bar"></div>
            </div>
            <p class="coming-soon-hint">Vuelve pronto para ver mas</p>
            <button class="login-btn" id="biz-popup-close" style="max-width: 200px; margin: 0 auto;">
              <span>Entendido</span>
            </button>
          </div>
        </div>
      `;
    }

    const closePopup = () => { root.innerHTML = ''; root.classList.remove('active'); };
    const overlay = root.querySelector('#biz-overlay');
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
    root.querySelector('#biz-popup-close')?.addEventListener('click', closePopup);
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  unmount() {}
}
