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
  }

  async render() {
    const user = this.currentUser;
    const isSuperAdmin = user?.role === 'superadmin';

    // Loading state
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

    // Role-based business fetching
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

    // Render with orbital layout
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
        <!-- Single visible orbital ring (the track planets follow) -->
        <div class="orbital-ring"></div>
        <div class="orbital-ring orbital-ring--inner"></div>

        <!-- Point lights container -->
        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <!-- Central Hub -->
        <div class="orbital-center">
          <div class="orbital-center-glow" id="orbital-center-glow"></div>
          <div class="orbital-center-ring"></div>
          <div class="orbital-center-ring orbital-center-ring--reverse"></div>
          <span class="orbital-center-text">AC</span>
        </div>

        <!-- Business Worlds (positioned by JS on the single orbit) -->
        ${worlds}
      </div>
    `;
  }

  // ─── Solar System Engine ──────────────────────────────
  // All businesses orbit on ONE tilted plane (like Saturn's rings)
  // The tilt creates 3D depth — back half = smaller/dimmer, front half = larger/sharper

  _initOrbitals() {
    const count = this.businesses.length;

    // Orbital plane tilt (radians) — ~72° gives a more frontal perspective
    // Higher = more "top-down", lower = more "side view"
    const TILT = 1.25;
    // All businesses share one speed — slow, elegant motion
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
      };
    });

    // Get DOM references
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
      }
    });

    // Create point light elements
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
      const orbitRadius = Math.min(cx, cy) * 0.7;

      let totalGlow = 0;

      for (const orb of this._orbitals) {
        if (!orb.el) continue;

        // Advance orbit — slow, unified speed
        orb.theta += orb.speed;

        // ─── Single Plane 3D Math ───
        // Circle in the XZ plane
        const cosT = Math.cos(orb.theta);
        const sinT = Math.sin(orb.theta);

        const x = orbitRadius * cosT;
        const zOrbit = orbitRadius * sinT;

        // Tilt the plane — this "folds" the circle into 3D
        const cosTilt = Math.cos(orb.tilt);
        const sinTilt = Math.sin(orb.tilt);
        const y = zOrbit * sinTilt;   // vertical displacement from tilt
        const z = zOrbit * cosTilt;   // depth (behind/in front)

        // Perspective projection
        const perspective = focalLength / (focalLength + z);
        const screenX = cx + x * perspective;
        const screenY = cy - y * perspective;

        // Depth normalization: 0 = far back, 1 = close front
        const zNorm = (z + orbitRadius) / (2 * orbitRadius);

        // ─── Premium depth-based properties ───
        const scale = 0.55 + zNorm * 0.6;           // 0.55 → 1.15
        const opacity = 0.35 + zNorm * 0.65;        // 0.35 → 1.0
        const blur = zNorm < 0.25 ? (0.25 - zNorm) * 3.0 : 0; // only very far back gets slight blur
        const zIndex = Math.round(zNorm * 100);
        const borderAlpha = 0.1 + zNorm * 0.35;     // border gets brighter in front
        const shadowSpread = zNorm * 22;             // glow intensifies in front
        const nameOpacity = 0.15 + zNorm * 0.85;    // name fades behind

        // Apply transforms
        orb.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        orb.el.style.left = `${screenX.toFixed(1)}px`;
        orb.el.style.top = `${screenY.toFixed(1)}px`;
        orb.el.style.opacity = opacity.toFixed(3);
        orb.el.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none';
        orb.el.style.zIndex = zIndex;

        // Dynamic 3D sphere lighting on world image
        const imgEl = orb.el.querySelector('.orbit-world-img');
        if (imgEl) {
          imgEl.style.borderColor = `rgba(124, 58, 237, ${borderAlpha.toFixed(3)})`;
          imgEl.style.boxShadow = `
            inset 0 -6px 14px rgba(0, 0, 0, ${(0.2 + (1 - zNorm) * 0.3).toFixed(3)}),
            inset 0 3px 8px rgba(167, 139, 250, ${(borderAlpha * 0.2).toFixed(3)}),
            0 0 ${shadowSpread.toFixed(0)}px rgba(124, 58, 237, ${(borderAlpha * 0.45).toFixed(3)}),
            0 ${Math.round(4 + zNorm * 6)}px ${Math.round(8 + zNorm * 12)}px rgba(0, 0, 0, ${(0.2 + zNorm * 0.15).toFixed(3)})
          `;
        }

        // Name opacity follows depth
        if (orb.nameEl) {
          orb.nameEl.style.opacity = nameOpacity.toFixed(3);
        }

        // World glow (only visible when in front half)
        if (orb.glowEl) {
          const glowOpacity = Math.max(0, (zNorm - 0.5) * 2) * 0.6;
          orb.glowEl.style.opacity = glowOpacity.toFixed(3);
        }

        // ─── Point Light ───
        // Only emit light when in front half (zNorm > 0.4)
        const proximity = 1 - Math.min(Math.sqrt(x * x + (y * 0.5) * (y * 0.5)) / orbitRadius, 1);
        const lightIntensity = zNorm > 0.4 ? Math.pow(proximity, 2) * 0.35 : 0;
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

      // Center glow responds to nearby planets
      if (this._centerGlow) {
        const centerIntensity = Math.min(totalGlow, 1);
        const glowScale = 1 + centerIntensity * 0.3;
        this._centerGlow.style.opacity = (0.25 + centerIntensity * 0.5).toFixed(3);
        this._centerGlow.style.transform = `scale(${glowScale.toFixed(3)})`;
      }
    };

    // ─── Entrance animation — staggered reveal ───
    const worldEls = this.container.querySelectorAll('.orbit-world');
    worldEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.3)';
      el.style.filter = 'blur(8px)';
      setTimeout(() => {
        el.style.transition = 'opacity 1s cubic-bezier(0.22, 1, 0.36, 1), transform 1s cubic-bezier(0.22, 1, 0.36, 1), filter 1s ease';
        el.style.opacity = '1';
        el.style.filter = 'blur(0)';
        setTimeout(() => {
          el.style.transition = 'none'; // remove so JS animation runs smoothly
        }, 1100);
      }, 500 + i * 250);
    });

    // Start animation loop
    this._animId = requestAnimationFrame(animate);
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

    // Business world clicks — subtle pulse only
    this.container.querySelectorAll('.orbit-world').forEach(world => {
      world.addEventListener('click', () => {
        world.classList.add('orbit-world--pulse');
        world.addEventListener('animationend', () => {
          world.classList.remove('orbit-world--pulse');
        }, { once: true });
      });
    });
  }

  unmount() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }
}
