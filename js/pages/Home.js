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

    const firstName = (user?.name || '').split(' ')[0] || '';

    this.container.innerHTML = `
      <section class="home-page">
        ${firstName ? `<div class="home-greeting">Hola, ${firstName}</div>` : ''}
        <div class="home-content">
          ${this.businesses.length > 0 ? this._buildOrbitalSystem() : this._buildEmptyState()}
        </div>

        <div class="home-actions">
          ${isSuperAdmin ? `
            <button class="home-admin" id="home-superadmin-btn" title="Super Admin" style="position: fixed; top: var(--space-5); right: var(--space-5);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
            <button class="home-admin" id="home-finance-btn" title="Finanzas" style="position: fixed; top: var(--space-5); right: calc(var(--space-5) + 52px);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </button>
          ` : ''}
          <button class="home-action-btn" id="home-logout" title="Cerrar sesion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Salir</span>
          </button>
        </div>

        <div class="home-ecosystem-label">Digital Ecosystem</div>
        <footer class="home-footer">Desarrollado por Acacio Malave</footer>
      </section>
    `;

    this._attachListeners();

    if (this.businesses.length > 0) {
      this._initOrbitals();
      this._startAnimation();
    }
  }

  _buildOrbitalSystem() {
    const totalWorlds = this.businesses.length + 1; // +1 for "add" planet
    const worlds = this.businesses.map((biz, index) => {
      return `
        <div class="orbit-world" data-business-id="${biz.id}" data-orbit-index="${index}">
          <div class="orbit-world-glow"></div>
          <div class="orbit-world-ripples"></div>
          <div class="orbit-world-img">
            ${biz.logo
              ? `<img src="${biz.logo}" alt="${biz.nombre}" draggable="false" />`
              : `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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

    // "Add my business" planet — always last in orbit
    const addPlanet = `
      <div class="orbit-world orbit-world--add" data-business-id="__add__" data-orbit-index="${this.businesses.length}">
        <div class="orbit-world-glow"></div>
        <div class="orbit-world-ripples"></div>
        <div class="orbit-world-img orbit-world-img--add">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span class="orbit-world-name">Mi Negocio</span>
      </div>
    `;

    return `
      <div class="orbital-system" id="orbital-system-3d">
        <div class="orbital-ring"></div>
        <div class="orbital-ring orbital-ring--inner"></div>

        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <div class="orbital-center">
          <div class="orbital-center-corona"></div>
          <div class="orbital-center-corona orbital-center-corona--outer"></div>
          <div class="orbital-center-glow" id="orbital-center-glow"></div>
          <div class="orbital-center-ring"></div>
          <div class="orbital-center-ring orbital-center-ring--reverse"></div>
          <div class="orbital-center-brand">
            <span class="orbital-center-brand-top">ACCIOS</span>
            <span class="orbital-center-brand-bottom">CORE</span>
          </div>
        </div>

        ${worlds}
        ${addPlanet}
      </div>
    `;
  }

  // ─── Solar System Engine ──────────────────────────────

  _initOrbitals() {
    const count = this.businesses.length + 1; // +1 for "add" planet
    const TILT = 1.25;
    const SPEED = 0.0012;

    // Create orbital entries for businesses + the add planet
    this._orbitals = [];
    for (let i = 0; i < count; i++) {
      const thetaOffset = (Math.PI * 2 / count) * i;
      this._orbitals.push({
        index: i,
        theta: thetaOffset,
        speed: SPEED,
        tilt: TILT,
        el: null,
        glowEl: null,
        nameEl: null,
        ripplesEl: null,
      });
    }

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
      const orbitRadius = Math.min(cx, cy) * 0.75;

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
        const scale = 0.55 + zNorm * 0.8;           // 0.55 → 1.35
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

        // Dynamic sphere shadow + sun illumination
        const imgEl = orb.el.querySelector('.orbit-world-img');
        if (imgEl) {
          // ─── Sun illumination direction ───
          // Calculate angle from planet to center (where the sun is)
          const relX = screenX - cx;
          const relY = screenY - cy;
          const relDist = Math.sqrt(relX * relX + relY * relY) || 1;
          const toCenterX = -relX / relDist;  // normalized direction toward sun
          const toCenterY = -relY / relDist;

          // Map light position onto sphere surface for ::before gradient
          const sunX = 50 + toCenterX * 25;   // 25% → 75%
          const sunY = 50 + toCenterY * 25;
          imgEl.style.setProperty('--sun-x', `${sunX.toFixed(1)}%`);
          imgEl.style.setProperty('--sun-y', `${sunY.toFixed(1)}%`);

          // Sun-facing edge glow (purple light on the side facing center)
          const edgeGlowX = (toCenterX * (3 + zNorm * 5)).toFixed(1);
          const edgeGlowY = (toCenterY * (3 + zNorm * 5)).toFixed(1);
          const sunGlowAlpha = (0.08 + zNorm * 0.22).toFixed(3);
          const sunGlowSpread = Math.round(10 + zNorm * 14);

          imgEl.style.borderColor = `rgba(124, 58, 237, ${borderAlpha.toFixed(3)})`;
          imgEl.style.boxShadow = `
            inset 0 -5px 12px rgba(0, 0, 0, ${(0.15 + (1 - zNorm) * 0.2).toFixed(3)}),
            inset 0 3px 8px rgba(167, 139, 250, ${(borderAlpha * 0.15).toFixed(3)}),
            0 0 ${shadowSpread.toFixed(0)}px rgba(124, 58, 237, ${(borderAlpha * 0.4).toFixed(3)}),
            0 ${Math.round(3 + zNorm * 5)}px ${Math.round(6 + zNorm * 10)}px rgba(0, 0, 0, ${(0.15 + zNorm * 0.1).toFixed(3)}),
            ${edgeGlowX}px ${edgeGlowY}px ${sunGlowSpread}px rgba(167, 139, 250, ${sunGlowAlpha})
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
        const glowScale = 1 + centerIntensity * 0.2;
        this._centerGlow.style.opacity = (0.5 + centerIntensity * 0.35).toFixed(3);
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

    this.container.querySelector('#home-finance-btn')?.addEventListener('click', () => {
      window.location.hash = '#finance';
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

        const bizId = world.dataset.businessId;

        // "Add my business" planet → supernova + appointment scheduler
        if (bizId === '__add__') {
          this._triggerSupernova(world, () => {
            this._showAppointmentModal();
          });
          return;
        }

        // MDN Podcast → curtain close → podcast world
        if (bizId === 'mdn-podcast') {
          this._triggerCurtainTransition(() => {
            window.location.hash = '#podcast/mdn-podcast';
          });
          return;
        }

        // La Vaina → shield assembly → presentation page
        if (bizId === 'lavaina') {
          this._triggerShieldTransition(() => {
            window.location.hash = '#lavaina';
          });
          return;
        }

        // Show coming-soon popup for specific businesses
        if (comingSoonIds.includes(bizId)) {
          const bizName = world.querySelector('.orbit-world-name')?.textContent || bizId;
          this._showComingSoonBubble(bizName);
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

  // ─── Bubble notification for "Coming Soon" worlds ───
  _showComingSoonBubble(businessName) {
    // Remove any existing bubble
    const existing = document.querySelector('.cosmos-bubble');
    if (existing) {
      existing.remove();
      clearTimeout(this._bubbleTimeout);
    }

    const bubble = document.createElement('div');
    bubble.className = 'cosmos-bubble';
    bubble.innerHTML = `
      <div class="cosmos-bubble-row">
        <div class="cosmos-bubble-pulse"></div>
        <div class="cosmos-bubble-info">
          <span class="cosmos-bubble-name">${businessName}</span>
          <span class="cosmos-bubble-msg">Construyendo este ecosistema — Proximamente</span>
        </div>
      </div>
      <div class="cosmos-bubble-bar">
        <div class="cosmos-bubble-bar-fill"></div>
      </div>
    `;

    document.body.appendChild(bubble);

    requestAnimationFrame(() => {
      bubble.classList.add('cosmos-bubble--visible');
    });

    const dismiss = () => {
      bubble.classList.remove('cosmos-bubble--visible');
      bubble.classList.add('cosmos-bubble--closing');
      setTimeout(() => bubble.remove(), 400);
    };

    // Auto-dismiss after 3.5s
    this._bubbleTimeout = setTimeout(dismiss, 3500);

    // Tap to dismiss
    bubble.addEventListener('click', () => {
      clearTimeout(this._bubbleTimeout);
      dismiss();
    });
  }

  // ─── Supernova explosion animation ───
  _triggerSupernova(worldEl, onComplete) {
    const rect = worldEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Create supernova overlay
    const nova = document.createElement('div');
    nova.className = 'supernova-overlay';
    nova.innerHTML = `
      <div class="supernova-flash" style="left:${cx}px;top:${cy}px"></div>
      <div class="supernova-ring supernova-ring--1" style="left:${cx}px;top:${cy}px"></div>
      <div class="supernova-ring supernova-ring--2" style="left:${cx}px;top:${cy}px"></div>
      <div class="supernova-ring supernova-ring--3" style="left:${cx}px;top:${cy}px"></div>
      <div class="supernova-particles" style="left:${cx}px;top:${cy}px"></div>
    `;
    document.body.appendChild(nova);

    // Spawn particle burst
    const particleContainer = nova.querySelector('.supernova-particles');
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'supernova-particle';
      const angle = (Math.PI * 2 / 20) * i + (Math.random() - 0.5) * 0.4;
      const dist = 80 + Math.random() * 160;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      particleContainer.appendChild(p);
    }

    // Trigger animation
    requestAnimationFrame(() => nova.classList.add('supernova-overlay--active'));

    // After animation completes, fade out and call callback
    setTimeout(() => {
      nova.classList.add('supernova-overlay--fade');
      setTimeout(() => {
        nova.remove();
        if (onComplete) onComplete();
      }, 400);
    }, 1200);
  }

  // ─── Appointment Scheduling Modal ───
  _showAppointmentModal() {
    // Remove any existing modal
    document.querySelector('.appt-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'appt-modal-overlay';
    overlay.innerHTML = `
      <div class="appt-modal">
        <button class="appt-modal-close" id="appt-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="appt-modal-header">
          <div class="appt-modal-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 class="appt-modal-title">Agenda tu Cita</h2>
          <p class="appt-modal-subtitle">Transforma tu negocio en un ecosistema digital</p>
        </div>

        <form class="appt-form" id="appt-form">
          <div class="appt-field">
            <label class="appt-label">Nombre completo</label>
            <input type="text" class="appt-input" id="appt-name" placeholder="Tu nombre" required />
          </div>
          <div class="appt-field">
            <label class="appt-label">Telefono / WhatsApp</label>
            <input type="tel" class="appt-input" id="appt-phone" placeholder="+58 412 000 0000" required />
          </div>
          <div class="appt-field">
            <label class="appt-label">Nombre del negocio</label>
            <input type="text" class="appt-input" id="appt-biz" placeholder="Mi empresa" required />
          </div>
          <div class="appt-row">
            <div class="appt-field appt-field--half">
              <label class="appt-label">Fecha preferida</label>
              <input type="date" class="appt-input" id="appt-date" required />
            </div>
            <div class="appt-field appt-field--half">
              <label class="appt-label">Hora preferida</label>
              <select class="appt-input" id="appt-time" required>
                <option value="">Seleccionar</option>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
                <option value="17:00">05:00 PM</option>
              </select>
            </div>
          </div>
          <div class="appt-field">
            <label class="appt-label">Mensaje (opcional)</label>
            <textarea class="appt-input appt-textarea" id="appt-msg" placeholder="Cuentanos sobre tu negocio..." rows="3"></textarea>
          </div>
          <button type="submit" class="appt-submit" id="appt-submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
            <span>Agendar Cita</span>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = overlay.querySelector('#appt-date');
    if (dateInput) dateInput.min = tomorrow.toISOString().split('T')[0];

    // Entrance animation
    requestAnimationFrame(() => overlay.classList.add('appt-modal-overlay--visible'));

    // Close handler
    const close = () => {
      overlay.classList.remove('appt-modal-overlay--visible');
      overlay.classList.add('appt-modal-overlay--closing');
      setTimeout(() => overlay.remove(), 350);
      // Resume orbit
      this._paused = false;
      if (this._activeWorld) {
        this._activeWorld.classList.remove('orbit-world--active');
        this._activeWorld = null;
      }
    };

    overlay.querySelector('#appt-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Form submit → save to Firestore
    overlay.querySelector('#appt-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#appt-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Enviando...</span>';

      try {
        await userAuth.createAppointment({
          name: overlay.querySelector('#appt-name').value.trim(),
          phone: overlay.querySelector('#appt-phone').value.trim(),
          business: overlay.querySelector('#appt-biz').value.trim(),
          date: overlay.querySelector('#appt-date').value,
          time: overlay.querySelector('#appt-time').value,
          message: overlay.querySelector('#appt-msg').value.trim(),
          userId: this.currentUser?.phone || 'anonymous',
          status: 'pendiente',
        });

        // Success state
        const form = overlay.querySelector('.appt-form');
        form.innerHTML = `
          <div class="appt-success">
            <div class="appt-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 class="appt-success-title">Cita Agendada</h3>
            <p class="appt-success-text">Nos pondremos en contacto contigo pronto para confirmar tu cita.</p>
          </div>
        `;
        setTimeout(close, 3000);
      } catch (err) {
        console.error('Failed to save appointment:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Error — Reintentar</span>';
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // CURTAIN — Spring-Physics Engine (requestAnimationFrame)
  // No CSS keyframes. Every visual derived from physics state.
  // ═══════════════════════════════════════════════════════
  _triggerCurtainTransition(onComplete) {
    document.querySelector('.curtain-overlay')?.remove();

    const ov = document.createElement('div');
    ov.className = 'curtain-overlay';
    ov.innerHTML = `
      <div class="curtain-dimmer"></div>
      <div class="curtain-valance"></div>
      <div class="curtain-panel curtain-panel--left">
        <div class="curtain-trim"></div>
        <div class="curtain-edge-shadow"></div>
      </div>
      <div class="curtain-panel curtain-panel--right">
        <div class="curtain-trim"></div>
        <div class="curtain-edge-shadow"></div>
      </div>
      <div class="curtain-seam"></div>
      <div class="curtain-seam-halo"></div>
      <div class="curtain-light-leak"></div>
    `;
    document.body.appendChild(ov);

    // Element refs
    const q = s => ov.querySelector(s);
    const panelL    = q('.curtain-panel--left');
    const panelR    = q('.curtain-panel--right');
    const dimmer    = q('.curtain-dimmer');
    const valance   = q('.curtain-valance');
    const seam      = q('.curtain-seam');
    const seamHalo  = q('.curtain-seam-halo');
    const lightLeak = q('.curtain-light-leak');
    const trimL     = panelL.querySelector('.curtain-trim');
    const trimR     = panelR.querySelector('.curtain-trim');
    const edgeSL    = panelL.querySelector('.curtain-edge-shadow');
    const edgeSR    = panelR.querySelector('.curtain-edge-shadow');

    // ── Spring state ──
    let pos = -115;    // panel position in %
    let vel = 0;
    let target = 0;   // 0 = closed center
    let phase = 'closing';
    let navigated = false;

    // Tuning — heavy velvet: low stiffness, moderate damping
    let K = 110;  // stiffness
    let D = 16;   // damping

    let lastT = 0;

    // ── Render: all visuals derived from pos & vel ──
    const render = () => {
      const closedness = Math.max(0, Math.min(1, 1 - Math.abs(pos) / 115));

      // Fabric skew — bottom lags behind top (weight)
      const skew = Math.max(-2.8, Math.min(2.8, vel * 0.005));

      // Fabric compression at high speed
      const sx = Math.max(0.96, 1 - Math.abs(vel) * 0.00016);

      // Motion shadow
      const mBlur = Math.min(28, Math.abs(vel) * 0.055);
      const mDir = vel > 0 ? 1 : -1;

      // Panels
      panelL.style.transform =
        `translate3d(${pos}%,0,0) skewX(${skew}deg) scaleX(${sx})`;
      panelR.style.transform =
        `translate3d(${-pos}%,0,0) skewX(${-skew}deg) scaleX(${sx})`;

      // Dynamic box-shadow (motion blur illusion)
      const sStr = `${mBlur * mDir}px 0 ${mBlur * 1.4}px rgba(0,0,0,${(0.25 + closedness * 0.35).toFixed(2)})`;
      panelL.style.boxShadow = sStr;
      panelR.style.boxShadow = sStr.replace(mBlur * mDir, -mBlur * mDir);

      // Dimmer
      dimmer.style.opacity = (closedness * 0.7).toFixed(3);

      // Valance
      valance.style.opacity = Math.min(1, closedness * 2.2).toFixed(3);

      // Gold trim — visible only when nearly closed
      const tOp = Math.max(0, (closedness - 0.75) / 0.25).toFixed(3);
      trimL.style.opacity = tOp;
      trimR.style.opacity = tOp;

      // Edge shadows
      const eOp = (closedness * 0.75).toFixed(3);
      edgeSL.style.opacity = eOp;
      edgeSR.style.opacity = eOp;

      // Seam glow
      const smOp = Math.max(0, (closedness - 0.88) / 0.12).toFixed(3);
      seam.style.opacity = smOp;
      seamHalo.style.opacity = (smOp * 0.65).toFixed(3);

      // Light leak (opening only)
      if (phase === 'opening') {
        const openness = 1 - closedness;
        const peak = 0.3;
        const lkOp = openness < peak
          ? (openness / peak) * 0.55
          : Math.max(0, (1 - (openness - peak) / (1 - peak)) * 0.55);
        lightLeak.style.width = (openness * 110) + 'vw';
        lightLeak.style.opacity = lkOp.toFixed(3);
      }
    };

    // ── Physics tick at 60fps ──
    const tick = (now) => {
      if (!lastT) { lastT = now; requestAnimationFrame(tick); return; }

      const dt = Math.min((now - lastT) / 1000, 0.022);
      lastT = now;

      // Damped harmonic oscillator: F = -K·x - D·v
      const x = pos - target;
      vel += (-K * x - D * vel) * dt;
      pos += vel * dt;

      render();

      // Settled?
      const settled = Math.abs(x) < 0.06 && Math.abs(vel) < 0.3;

      if (settled && phase === 'closing') {
        pos = 0; vel = 0;
        render();
        phase = 'hold';

        if (onComplete && !navigated) { navigated = true; onComplete(); }

        // Hold → then open smoothly
        setTimeout(() => {
          phase = 'opening';
          target = -115;
          K = 85;   // balanced stiffness for clean exit
          D = 14;
          vel = 0;  // no anticipation — clean pull-away
          lastT = 0;
          requestAnimationFrame(tick);
        }, 350);
        return;
      }

      if (settled && phase === 'opening') {
        ov.style.transition = 'opacity 0.22s ease-out';
        ov.style.opacity = '0';
        setTimeout(() => ov.remove(), 250);
        return;
      }

      if (phase !== 'hold') requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════════════
  // SHIELD TRANSITION — Assembly animation for La Vaina
  // ═══════════════════════════════════════════════════════
  _triggerShieldTransition(onComplete) {
    document.getElementById('lv-shield-transition-overlay')?.remove();

    const SHIELD_SVG = `
    <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" class="lv-shield-svg" id="lv-home-shield-svg">
      <g class="lv-shield-fragment" data-frag="0"><path d="M100 10 L40 50 L40 90 L100 70 Z" fill="rgba(124,58,237,0.35)" stroke="rgba(167,139,250,0.4)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="1"><path d="M100 10 L160 50 L160 90 L100 70 Z" fill="rgba(124,58,237,0.35)" stroke="rgba(167,139,250,0.4)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="2"><path d="M40 90 L40 150 L70 170 L100 130 L100 70 Z" fill="rgba(124,58,237,0.3)" stroke="rgba(167,139,250,0.3)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="3"><path d="M160 90 L160 150 L130 170 L100 130 L100 70 Z" fill="rgba(124,58,237,0.3)" stroke="rgba(167,139,250,0.3)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="4"><path d="M40 150 L70 170 L100 200 L70 190 Z" fill="rgba(124,58,237,0.25)" stroke="rgba(167,139,250,0.25)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="5"><path d="M160 150 L130 170 L100 200 L130 190 Z" fill="rgba(124,58,237,0.25)" stroke="rgba(167,139,250,0.25)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="6"><path d="M70 190 L100 200 L100 230 Z" fill="rgba(124,58,237,0.2)" stroke="rgba(167,139,250,0.2)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="7"><path d="M130 190 L100 200 L100 230 Z" fill="rgba(124,58,237,0.2)" stroke="rgba(167,139,250,0.2)" stroke-width="0.5"/></g>
      <g class="lv-shield-fragment" data-frag="8"><path d="M100 70 L80 100 L100 130 L120 100 Z" fill="rgba(167,139,250,0.2)" stroke="rgba(167,139,250,0.6)" stroke-width="1"/></g>
    </svg>`;

    const ov = document.createElement('div');
    ov.id = 'lv-shield-transition-overlay';
    ov.className = 'lv-shield-overlay';
    ov.innerHTML = `<div class="lv-shield-container">${SHIELD_SVG}</div>`;
    document.body.appendChild(ov);

    const svgEl = ov.querySelector('#lv-home-shield-svg');
    const fragments = svgEl.querySelectorAll('.lv-shield-fragment');
    const springs = [];

    fragments.forEach((frag, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 180;
      springs.push({
        el: frag, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
        r: (Math.random() - 0.5) * 400, vx: 0, vy: 0, vr: 0,
        opacity: 0, delay: i * 55, started: false,
      });
    });

    const K = 120, D = 14;
    let startTime = null;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const dt = Math.min(1 / 60, 0.025);
      let allSettled = true;

      for (const s of springs) {
        if (elapsed < s.delay) { allSettled = false; continue; }
        s.started = true;
        s.vx += (-K * s.x - D * s.vx) * dt;
        s.vy += (-K * s.y - D * s.vy) * dt;
        s.vr += (-K * s.r - D * s.vr) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
        s.opacity = Math.min(1, s.opacity + dt * 5);
        s.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${s.r.toFixed(1)}deg)`;
        s.el.style.opacity = s.opacity.toFixed(2);
        if (Math.abs(s.x) > 0.3 || Math.abs(s.y) > 0.3) allSettled = false;
      }

      if (allSettled) {
        fragments.forEach(f => { f.style.transform = ''; f.style.opacity = '1'; });
        svgEl.classList.add('lv-shield--assembled');
        setTimeout(() => { if (onComplete) onComplete(); }, 400);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  unmount() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._rippleInterval) {
      clearInterval(this._rippleInterval);
    }
    // Note: Do NOT remove curtain-overlay or shield-overlay here — they must
    // persist through navigation so the animation plays on the new page.
  }
}
