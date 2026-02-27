import userAuth from '../services/userAuth.js';

export class Home {
  constructor(container, currentUser, particleCanvas) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businesses = [];
    this._animId = null;
    this._orbitals = [];
    this._centerGlow = null;
    this._pointLights = null;
    this._paused = false;
    this._activeWorld = null;

    // ── Scroll-jacking & Snap state ──
    this._scrollVel = 0;
    this._targetTheta = null;
    this._snappedIndex = -1;
    this._snapSpring = { K: 120, D: 18 };
    this._globalTheta = 0;
    this._lastScrollTime = 0;
    this._hudEl = null;
    this._selectionRingEl = null;

    // ── Energy beams ──
    this._energyCanvas = null;
    this._energyCtx = null;
    this._time = 0;

    // ── Parallax ──
    this._particleCanvas = particleCanvas || null;
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
        <canvas class="orbital-energy-canvas" id="orbital-energy-canvas"></canvas>

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
    const count = this.businesses.length + 1;
    const TILT = 1.05;  // ~60 degrees — visible ellipse with clear depth

    this._orbitals = [];
    for (let i = 0; i < count; i++) {
      const thetaOffset = (Math.PI * 2 / count) * i;
      this._orbitals.push({
        index: i,
        thetaOffset,
        tilt: TILT,
        el: null,
        glowEl: null,
        nameEl: null,
        ripplesEl: null,
        _screenX: 0,
        _screenY: 0,
        _zNorm: 0,
      });
    }

    this._globalTheta = 0;

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

