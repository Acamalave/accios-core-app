import userAuth from '../services/userAuth.js';

export class Home {
  constructor(container, currentUser) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businesses = [];
    this._animId = null;
    this._orbitals = [];       // orbital state per business
    this._centerGlow = null;   // reference to center glow element
    this._pointLights = null;  // reference to point-lights container
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

    // Re-render with 3D orbital layout
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

    // Start 3D animation loop if we have businesses
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
        <!-- Decorative orbit ellipses -->
        <div class="orbital-path orbital-path--outer"></div>
        <div class="orbital-path orbital-path--mid"></div>
        <div class="orbital-path orbital-path--inner"></div>

        <!-- Point lights container (dynamic glow near center) -->
        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <!-- Central Hub -->
        <div class="orbital-center">
          <div class="orbital-center-glow" id="orbital-center-glow"></div>
          <div class="orbital-center-ring"></div>
          <div class="orbital-center-ring orbital-center-ring--reverse"></div>
          <span class="orbital-center-text">AC</span>
        </div>

        <!-- Business Worlds (positioned by JS) -->
        ${worlds}
      </div>
    `;
  }

  // ─── 3D Orbital Engine ──────────────────────────────
  _initOrbitals() {
    const count = this.businesses.length;
    this._orbitals = this.businesses.map((biz, i) => {
      // Each business orbits on a tilted plane in 3D
      // theta = orbit angle (animated), phi = tilt of orbital plane
      const thetaOffset = (Math.PI * 2 / count) * i;
      // Different orbital plane tilts for depth variation
      const tilts = [
        { tiltX: 0.55, tiltZ: 0.3  },  // tilted toward viewer
        { tiltX: 0.35, tiltZ: -0.4 },  // tilted sideways
        { tiltX: 0.65, tiltZ: 0.15 },  // steep tilt
      ];
      const tilt = tilts[i % tilts.length];

      return {
        index: i,
        theta: thetaOffset,
        speed: 0.008 + (i * 0.002), // slightly different speeds
        tiltX: tilt.tiltX,           // orbital plane X tilt (radians)
        tiltZ: tilt.tiltZ,           // orbital plane Z tilt (radians)
        el: null,                     // DOM element (set after mount)
        glowEl: null,
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
      }
    });

    // Create point light elements (one per business)
    if (this._pointLights) {
      this._pointLights.innerHTML = this._orbitals.map((_, i) =>
        `<div class="point-light" data-light="${i}"></div>`
      ).join('');
    }
  }

  _startAnimation() {
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (!systemEl) return;

    const rect = () => systemEl.getBoundingClientRect();
    const focalLength = 600; // perspective focal length for 3D projection

    const animate = () => {
      this._animId = requestAnimationFrame(animate);

      const r = rect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      // Orbit radius (responsive)
      const orbitRadius = Math.min(cx, cy) * 0.72;

      let totalGlow = 0; // accumulate glow intensity for center

      for (const orb of this._orbitals) {
        if (!orb.el) continue;

        // Advance orbit angle
        orb.theta += orb.speed;

        // 3D position on tilted orbital plane
        // Start with circle in XZ plane, then tilt
        const cosT = Math.cos(orb.theta);
        const sinT = Math.sin(orb.theta);

        // Position on untilted orbit (XZ plane)
        let x = orbitRadius * cosT;
        let y = 0;
        let z = orbitRadius * sinT;

        // Tilt around X axis (creates vertical depth)
        const cosTiltX = Math.cos(orb.tiltX);
        const sinTiltX = Math.sin(orb.tiltX);
        const y1 = y * cosTiltX - z * sinTiltX;
        const z1 = y * sinTiltX + z * cosTiltX;
        y = y1;
        z = z1;

        // Tilt around Z axis (creates lateral asymmetry)
        const cosTiltZ = Math.cos(orb.tiltZ);
        const sinTiltZ = Math.sin(orb.tiltZ);
        const x2 = x * cosTiltZ - y * sinTiltZ;
        const y2 = x * sinTiltZ + y * cosTiltZ;
        x = x2;
        y = y2;

        // Perspective projection
        const perspective = focalLength / (focalLength + z);
        const screenX = cx + x * perspective;
        const screenY = cy + y * perspective;

        // Depth-based visual properties
        // z ranges from -orbitRadius to +orbitRadius
        const zNorm = (z + orbitRadius) / (2 * orbitRadius); // 0 (far) to 1 (near)
        const scale = 0.55 + zNorm * 0.65;    // 0.55 (far back) → 1.2 (close front)
        const opacity = 0.3 + zNorm * 0.7;     // 0.3 → 1.0
        const blur = (1 - zNorm) * 2.5;        // 2.5px blur far → 0 near
        const zIndex = Math.round(zNorm * 100); // stacking order

        // Apply transforms
        orb.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        orb.el.style.left = `${screenX.toFixed(1)}px`;
        orb.el.style.top = `${screenY.toFixed(1)}px`;
        orb.el.style.opacity = opacity.toFixed(3);
        orb.el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : 'none';
        orb.el.style.zIndex = zIndex;

        // Glow intensity based on proximity to front
        if (orb.glowEl) {
          const glowOpacity = Math.max(0, (zNorm - 0.5) * 2) * 0.8;
          orb.glowEl.style.opacity = glowOpacity.toFixed(3);
        }

        // ─── Point Light Effect ───
        // When a world is near the center horizontally, illuminate the center
        const distFromCenter = Math.sqrt(x * x + y * y);
        const proximity = 1 - Math.min(distFromCenter / orbitRadius, 1);
        const lightIntensity = Math.pow(proximity, 3) * 0.6; // cubic falloff
        totalGlow += lightIntensity;

        // Position the point light
        if (this._pointLights) {
          const lightEl = this._pointLights.querySelector(`[data-light="${orb.index}"]`);
          if (lightEl) {
            lightEl.style.left = `${screenX.toFixed(1)}px`;
            lightEl.style.top = `${screenY.toFixed(1)}px`;
            lightEl.style.opacity = (lightIntensity * 1.5).toFixed(3);
            lightEl.style.transform = `translate(-50%, -50%) scale(${(0.5 + lightIntensity * 2).toFixed(2)})`;
          }
        }
      }

      // Animate center glow based on cumulative planet proximity
      if (this._centerGlow) {
        const centerIntensity = Math.min(totalGlow, 1);
        const glowScale = 1 + centerIntensity * 0.4;
        this._centerGlow.style.opacity = (0.3 + centerIntensity * 0.7).toFixed(3);
        this._centerGlow.style.transform = `scale(${glowScale.toFixed(3)})`;
      }
    };

    // Entrance animation — stagger worlds appearing
    const worldEls = this.container.querySelectorAll('.orbit-world');
    worldEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.2)';
      el.style.filter = 'blur(10px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s ease';
        el.style.opacity = '1';
        el.style.filter = 'blur(0)';
        // Actual position will be set by animation loop
        setTimeout(() => {
          el.style.transition = 'none'; // remove transition so JS animation is smooth
        }, 900);
      }, 400 + i * 200);
    });

    // Start loop
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
