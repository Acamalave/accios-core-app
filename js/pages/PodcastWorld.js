import userAuth from '../services/userAuth.js';

export class PodcastWorld {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';
    this.episodes = [];
    this._currentSlide = 0;
    this._totalSlides = 0;
    this._scrollTimer = null;
    this._keyHandler = null;
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
    this._totalSlides = this.episodes.length + 1; // +1 for "coming soon"

    // Build dot indicators
    const dots = Array.from({ length: this._totalSlides }, (_, i) =>
      `<button class="pw-dot${i === 0 ? ' pw-dot--active' : ''}" data-dot="${i}"></button>`
    ).join('');

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

          <div class="pw-slider-wrap">
            <!-- Left arrow -->
            <button class="pw-nav-arrow pw-nav-arrow--left" id="pw-arrow-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <!-- Slider track -->
            <div class="pw-episodes" id="pw-episodes">
              ${this.episodes.map(ep => this._buildEpisodeCard(ep)).join('')}
              ${this._buildComingSoonCard()}
            </div>

            <!-- Right arrow -->
            <button class="pw-nav-arrow pw-nav-arrow--right" id="pw-arrow-right">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <!-- Dot indicators -->
          <div class="pw-dots" id="pw-dots">
            ${dots}
          </div>
        </div>

        <!-- Spotlight effect -->
        <div class="pw-spotlight"></div>
      </div>
    `;

    this._attachListeners();
    this._initSlider();

    // Entrance animation — cards slide in from the right
    requestAnimationFrame(() => {
      const cards = this.container.querySelectorAll('.pw-ep-card, .pw-ep-soon');
      cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(60px) scale(0.92)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
          card.style.opacity = '1';
          card.style.transform = 'translateX(0) scale(1)';
        }, 200 + i * 120);
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

  _initSlider() {
    const track = this.container.querySelector('#pw-episodes');
    if (!track) return;

    // Listen to scroll events to update active dot
    track.addEventListener('scroll', () => {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => this._updateActiveDot(), 80);
    }, { passive: true });

    // Keyboard navigation
    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this._scrollToCard(this._currentSlide - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this._scrollToCard(this._currentSlide + 1);
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _scrollToCard(index) {
    const clamped = Math.max(0, Math.min(index, this._totalSlides - 1));
    const track = this.container.querySelector('#pw-episodes');
    if (!track) return;

    const cards = track.querySelectorAll('.pw-ep-card, .pw-ep-soon');
    if (!cards[clamped]) return;

    const card = cards[clamped];
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // Calculate scroll position to center the card
    const scrollLeft = track.scrollLeft + (cardRect.left - trackRect.left) - (trackRect.width / 2) + (cardRect.width / 2);
    track.scrollTo({ left: scrollLeft, behavior: 'smooth' });

    this._currentSlide = clamped;
    this._setActiveDot(clamped);
  }

  _updateActiveDot() {
    const track = this.container.querySelector('#pw-episodes');
    if (!track) return;

    const cards = track.querySelectorAll('.pw-ep-card, .pw-ep-soon');
    const trackCenter = track.getBoundingClientRect().left + track.getBoundingClientRect().width / 2;

    let closestIndex = 0;
    let closestDist = Infinity;

    cards.forEach((card, i) => {
      const cardCenter = card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
      const dist = Math.abs(cardCenter - trackCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });

    this._currentSlide = closestIndex;
    this._setActiveDot(closestIndex);
  }

  _setActiveDot(index) {
    const dots = this.container.querySelectorAll('.pw-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('pw-dot--active', i === index);
    });
  }

  _attachListeners() {
    // Back button
    this.container.querySelector('#pw-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // Episode card clicks
    this.container.querySelectorAll('.pw-ep-card').forEach(card => {
      card.addEventListener('click', () => {
        const epId = card.dataset.episode;
        window.location.hash = `#dashboard/${this.businessId}/${epId}`;
      });
    });

    // Arrow navigation
    this.container.querySelector('#pw-arrow-left')?.addEventListener('click', () => {
      this._scrollToCard(this._currentSlide - 1);
    });

    this.container.querySelector('#pw-arrow-right')?.addEventListener('click', () => {
      this._scrollToCard(this._currentSlide + 1);
    });

    // Dot navigation
    this.container.querySelectorAll('.pw-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.dot, 10);
        this._scrollToCard(index);
      });
    });
  }

  unmount() {
    // Clean up keyboard listener
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    clearTimeout(this._scrollTimer);
  }
}
