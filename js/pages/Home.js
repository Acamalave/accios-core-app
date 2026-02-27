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

    this.container.innerHTML = `
      <section class="home-page">
        <div class="home-content">
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

  // ─── Curtain Close → Navigate → Open Transition (Cinematic) ───
  _triggerCurtainTransition(onComplete) {
    // Remove any existing curtain
    document.querySelector('.curtain-overlay')?.remove();

    const curtain = document.createElement('div');
    curtain.className = 'curtain-overlay';
    curtain.innerHTML = `
      <div class="curtain-valance"></div>
      <div class="curtain-panel curtain-panel--left">
        <div class="curtain-fabric-shadow curtain-fabric-shadow--left"></div>
      </div>
      <div class="curtain-panel curtain-panel--right">
        <div class="curtain-fabric-shadow curtain-fabric-shadow--right"></div>
      </div>
      <div class="curtain-seam"></div>
      <div class="curtain-seam-halo"></div>
      <div class="curtain-light-leak"></div>
    `;
    document.body.appendChild(curtain);

    // Phase 1: Close curtains (1.4s animation)
    // Double-rAF ensures the browser has painted the initial state
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        curtain.classList.add('curtain-overlay--closing');
      });
    });

    // Phase 2: After close completes → navigate behind the curtain
    setTimeout(() => {
      curtain.classList.remove('curtain-overlay--closing');
      curtain.classList.add('curtain-overlay--closed');

      // Lock panels at closed position
      const left = curtain.querySelector('.curtain-panel--left');
      const right = curtain.querySelector('.curtain-panel--right');
      if (left) left.style.transform = 'translate3d(0%, 0, 0) rotateY(0deg) scaleX(1)';
      if (right) right.style.transform = 'translate3d(0%, 0, 0) rotateY(0deg) scaleX(1)';

      // Navigate while curtain is fully closed
      if (onComplete) onComplete();

      // Phase 3: Open curtains — reveal the new page
      setTimeout(() => {
        // Clear inline transforms so CSS open animation takes over
        if (left) left.style.transform = '';
        if (right) right.style.transform = '';

        curtain.classList.remove('curtain-overlay--closed');
        curtain.classList.add('curtain-overlay--opening');

        // Remove after open animation finishes (1.6s + buffer)
        setTimeout(() => {
          curtain.remove();
        }, 1800);
      }, 400);
    }, 1500);
  }

  unmount() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._rippleInterval) {
      clearInterval(this._rippleInterval);
    }
    // Note: Do NOT remove curtain-overlay here — it must persist
    // through navigation so the opening animation plays on the new page.
  }
}
