import userAuth from '../services/userAuth.js';

export class Home {
  constructor(container, currentUser) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businesses = [];
    this._animId = null;
    this._orbitals = [];
    this._centerGlow = null;
    this._pointLights = null;
    this._paused = false;        // orbit paused when a planet is clicked
    this._activeWorld = null;    // which world is currently emitting waves
  }

  async render() {
    const user = this.currentUser;
    const isSuperAdmin = user?.role === 'superadmin';

    this.container.innerHTML = `
      <section class="home-page">
        <div class="home-content">
          <div class="home-badge slide-up">Digital Ecosystem</div>
          <h1 class="home-title home-title--cinematic">
            <span class="gradient-text">ACCIOS</span> CORE
          </h1>
          <p class="home-subtitle slide-up">Tu ecosistema digital</p>
          <div style="text-align: center; padding: var(--space-6); color: var(--text-muted);">
            Cargando tu ecosistema...
          </div>
        </div>
      </section>
    `;

    try {
      if (isSuperAdmin) {
        this.businesses = await userAuth.getAllBusinesses();
      } else {
        this.businesses = await userAuth.getUserBusinesses(user?.phone);
      }
    } catch (e) {
      console.error('Failed to load businesses:', e);
      this.businesses = [];
    }

    this.container.innerHTML = `
      <section class="home-page">
        <div class="home-content">
          <div class="home-badge slide-up">Digital Ecosystem</div>
          <h1 class="home-title home-title--cinematic">
            <span class="gradient-text">ACCIOS</span> CORE
          </h1>
          <p class="home-subtitle slide-up">Tu ecosistema digital</p>

          ${this.businesses.length > 0 ? this._buildOrbitalSystem() : this._buildEmptyState()}
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

    this._attachListeners();

    if (this.businesses.length > 0) {
      this._initOrbitals();
      this._startAnimation();
    }
  }

  _buildOrbitalSystem() {
    const worlds = this.businesses.map((biz, index) => {
      return `
        <div class="orbit-world" data-business-id="${biz.id}" data-orbit-index="${index}">
          <div class="orbit-world-glow"></div>
          <div class="orbit-world-ripples"></div>
          <div class="orbit-world-img">
            ${biz.logo
              ? `<img src="${biz.logo}" alt="${biz.nombre}" draggable="false" />`
              : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <rect x="2" y="3" width="20" height="14" rx="2"/>
                   <line x1="8" y1="21" x2="16" y2="21"/>
                   <line x1="12" y1="17" x2="12" y2="21"/>
                 </svg>`
            }
          </div>
          <span class="orbit-world-name">${biz.nombre}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="orbital-system" id="orbital-system-3d">
        <div class="orbital-ring"></div>
        <div class="orbital-ring orbital-ring--inner"></div>

        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <div class="orbital-center">
          <div class="orbital-center-glow" id="orbital-center-glow"></div>
          <div class="orbital-center-ring"></div>
          <div class="orbital-center-ring orbital-center-ring--reverse"></div>
          <span class="orbital-center-text">AC</span>
        </div>

        ${worlds}
      </div>
    `;
  }

  // ─── Solar System Engine ──────────────────────────────

  _initOrbitals() {
    const count = this.businesses.length;
    const TILT = 1.25;
    const SPEED = 0.0012;

    this._orbitals = this.businesses.map((biz, i) => {
      const thetaOffset = (Math.PI * 2 / count) * i;
      return {
        index: i,
        theta: thetaOffset,
        speed: SPEED,
        tilt: TILT,
        el: null,
        glowEl: null,
        nameEl: null,
        ripplesEl: null,
      };
    });

    const system = this.container.querySelector('#orbital-system-3d');
    if (!system) return;

    this._centerGlow = this.container.querySelector('#orbital-center-glow');
    this._pointLights = this.container.querySelector('#orbital-point-lights');

    const worldEls = system.querySelectorAll('.orbit-world');
    worldEls.forEach((el, i) => {
      if (this._orbitals[i]) {
        this._orbitals[i].el = el;
        this._orbitals[i].glowEl = el.querySelector('.orbit-world-glow');
        this._orbitals[i].nameEl = el.querySelector('.orbit-world-name');
        this._orbitals[i].ripplesEl = el.querySelector('.orbit-world-ripples');
      }
    });

    if (this._pointLights) {
      this._pointLights.innerHTML = this._orbitals.map((_, i) =>
        `<div class="point-light" data-light="${i}"></div>`
      ).join('');
    }
  }

  _startAnimation() {
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (!systemEl) return;

    const getRect = () => systemEl.getBoundingClientRect();
    const focalLength = 600;

    const animate = () => {
      this._animId = requestAnimationFrame(animate);

      const r = getRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      const orbitRadius = Math.min(cx, cy) * 0.68;

      let totalGlow = 0;

      for (const orb of this._orbitals) {
        if (!orb.el) continue;

        // Only advance orbit if NOT paused
        if (!this._paused) {
          orb.theta += orb.speed;
        }

        const cosT = Math.cos(orb.theta);
        const sinT = Math.sin(orb.theta);

        const x = orbitRadius * cosT;
        const zOrbit = orbitRadius * sinT;

        const cosTilt = Math.cos(orb.tilt);
        const sinTilt = Math.sin(orb.tilt);
        const y = zOrbit * sinTilt;
        const z = zOrbit * cosTilt;

        const perspective = focalLength / (focalLength + z);
        const screenX = cx + x * perspective;
        const screenY = cy - y * perspective;

        const zNorm = (z + orbitRadius) / (2 * orbitRadius);

        // ─── Larger planets, fully sharp, no blur ───
        const scale = 0.65 + zNorm * 0.55;          // 0.65 → 1.2
        const opacity = 0.45 + zNorm * 0.55;         // 0.45 → 1.0
        const zIndex = Math.round(zNorm * 100);
        const borderAlpha = 0.12 + zNorm * 0.33;
        const shadowSpread = zNorm * 24;
        const nameOpacity = 0.2 + zNorm * 0.8;

        // Apply — NO blur, fully crisp always
        orb.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        orb.el.style.left = `${screenX.toFixed(1)}px`;
        orb.el.style.top = `${screenY.toFixed(1)}px`;
        orb.el.style.opacity = opacity.toFixed(3);
        orb.el.style.filter = 'none';
        orb.el.style.zIndex = zIndex;

        // Dynamic sphere shadow
        const imgEl = orb.el.querySelector('.orbit-world-img');
        if (imgEl) {
          imgEl.style.borderColor = `rgba(124, 58, 237, ${borderAlpha.toFixed(3)})`;
          imgEl.style.boxShadow = `
            inset 0 -5px 12px rgba(0, 0, 0, ${(0.15 + (1 - zNorm) * 0.2).toFixed(3)}),
            inset 0 3px 8px rgba(167, 139, 250, ${(borderAlpha * 0.15).toFixed(3)}),
            0 0 ${shadowSpread.toFixed(0)}px rgba(124, 58, 237, ${(borderAlpha * 0.4).toFixed(3)}),
            0 ${Math.round(3 + zNorm * 5)}px ${Math.round(6 + zNorm * 10)}px rgba(0, 0, 0, ${(0.15 + zNorm * 0.1).toFixed(3)})
          `;
        }

        if (orb.nameEl) {
          orb.nameEl.style.opacity = nameOpacity.toFixed(3);
        }

        if (orb.glowEl) {
          const glowOpacity = Math.max(0, (zNorm - 0.5) * 2) * 0.5;
          orb.glowEl.style.opacity = glowOpacity.toFixed(3);
        }

        // Point Light
        const proximity = 1 - Math.min(Math.sqrt(x * x + (y * 0.5) * (y * 0.5)) / orbitRadius, 1);
        const lightIntensity = zNorm > 0.4 ? Math.pow(proximity, 2) * 0.3 : 0;
        totalGlow += lightIntensity;

        if (this._pointLights) {
          const lightEl = this._pointLights.querySelector(`[data-light="${orb.index}"]`);
          if (lightEl) {
            lightEl.style.left = `${screenX.toFixed(1)}px`;
            lightEl.style.top = `${screenY.toFixed(1)}px`;
            lightEl.style.opacity = (lightIntensity * 1.2).toFixed(3);
            lightEl.style.transform = `translate(-50%, -50%) scale(${(0.4 + lightIntensity * 1.5).toFixed(2)})`;
          }
        }
      }

      if (this._centerGlow) {
        const centerIntensity = Math.min(totalGlow, 1);
        const glowScale = 1 + centerIntensity * 0.3;
        this._centerGlow.style.opacity = (0.25 + centerIntensity * 0.45).toFixed(3);
        this._centerGlow.style.transform = `scale(${glowScale.toFixed(3)})`;
      }
    };

    // Entrance animation
    const worldEls = this.container.querySelectorAll('.orbit-world');
    worldEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.3)';
      setTimeout(() => {
        el.style.transition = 'opacity 1s cubic-bezier(0.22, 1, 0.36, 1), transform 1s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.opacity = '1';
        setTimeout(() => {
          el.style.transition = 'none';
        }, 1100);
      }, 500 + i * 250);
    });

    this._animId = requestAnimationFrame(animate);
  }

  // ─── Ripple wave spawner ───
  _spawnRipples(worldEl) {
    const ripplesContainer = worldEl.querySelector('.orbit-world-ripples');
    if (!ripplesContainer) return;

    // Clear previous ripples
    ripplesContainer.innerHTML = '';

    // Spawn 3 staggered ripple waves
    for (let i = 0; i < 3; i++) {
      const ripple = document.createElement('div');
      ripple.className = 'ripple-wave';
      ripple.style.animationDelay = `${i * 0.4}s`;
      ripplesContainer.appendChild(ripple);

      // Clean up after animation
      ripple.addEventListener('animationend', () => {
        ripple.remove();
      }, { once: true });
    }
  }

  _buildEmptyState() {
    return `
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
    `;
  }

  _attachListeners() {
    this.container.querySelector('#home-superadmin-btn')?.addEventListener('click', () => {
      window.location.hash = '#superadmin';
    });

    this.container.querySelector('#home-logout')?.addEventListener('click', () => {
      userAuth.clearSession();
      window.location.hash = '#login';
      window.location.reload();
    });

    // IDs that show the "coming soon" popup
    const comingSoonIds = ['xazai', 'gregoria'];

    // Business world clicks — pause orbit + emit frequency waves
    this.container.querySelectorAll('.orbit-world').forEach(world => {
      world.addEventListener('click', () => {
        if (this._activeWorld === world) {
          this._paused = false;
          this._activeWorld = null;
          world.classList.remove('orbit-world--active');
          return;
        }

        if (this._activeWorld) {
          this._activeWorld.classList.remove('orbit-world--active');
        }

        this._paused = true;
        this._activeWorld = world;
        world.classList.add('orbit-world--active');

        this._spawnRipples(world);

        this._rippleInterval && clearInterval(this._rippleInterval);
        this._rippleInterval = setInterval(() => {
          if (this._activeWorld === world) {
            this._spawnRipples(world);
          } else {
            clearInterval(this._rippleInterval);
          }
        }, 1600);

        // Show coming-soon popup for specific businesses
        const bizId = world.dataset.businessId;
        if (comingSoonIds.includes(bizId)) {
          const bizName = world.querySelector('.orbit-world-name')?.textContent || bizId;
          this._showComingSoonPopup(bizName);
        }
      });
    });

    // Click on empty space → resume orbit
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (systemEl) {
      systemEl.addEventListener('click', (e) => {
        if (e.target === systemEl || e.target.classList.contains('orbital-ring') || e.target.classList.contains('orbital-center')) {
          if (this._paused) {
            this._paused = false;
            if (this._activeWorld) {
              this._activeWorld.classList.remove('orbit-world--active');
              this._activeWorld = null;
            }
            this._rippleInterval && clearInterval(this._rippleInterval);
          }
        }
      });
    }
  }

  // ─── Futuristic "Coming Soon" popup ───
  _showComingSoonPopup(businessName) {
    // Remove any existing popup
    const existing = document.querySelector('.coming-soon-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'coming-soon-overlay';
    overlay.innerHTML = `
      <div class="coming-soon-popup">
        <div class="coming-soon-scanline"></div>
        <div class="coming-soon-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="coming-soon-badge">En desarrollo</div>
        <h3 class="coming-soon-title">${businessName}</h3>
        <p class="coming-soon-text">
          Estamos construyendo este ecosistema digital.<br>
          Muy pronto estara disponible.
        </p>
        <div class="coming-soon-bar">
          <div class="coming-soon-bar-fill"></div>
        </div>
        <button class="coming-soon-close">Entendido</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('coming-soon-overlay--visible');
    });

    // Close handlers
    const close = () => {
      overlay.classList.remove('coming-soon-overlay--visible');
      overlay.classList.add('coming-soon-overlay--closing');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('.coming-soon-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  unmount() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._rippleInterval) {
      clearInterval(this._rippleInterval);
    }
  }
}
