import userAuth from '../services/userAuth.js';

export class PodcastWorld {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';
    this.episodes = [];
  }

  async render() {
    // Show loading
    this.container.innerHTML = `
      <div class="pw-page">
        <div class="pw-curtain">
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
        </div>
        <div class="pw-curtain-vignette"></div>
        <div class="pw-stage-floor"></div>
        <div class="pw-content">
          <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary);">Cargando capitulos...</div>
        </div>
        <div class="pw-spotlight"></div>
      </div>
    `;

    // Load episodes from Firestore
    this.episodes = await userAuth.getEpisodesByBusiness(this.businessId);
    this.episodes.sort((a, b) => (a.num || '').localeCompare(b.num || ''));

    // Render full page
    this.container.innerHTML = `
      <div class="pw-page">
        <!-- Curtain background -->
        <div class="pw-curtain">
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
          <div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div><div class="pw-curtain-fold"></div>
        </div>
        <div class="pw-curtain-vignette"></div>

        <!-- Stage floor reflection -->
        <div class="pw-stage-floor"></div>

        <!-- Content -->
        <div class="pw-content">
          <header class="pw-header">
            <button class="pw-back" id="pw-back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div class="pw-brand">
              <span class="pw-brand-tag">PODCAST</span>
              <span class="pw-brand-name">Manual de Nadie</span>
            </div>
          </header>

          <div class="pw-stage-label">
            <div class="pw-stage-line"></div>
            <span>CAPITULOS</span>
            <div class="pw-stage-line"></div>
          </div>

          <div class="pw-episodes" id="pw-episodes">
            ${this.episodes.map(ep => this._buildEpisodeCard(ep)).join('')}
            ${this._buildComingSoonCard()}
          </div>
        </div>

        <!-- Spotlight effect -->
        <div class="pw-spotlight"></div>
      </div>
    `;

    this._attachListeners();

    // Entrance animation
    requestAnimationFrame(() => {
      const cards = this.container.querySelectorAll('.pw-ep-card, .pw-ep-soon');
      cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.95)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        }, 300 + i * 150);
      });
    });
  }

  _buildEpisodeCard(ep) {
    return `
      <button class="pw-ep-card" data-episode="${ep.id}">
        <div class="pw-ep-tab">
          <span class="pw-ep-tab-num">EP. ${ep.num}</span>
        </div>
        <div class="pw-ep-card-body">
          <div class="pw-ep-card-top">
            <span class="pw-ep-status pw-ep-status--${(ep.status || '').replace(/\s/g, '-')}">${ep.status || 'borrador'}</span>
            <span class="pw-ep-duration">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${ep.duration || '-'}
            </span>
          </div>
          <h2 class="pw-ep-title">${ep.title}</h2>
          <p class="pw-ep-quote">&ldquo;${ep.quote || ''}&rdquo;</p>
          <div class="pw-ep-cta">
            <span>Ver Master Plan</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      </button>
    `;
  }

  _buildComingSoonCard() {
    return `
      <div class="pw-ep-soon">
        <div class="pw-ep-soon-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <span class="pw-ep-soon-text">Proximo capitulo en produccion</span>
      </div>
    `;
  }

  _attachListeners() {
    this.container.querySelector('#pw-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    this.container.querySelectorAll('.pw-ep-card').forEach(card => {
      card.addEventListener('click', () => {
        const epId = card.dataset.episode;
        window.location.hash = `#dashboard/${this.businessId}/${epId}`;
      });
    });
  }

  unmount() {}
}