    // ── Energy beam canvas setup ──
    this._energyCanvas = this.container.querySelector('#orbital-energy-canvas');
    if (this._energyCanvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = system.getBoundingClientRect();
      this._energyCanvas.width = rect.width * dpr;
      this._energyCanvas.height = rect.height * dpr;
      this._energyCanvas.style.width = rect.width + 'px';
      this._energyCanvas.style.height = rect.height + 'px';
      this._energyCtx = this._energyCanvas.getContext('2d');
      this._energyCtx.scale(dpr, dpr);
      this._energyDpr = dpr;
    }
  }

  _startAnimation() {
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (!systemEl) return;

    const getRect = () => systemEl.getBoundingClientRect();
    const focalLength = 600;

    this._lastScrollTime = performance.now() - 3000; // allow auto-rotate from start

    const animate = (now) => {
      this._animId = requestAnimationFrame(animate);
      this._time++;

      const r = getRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      const orbitRadius = Math.min(cx, cy) * 0.75;

      // ═══ SCROLL-JACKING PHYSICS ═══
      if (!this._paused) {
        const dt = 1 / 60;
        const idleTime = now - this._lastScrollTime;

        // Apply scroll velocity to global rotation
        this._globalTheta += this._scrollVel;

        // Friction decay
        this._scrollVel *= 0.92;

        // Auto-rotation when idle (>2s no scroll input)
        if (idleTime > 2000 && this._targetTheta === null) {
          const rampFactor = Math.min((idleTime - 2000) / 2000, 1);
          this._scrollVel += 0.0012 * rampFactor * dt * 60;
        }

        // Snap detection: velocity low enough + no snap active + idle for a bit
        if (Math.abs(this._scrollVel) < 0.004 && this._targetTheta === null && idleTime > 300 && idleTime < 2000) {
          this._engageSnap();
        }

        // Spring-drive toward snap target
        if (this._targetTheta !== null) {
          let diff = this._targetTheta - this._globalTheta;
          // Shortest angular path
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          const springForce = this._snapSpring.K * diff;
          const dampForce = this._snapSpring.D * this._scrollVel;
          this._scrollVel += (springForce - dampForce) * dt;

          // Settled?
          if (Math.abs(diff) < 0.005 && Math.abs(this._scrollVel) < 0.001) {
            this._globalTheta = this._targetTheta;
            this._scrollVel = 0;
            this._onSnapComplete();
            this._targetTheta = null;
          }
        }
      }

      // ═══ PLANET RENDERING ═══
      let totalGlow = 0;

      for (const orb of this._orbitals) {
        if (!orb.el) continue;

        const theta = this._globalTheta + orb.thetaOffset;

        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

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

        // Store for energy beams + HUD positioning
        orb._screenX = screenX;
        orb._screenY = screenY;
        orb._zNorm = zNorm;

        // ─── Enhanced 3D depth: dramatic scale + DOF blur ───
        const scale = 0.42 + zNorm * 1.0;          // 0.42 → 1.42
        const opacity = 0.32 + zNorm * 0.68;        // 0.32 → 1.0
        const zIndex = Math.round(zNorm * 100);
        const borderAlpha = 0.12 + zNorm * 0.33;
        const shadowSpread = zNorm * 24;
        const nameOpacity = 0.2 + zNorm * 0.8;

        // Depth of field blur — far planets blur, front planets crisp
        const blurAmount = Math.max(0, (1 - zNorm) * 2.5);

        orb.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        orb.el.style.left = `${screenX.toFixed(1)}px`;
        orb.el.style.top = `${screenY.toFixed(1)}px`;
        orb.el.style.opacity = opacity.toFixed(3);
        orb.el.style.filter = blurAmount > 0.1 ? `blur(${blurAmount.toFixed(1)}px)` : 'none';
        orb.el.style.zIndex = zIndex;

        // Dynamic sphere shadow + sun illumination
        const imgEl = orb.el.querySelector('.orbit-world-img');
        if (imgEl) {
          const relX = screenX - cx;
          const relY = screenY - cy;
          const relDist = Math.sqrt(relX * relX + relY * relY) || 1;
          const toCenterX = -relX / relDist;
          const toCenterY = -relY / relDist;

          const sunX = 50 + toCenterX * 25;
          const sunY = 50 + toCenterY * 25;
          imgEl.style.setProperty('--sun-x', `${sunX.toFixed(1)}%`);
          imgEl.style.setProperty('--sun-y', `${sunY.toFixed(1)}%`);

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

      // Center glow response
      if (this._centerGlow) {
        const centerIntensity = Math.min(totalGlow, 1);
        const glowScale = 1 + centerIntensity * 0.2;
        this._centerGlow.style.opacity = (0.5 + centerIntensity * 0.35).toFixed(3);
        this._centerGlow.style.transform = `scale(${glowScale.toFixed(3)})`;
      }

      // ═══ ENERGY BEAMS (Canvas) ═══
      this._drawEnergyBeams(cx, cy);

      // ═══ HUD POSITION UPDATE ═══
      if (this._hudEl && this._snappedIndex >= 0 && this._snappedIndex < this._orbitals.length) {
        const snapped = this._orbitals[this._snappedIndex];
        if (snapped) {
          const isMobile = window.innerWidth < 560;
          if (isMobile) {
            this._hudEl.style.left = `${snapped._screenX}px`;
            this._hudEl.style.top = `${snapped._screenY + 65}px`;
            this._hudEl.style.transform = 'translate(-50%, 0)';
          } else {
            this._hudEl.style.left = `${snapped._screenX + 65}px`;
            this._hudEl.style.top = `${snapped._screenY - 30}px`;
            this._hudEl.style.transform = 'none';
          }
        }
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

  // ─── Energy Beams: pulsing data lines from planets to core ───
  _drawEnergyBeams(cx, cy) {
    if (!this._energyCtx || !this._energyCanvas) return;

    const ctx = this._energyCtx;
    const w = this._energyCanvas.width / (this._energyDpr || 1);
    const h = this._energyCanvas.height / (this._energyDpr || 1);
    ctx.clearRect(0, 0, w, h);

    for (const orb of this._orbitals) {
      if (!orb.el || !orb._screenX) continue;

      const sx = orb._screenX;
      const sy = orb._screenY;
      const zn = orb._zNorm;
      const baseAlpha = 0.04 + zn * 0.08;

      // Base beam line
      const gradient = ctx.createLinearGradient(sx, sy, cx, cy);
      gradient.addColorStop(0, `rgba(167, 139, 250, ${baseAlpha})`);
      gradient.addColorStop(0.5, `rgba(124, 58, 237, ${baseAlpha * 0.6})`);
      gradient.addColorStop(1, `rgba(167, 139, 250, ${baseAlpha * 0.3})`);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.8 + zn * 0.5;
      ctx.stroke();

      // Traveling data pulse
      const pulsePos = ((this._time * 0.003 + orb.thetaOffset) % 1);
      const px = sx + (cx - sx) * pulsePos;
      const py = sy + (cy - sy) * pulsePos;

      const pulseRadius = 5 + zn * 5;
      const pulseGrad = ctx.createRadialGradient(px, py, 0, px, py, pulseRadius);
      pulseGrad.addColorStop(0, `rgba(167, 139, 250, ${0.25 + zn * 0.3})`);
      pulseGrad.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.beginPath();
      ctx.arc(px, py, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = pulseGrad;
      ctx.fill();

      // Second pulse (staggered) for richer feel
      const pulsePos2 = ((this._time * 0.003 + orb.thetaOffset + 0.5) % 1);
      const px2 = sx + (cx - sx) * pulsePos2;
      const py2 = sy + (cy - sy) * pulsePos2;
      const r2 = 3 + zn * 3;
      const pg2 = ctx.createRadialGradient(px2, py2, 0, px2, py2, r2);
      pg2.addColorStop(0, `rgba(167, 139, 250, ${0.15 + zn * 0.15})`);
      pg2.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.beginPath();
      ctx.arc(px2, py2, r2, 0, Math.PI * 2);
      ctx.fillStyle = pg2;
      ctx.fill();
    }
  }

  // ─── Snap engagement: find nearest planet to sweet spot ───
  _engageSnap() {
    const count = this._orbitals.length;
    if (count === 0) return;

    // Sweet spot = PI/2 (bottom of ellipse, closest to camera)
    const sweetSpotTheta = Math.PI / 2;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < count; i++) {
      let planetTheta = (this._globalTheta + this._orbitals[i].thetaOffset) % (Math.PI * 2);
      if (planetTheta < 0) planetTheta += Math.PI * 2;

      let dist = Math.abs(planetTheta - sweetSpotTheta);
      if (dist > Math.PI) dist = Math.PI * 2 - dist;

      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    // Only snap if reasonably close
    if (bestDist > Math.PI / 3) return;

    // Compute target globalTheta that places planet[bestIndex] at sweetSpotTheta
    const offset = this._orbitals[bestIndex].thetaOffset;
    let target = sweetSpotTheta - offset;

    // Wrap to nearest position from current
    while (target - this._globalTheta > Math.PI) target -= Math.PI * 2;
    while (this._globalTheta - target > Math.PI) target += Math.PI * 2;

    this._targetTheta = target;
    this._snappedIndex = bestIndex;
  }

  // ─── Snap complete: flash selection ring + show HUD ───
  _onSnapComplete() {
    const orb = this._orbitals[this._snappedIndex];
    if (!orb || !orb.el) return;

    // Flash selection ring
    this._showSelectionRing(orb.el);

    // Show HUD with business metrics
    const bizId = orb.el.dataset.businessId;
    if (bizId === '__add__') return;

    const biz = this.businesses.find(b => b.id === bizId);
    if (biz) {
      this._showHUD(orb, biz);
    }
  }

  _showSelectionRing(worldEl) {
    this._selectionRingEl?.remove();

    const ring = document.createElement('div');
    ring.className = 'orbit-selection-ring';
    worldEl.appendChild(ring);
    this._selectionRingEl = ring;

    ring.addEventListener('animationend', () => ring.remove(), { once: true });
  }

  _showHUD(orb, business) {
    this._hideHUD();

    const hud = document.createElement('div');
    hud.className = 'orbit-hud';
    hud.innerHTML = `
      <div class="orbit-hud-header">
        <span class="orbit-hud-name">${business.nombre}</span>
        <span class="orbit-hud-status orbit-hud-status--active">
          <span class="orbit-hud-status-dot"></span> Activo
        </span>
      </div>
      <div class="orbit-hud-metrics">
        <div class="orbit-hud-metric">
          <span class="orbit-hud-metric-label">Ecosistema</span>
          <span class="orbit-hud-metric-value">Operativo</span>
        </div>
        <div class="orbit-hud-metric">
          <span class="orbit-hud-metric-label">Conexion</span>
          <span class="orbit-hud-metric-value">Estable</span>
        </div>
      </div>
    `;

    this.container.querySelector('#orbital-system-3d')?.appendChild(hud);
    this._hudEl = hud;

    requestAnimationFrame(() => hud.classList.add('orbit-hud--visible'));
  }

  _hideHUD() {
    if (this._hudEl) {
      this._hudEl.classList.remove('orbit-hud--visible');
      const h = this._hudEl;
      setTimeout(() => h?.remove(), 300);
      this._hudEl = null;
    }
  }

  // ─── Ripple wave spawner ───
  _spawnRipples(worldEl) {
    const ripplesContainer = worldEl.querySelector('.orbit-world-ripples');
    if (!ripplesContainer) return;

    ripplesContainer.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const ripple = document.createElement('div');
      ripple.className = 'ripple-wave';
      ripple.style.animationDelay = `${i * 0.4}s`;
      ripplesContainer.appendChild(ripple);

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

    const comingSoonIds = ['xazai', 'gregoria'];

    // ═══ SCROLL-JACKING EVENT LISTENERS ═══

    // Mouse wheel → rotate orbit
    this._wheelHandler = (e) => {
      // Only hijack scroll on home page
      if (!this.container.querySelector('#orbital-system-3d')) return;

      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      this._scrollVel += px * 0.0008;
      this._targetTheta = null;
      this._snappedIndex = -1;
      this._hideHUD();
      this._lastScrollTime = performance.now();

      // Push parallax starfield
      if (this._particleCanvas?.setScrollOffset) {
        this._particleCanvas.setScrollOffset(px * 0.5);
      }
    };
    window.addEventListener('wheel', this._wheelHandler, { passive: false });

    // Touch swipe → rotate orbit
    this._touchStartHandler = (e) => {
      this._touchStartY = e.touches[0].clientY;
      this._touchLastY = this._touchStartY;
    };

    this._touchMoveHandler = (e) => {
      if (!this.container.querySelector('#orbital-system-3d')) return;

      e.preventDefault();
      const y = e.touches[0].clientY;
      const dy = y - this._touchLastY;
      this._scrollVel += dy * -0.003; // inverted: swipe up = rotate forward
      this._touchLastY = y;
      this._lastScrollTime = performance.now();
      this._targetTheta = null;
      this._snappedIndex = -1;
      this._hideHUD();

      if (this._particleCanvas?.setScrollOffset) {
        this._particleCanvas.setScrollOffset(dy * -0.8);
      }
    };

    this._touchEndHandler = () => {
      // Momentum carries via _scrollVel, snap engages naturally
    };

    window.addEventListener('touchstart', this._touchStartHandler, { passive: true });
    window.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
    window.addEventListener('touchend', this._touchEndHandler, { passive: true });

    // Gyroscope for mobile parallax
    if (window.DeviceOrientationEvent) {
      this._gyroHandler = (e) => {
        if (this._particleCanvas?.setGyroOffset && e.gamma !== null && e.beta !== null) {
          this._particleCanvas.setGyroOffset(
            e.gamma * 0.02,
            (e.beta - 45) * 0.015
          );
        }
      };
      window.addEventListener('deviceorientation', this._gyroHandler);
    }

    // ═══ PLANET CLICK HANDLERS ═══

    this.container.querySelectorAll('.orbit-world').forEach(world => {
      world.addEventListener('click', () => {
        const bizId = world.dataset.businessId;

        // If this planet is already snapped and focused → navigate
        if (this._snappedIndex >= 0) {
          const snappedOrb = this._orbitals[this._snappedIndex];
          if (snappedOrb?.el === world) {
            // Planet is in focus — navigate to it

            // "Add my business" planet → supernova + appointment scheduler
            if (bizId === '__add__') {
              this._paused = true;
              this._activeWorld = world;
              world.classList.add('orbit-world--active');
              this._spawnRipples(world);
              this._triggerSupernova(world, () => {
                this._showAppointmentModal();
              });
              return;
            }

            // Coming soon → show bubble
            if (comingSoonIds.includes(bizId)) {
              const bizName = world.querySelector('.orbit-world-name')?.textContent || bizId;
              this._showComingSoonBubble(bizName);
              return;
            }

            // MDN Podcast → zoom then curtain
            if (bizId === 'mdn-podcast') {
              this._hideHUD();
              this._triggerZoomTransition(world, () => {
                window.location.hash = '#podcast/mdn-podcast';
              });
              return;
            }

            // Other navigable planets → zoom transition
            this._hideHUD();
            this._triggerZoomTransition(world, () => {
              window.location.hash = `#dashboard/${bizId}`;
            });
            return;
          }
        }

        // Otherwise: rotate to bring this planet to front focus
        const orbIndex = this._orbitals.findIndex(o => o.el === world);
        if (orbIndex >= 0) {
          const sweetSpotTheta = Math.PI / 2;
          const offset = this._orbitals[orbIndex].thetaOffset;
          let target = sweetSpotTheta - offset;

          while (target - this._globalTheta > Math.PI) target -= Math.PI * 2;
          while (this._globalTheta - target > Math.PI) target += Math.PI * 2;

          this._targetTheta = target;
          this._snappedIndex = orbIndex;
          this._scrollVel = 0;
          this._lastScrollTime = performance.now();
          this._hideHUD();
        }
      });
    });

    // Click on empty space → break snap, resume auto-rotation
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (systemEl) {
      systemEl.addEventListener('click', (e) => {
        if (e.target === systemEl || e.target.classList.contains('orbital-ring') || e.target.classList.contains('orbital-center')) {
          this._targetTheta = null;
          this._snappedIndex = -1;
          this._hideHUD();
          this._lastScrollTime = performance.now() - 3000; // allow auto-rotate

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

  // ─── Zoom-In Transition (planet entry) ───
  _triggerZoomTransition(worldEl, onComplete) {
    const rect = worldEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.innerHTML = `
      <div class="zoom-circle" style="left:${centerX}px;top:${centerY}px"></div>
      <div class="zoom-flash" style="left:${centerX}px;top:${centerY}px"></div>
    `;
    document.body.appendChild(overlay);

    // Spring-driven zoom
    let scale = 1;
    let vel = 0;
    const target = 40;
    const K = 60;
    const D = 12;
    let lastT = 0;
    let navigated = false;

    const circle = overlay.querySelector('.zoom-circle');

    const tick = (now) => {
      if (!lastT) { lastT = now; requestAnimationFrame(tick); return; }
      const dt = Math.min((now - lastT) / 1000, 0.025);
      lastT = now;

      const x = scale - target;
      vel += (-K * x - D * vel) * dt;
      scale += vel * dt;

      const diameter = rect.width * scale;
      circle.style.width = `${diameter}px`;
      circle.style.height = `${diameter}px`;

      const progress = Math.min(scale / target, 1);
      circle.style.opacity = Math.min(1, progress * 1.5);
      overlay.style.background = `rgba(10, 10, 15, ${progress * 0.9})`;

      // Border radius transitions from circle to rectangle
      circle.style.borderRadius = `${Math.max(0, 50 - progress * 50)}%`;

      if (progress > 0.65 && !navigated) {
        navigated = true;
        onComplete();
      }

      if (progress > 0.95 && Math.abs(vel) < 0.5) {
        setTimeout(() => overlay.remove(), 400);
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(() => {
      overlay.classList.add('zoom-overlay--active');
      requestAnimationFrame(tick);
    });
  }

  // ─── Bubble notification for "Coming Soon" worlds ───
  _showComingSoonBubble(businessName) {
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

    this._bubbleTimeout = setTimeout(dismiss, 3500);

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

    requestAnimationFrame(() => nova.classList.add('supernova-overlay--active'));

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

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = overlay.querySelector('#appt-date');
    if (dateInput) dateInput.min = tomorrow.toISOString().split('T')[0];

    requestAnimationFrame(() => overlay.classList.add('appt-modal-overlay--visible'));

    const close = () => {
      overlay.classList.remove('appt-modal-overlay--visible');
      overlay.classList.add('appt-modal-overlay--closing');
      setTimeout(() => overlay.remove(), 350);
      this._paused = false;
      if (this._activeWorld) {
        this._activeWorld.classList.remove('orbit-world--active');
        this._activeWorld = null;
      }
    };

    overlay.querySelector('#appt-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

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

    let pos = -115;
    let vel = 0;
    let target = 0;
    let phase = 'closing';
    let navigated = false;

    let K = 110;
    let D = 16;

    let lastT = 0;

    const render = () => {
      const closedness = Math.max(0, Math.min(1, 1 - Math.abs(pos) / 115));

      const skew = Math.max(-2.8, Math.min(2.8, vel * 0.005));
      const sx = Math.max(0.96, 1 - Math.abs(vel) * 0.00016);
      const mBlur = Math.min(28, Math.abs(vel) * 0.055);
      const mDir = vel > 0 ? 1 : -1;

      panelL.style.transform =
        `translate3d(${pos}%,0,0) skewX(${skew}deg) scaleX(${sx})`;
      panelR.style.transform =
        `translate3d(${-pos}%,0,0) skewX(${-skew}deg) scaleX(${sx})`;

      const sStr = `${mBlur * mDir}px 0 ${mBlur * 1.4}px rgba(0,0,0,${(0.25 + closedness * 0.35).toFixed(2)})`;
      panelL.style.boxShadow = sStr;
      panelR.style.boxShadow = sStr.replace(mBlur * mDir, -mBlur * mDir);

      dimmer.style.opacity = (closedness * 0.7).toFixed(3);
      valance.style.opacity = Math.min(1, closedness * 2.2).toFixed(3);

      const tOp = Math.max(0, (closedness - 0.75) / 0.25).toFixed(3);
      trimL.style.opacity = tOp;
      trimR.style.opacity = tOp;

      const eOp = (closedness * 0.75).toFixed(3);
      edgeSL.style.opacity = eOp;
      edgeSR.style.opacity = eOp;

      const smOp = Math.max(0, (closedness - 0.88) / 0.12).toFixed(3);
      seam.style.opacity = smOp;
      seamHalo.style.opacity = (smOp * 0.65).toFixed(3);

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

    const tick = (now) => {
      if (!lastT) { lastT = now; requestAnimationFrame(tick); return; }

      const dt = Math.min((now - lastT) / 1000, 0.022);
      lastT = now;

      const x = pos - target;
      vel += (-K * x - D * vel) * dt;
      pos += vel * dt;

      render();

      const settled = Math.abs(x) < 0.06 && Math.abs(vel) < 0.3;

      if (settled && phase === 'closing') {
        pos = 0; vel = 0;
        render();
        phase = 'hold';

        if (onComplete && !navigated) { navigated = true; onComplete(); }

        setTimeout(() => {
          phase = 'opening';
          target = -115;
          K = 80;
          D = 13;
          vel = 12;
          lastT = 0;
          requestAnimationFrame(tick);
        }, 400);
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

  unmount() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._rippleInterval) {
      clearInterval(this._rippleInterval);
    }

    // Clean up scroll-jacking listeners
    if (this._wheelHandler) {
      window.removeEventListener('wheel', this._wheelHandler);
    }
    if (this._touchStartHandler) {
      window.removeEventListener('touchstart', this._touchStartHandler);
      window.removeEventListener('touchmove', this._touchMoveHandler);
      window.removeEventListener('touchend', this._touchEndHandler);
    }
    if (this._gyroHandler) {
      window.removeEventListener('deviceorientation', this._gyroHandler);
    }

    this._hideHUD();
    this._selectionRingEl?.remove();
    // Note: Do NOT remove curtain-overlay or zoom-overlay here
  }
}
