import userAuth from '../services/userAuth.js';
import { apiUrl } from '../services/apiConfig.js';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

    // Fetch KPI data for superadmin panels
    this._kpiData = null;
    if (isSuperAdmin) {
      try {
        const res = await fetch(apiUrl('/api/command-data?range=30d'));
        if (res.ok) this._kpiData = await res.json();
      } catch (e) {
        console.error('Failed to load KPI data:', e);
      }
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
            <button class="home-admin" id="home-command-btn" title="Command Center" style="position: fixed; top: var(--space-5); right: calc(var(--space-5) + 104px);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button class="home-admin" id="home-comms-btn" title="Comm Center" style="position: fixed; top: var(--space-5); right: calc(var(--space-5) + 156px);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>
            </button>
          ` : ''}
          <button class="home-action-btn" id="home-logout" title="Cerrar sesion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Salir</span>
          </button>
        </div>

        ${this.businesses.length > 0 && isSuperAdmin ? this._buildSidePanels(firstName, user) : ''}

        <div class="home-ecosystem-label">Digital Ecosystem</div>
        <footer class="home-footer">Desarrollado por Acacio Malave</footer>
      </section>
    `;

    this._attachListeners();

    if (this.businesses.length > 0) {
      this._runCoreAssembly();
      this._initOrbitals();
      this._startAnimation();
      this._generateSparklines();

      // Visibility API — pause animation when tab hidden
      this._visHandler = () => {
        if (document.hidden) {
          if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
        } else {
          if (!this._animId) this._startAnimation();
        }
      };
      document.addEventListener('visibilitychange', this._visHandler);
    }
  }

  _buildSidePanels(firstName, user) {
    const activeCount = this.businesses.filter(b => !/estephano/i.test(b.nombre)).length;
    const total = this.businesses.length;
    const k = this._kpiData?.kpis;
    const fmt = (n) => (n || 0).toLocaleString('es-PA');
    const fmtMoney = (n) => '$' + (n || 0).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Revenue gauge: ratio of avg revenue per user vs $100 target
    const avgRev = k?.avgRevenuePerUser || 0;
    const gaugeVal = Math.min(Math.round((avgRev / 100) * 100), 100);
    const gaugeDash = (gaugeVal * 2.136).toFixed(1);
    const gaugeGap = ((100 - gaugeVal) * 2.136).toFixed(1);

    // Recent activity from KPI data
    const activity = this._kpiData?.recentActivity || [];
    const recent3 = activity.slice(0, 3);

    return `
      <aside class="home-panel home-panel--left" id="home-panel-left">
        <div class="home-panel-section">
          <div class="panel-header">
            <span class="panel-header-dot"></span>
            <span class="panel-header-title">Command Overview</span>
          </div>
        </div>
        <div class="home-panel-divider"></div>
        <div class="home-panel-section">
          <div class="home-panel-label">USUARIOS TOTALES</div>
          <div class="panel-stat-row">
            <span class="panel-stat-big">${k ? fmt(k.totalUsers) : '--'}</span>
          </div>
        </div>
        <div class="home-panel-section">
          <div class="home-panel-label">REVENUE TOTAL</div>
          <div class="panel-big-metric">
            <span class="panel-big-number">${k ? fmtMoney(k.totalRevenue) : '--'}</span>
          </div>
        </div>
        <div class="home-panel-divider"></div>
        <div class="home-panel-section">
          <div class="home-panel-label">TRANSACCIONES</div>
          <div class="panel-stat-row">
            <span class="panel-stat-big">${k ? fmt(k.totalTransactions) : '--'}</span>
          </div>
        </div>
        <div class="home-panel-divider"></div>
        <div class="home-panel-section" style="align-items: center;">
          <div class="home-panel-label" style="align-self: flex-start;">AVG REVENUE / USER</div>
          <svg class="panel-gauge" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(57,255,20,0.1)" stroke-width="5"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--neon-green)" stroke-width="5"
              stroke-dasharray="${gaugeDash} ${gaugeGap}" stroke-linecap="round" transform="rotate(-90 40 40)"/>
          </svg>
          <span class="panel-gauge-value">${k ? fmtMoney(avgRev) : '--'}</span>
        </div>
        <div class="home-panel-divider"></div>
        <div class="home-panel-section">
          <div class="panel-mini-stat">
            <span class="panel-mini-label">Negocios Activos</span>
            <span class="panel-mini-value">${activeCount}/${total}</span>
          </div>
          <div class="panel-mini-stat">
            <span class="panel-mini-label">Ecosistema</span>
            <span class="panel-mini-value">${total} nodos</span>
          </div>
        </div>
      </aside>

      <aside class="home-panel home-panel--right" id="home-panel-right">
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-icon">&#9883;</span>
            <div>
              <div class="panel-card-title">Metricas del Ecosistema</div>
              <div class="panel-card-subtitle">Resumen General</div>
            </div>
          </div>
          <div class="panel-card-stats">
            <div class="panel-card-stat-row"><span>Usuarios</span><span class="panel-card-stat-val">${k ? fmt(k.totalUsers) : '--'}</span></div>
            <div class="panel-card-stat-row"><span>Transacciones</span><span class="panel-card-stat-val">${k ? fmt(k.totalTransactions) : '--'}</span></div>
            <div class="panel-card-stat-row"><span>Avg/User</span><span class="panel-card-stat-val">${k ? fmtMoney(k.avgRevenuePerUser) : '--'}</span></div>
          </div>
        </div>
        <div class="home-panel-divider"></div>
        ${recent3.length > 0 ? `
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-icon">&#9734;</span>
            <div>
              <div class="panel-card-title">Actividad Reciente</div>
              <div class="panel-card-subtitle">Ultimos eventos</div>
            </div>
          </div>
          <div class="panel-card-stats">
            ${recent3.map(a => `
              <div class="panel-card-stat-row">
                <span>${a.icon || '•'} ${a.business || ''}</span>
                <span class="panel-card-stat-val">${a.type || ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        <div class="home-panel-divider"></div>
        <div class="panel-card">
          <div class="panel-card-header">
            <span class="panel-card-icon">&#128274;</span>
            <div>
              <div class="panel-card-title">Estado del Sistema</div>
              <div class="panel-card-subtitle">Security</div>
            </div>
          </div>
          <div class="panel-card-status-row">
            <div class="home-panel-status-dot"></div>
            <span>${k ? 'Todos los sistemas activos' : 'Sin conexion'}</span>
          </div>
        </div>
      </aside>
    `;
  }

  _buildOrbitalSystem() {
    // Businesses that need a white/light background in their hexagon
    const lightBgNames = ['lina tour'];

    const worlds = this.businesses.map((biz, index) => {
      const isStandby = /estephano/i.test(biz.nombre);
      const needsLightBg = lightBgNames.some(n => new RegExp(n, 'i').test(biz.nombre));
      return `
        <div class="orbit-world${isStandby ? ' orbit-world--standby' : ''}${needsLightBg ? ' orbit-world--light-bg' : ''}" data-business-id="${biz.id}" data-orbit-index="${index}">
          <div class="orbit-world-glow"></div>
          <div class="orbit-world-ripples"></div>
          <div class="orbit-world-holo">
            <div class="orbit-world-holo-frame"></div>
            <div class="orbit-world-holo-shimmer"></div>
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
          </div>
          <span class="orbit-world-name">${biz.nombre}</span>
          <span class="orbit-world-readout">${biz.tipo || 'SISTEMA'}</span>
          ${isStandby ? '<span class="orbit-world-standby-badge">Stand by</span>' : ''}
        </div>
      `;
    }).join('');

    // "Add my business" planet — always last in orbit
    const addPlanet = `
      <div class="orbit-world orbit-world--add" data-business-id="__add__" data-orbit-index="${this.businesses.length}">
        <div class="orbit-world-glow"></div>
        <div class="orbit-world-ripples"></div>
        <div class="orbit-world-holo">
          <div class="orbit-world-holo-frame"></div>
          <div class="orbit-world-img">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
        <span class="orbit-world-name">Mi Negocio</span>
      </div>
    `;

    return `
      <div class="orbital-system" id="orbital-system-3d">
        <!-- Glowing energy orbital ring -->
        <div class="orbital-energy-ring" id="orbital-energy-ring">
          <svg class="orbital-energy-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur1"/>
                <feGaussianBlur stdDeviation="3.5" result="blur2"/>
                <feMerge>
                  <feMergeNode in="blur2"/>
                  <feMergeNode in="blur1"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="50" cy="50" r="44"
              fill="none" stroke="rgba(139,92,246,0.03)" stroke-width="0.3" />
            <circle cx="50" cy="50" r="44"
              fill="none" stroke="var(--purple-500)" stroke-width="0.5"
              stroke-linecap="round"
              class="orbital-energy-segments" filter="url(#neonGlow)" />
          </svg>
          <div class="orbital-ring-indicator">
            <span class="orbital-ring-pct">5%</span>
          </div>
          <div class="orbital-energy-trail" id="orbital-energy-trail"></div>
        </div>

        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <div class="orbital-center-glow" id="orbital-center-glow"></div>

        <!-- 3D Geometric Core -->
        <div class="core-geometric" id="core-geometric">
          <div class="core-volumetric-rays"></div>
          <div class="core-ambient-glow"></div>
          <div class="core-assembly-particles" id="core-assembly-particles"></div>
          <div class="core-3d-scene">
            <div class="core-3d-floater">
              <img src="assets/images/Accios.001.png" alt="ACCIOS CORE" class="core-hero-img" draggable="false" />
            </div>
          </div>
          <div class="core-orbit-ring core-orbit-ring--1"></div>
          <div class="core-orbit-ring core-orbit-ring--2"></div>
        </div>

        <!-- Energy beam canvas -->
        <canvas class="energy-beam-canvas" id="energy-beam-canvas"></canvas>

        ${worlds}
        ${addPlanet}
      </div>
    `;
  }

  // ─── Core Assembly Animation ──────────────────────────

  _runCoreAssembly() {
    const core = this.container.querySelector('#core-geometric');
    const particleContainer = this.container.querySelector('#core-assembly-particles');
    if (!core || !particleContainer) return;

    const scene3d = core.querySelector('.core-3d-scene');
    const rings = core.querySelectorAll('.core-orbit-ring');
    const rays = core.querySelector('.core-volumetric-rays');

    // Hide core elements initially
    if (scene3d) { scene3d.style.opacity = '0'; scene3d.style.transform = 'scale(0.3)'; }
    rings.forEach(el => { el.style.opacity = '0'; });
    if (rays) { rays.style.opacity = '0'; }

    // Spawn assembly particles
    const PARTICLE_COUNT = 50;
    const assemblyParticles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'assembly-particle';
      particleContainer.appendChild(el);

      const angle = (Math.PI * 2 / PARTICLE_COUNT) * i + (Math.random() - 0.5) * 0.5;
      const dist = 180 + Math.random() * 250;

      assemblyParticles.push({
        el,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0, vy: 0,
        delay: i * 25,
        arrived: false,
        size: 2 + Math.random() * 4,
      });
    }

    const K = 140, D = 18;
    let startTime = null;
    let allArrived = false;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const dt = Math.min(1 / 60, 0.025);
      let arrivedCount = 0;

      for (const p of assemblyParticles) {
        if (elapsed < p.delay) { p.el.style.opacity = '0'; continue; }
        if (p.arrived) { arrivedCount++; continue; }

        p.vx += (-K * p.x - D * p.vx) * dt;
        p.vy += (-K * p.y - D * p.vy) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        const opacity = Math.min(1, (elapsed - p.delay) / 300);

        p.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        p.el.style.opacity = opacity.toFixed(2);
        p.el.style.width = p.el.style.height = `${p.size}px`;

        if (dist < 2 && Math.abs(p.vx) < 1 && Math.abs(p.vy) < 1) {
          p.arrived = true;
          p.el.style.opacity = '0';
          arrivedCount++;
        }
      }

      const progress = arrivedCount / assemblyParticles.length;

      // Progressively reveal 3D scene
      if (scene3d) {
        const sceneP = Math.min(1, progress * 1.2);
        scene3d.style.opacity = sceneP.toFixed(3);
        scene3d.style.transform = `scale(${0.3 + sceneP * 0.7})`;
      }

      if (progress >= 1 && !allArrived) {
        allArrived = true;
        requestAnimationFrame(() => {
          if (scene3d) { scene3d.style.transition = 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)'; scene3d.style.opacity = '1'; scene3d.style.transform = 'scale(1)'; }
          rings.forEach(r => { r.style.transition = 'opacity 0.8s ease'; r.style.opacity = '1'; });
          if (rays) { rays.style.transition = 'opacity 1.2s ease'; rays.style.opacity = String(getComputedStyle(document.documentElement).getPropertyValue('--vol-light-intensity').trim() || '0.9'); }
          setTimeout(() => { particleContainer.innerHTML = ''; }, 600);
          core.classList.add('core-geometric--assembled');
        });
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  // ─── Particle Stream System ──────────────────────────────

  _initParticles() {
    const w = window.innerWidth;
    const count = w >= 1100 ? 250 : w >= 768 ? 120 : 80;
    const trailLen = w >= 768 ? 12 : 6;

    const purplePool = ['#A78BFA', '#7C3AED', '#8B5CF6'];
    const cyanPool = ['#06B6D4', '#22D3EE', '#67E8F9'];

    this._particles = [];
    this._particleTrailLen = trailLen;

    for (let i = 0; i < count; i++) {
      const isCyan = Math.random() < 0.3;
      const colors = isCyan ? cyanPool : purplePool;
      const hex = colors[Math.floor(Math.random() * colors.length)];
      const clusterBase = Math.floor(i / 8) * 0.4;

      this._particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (0.0003 + Math.random() * 0.0006) * (Math.random() < 0.5 ? 1 : -1),
        radiusX: 80 + Math.random() * 180 + clusterBase * 20,
        radiusY: 60 + Math.random() * 140 + clusterBase * 15,
        tilt: (Math.random() - 0.5) * 0.6,
        size: 1 + Math.random() * 2.5,
        color: hex,
        alpha: 0.4 + Math.random() * 0.5,
        trail: [],
      });
    }
  }

  // ─── Sparkline Generation ──────────────────────────────

  _generateSparklines() {
    const ids = ['spark-perf-1', 'spark-perf-2'];
    for (const id of ids) {
      const svg = this.container.querySelector(`#${id}`);
      if (!svg) continue;

      const pts = 20;
      const vals = [];
      let v = 15 + Math.random() * 10;
      for (let i = 0; i < pts; i++) {
        v = Math.max(2, Math.min(38, v + (Math.random() - 0.45) * 8));
        vals.push(v);
      }

      const step = 200 / (pts - 1);
      const points = vals.map((val, i) => `${(i * step).toFixed(1)},${(40 - val).toFixed(1)}`).join(' ');
      const fillPoints = `0,40 ${points} 200,40`;

      const gradId = `sparkGrad-${id}`;
      svg.innerHTML = `
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(139,92,246,0.25)"/>
            <stop offset="100%" stop-color="rgba(139,92,246,0)"/>
          </linearGradient>
        </defs>
        <polygon points="${fillPoints}" fill="url(#${gradId})" />
        <polyline points="${points}" fill="none" stroke="var(--purple-400)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }
  }

  // ─── Solar System Engine ──────────────────────────────

  _initOrbitals() {
    const count = this.businesses.length + 1; // +1 for "add" planet
    const SPEED = 0.0008;

    // Create orbital entries for businesses + the add planet
    this._orbitals = [];
    for (let i = 0; i < count; i++) {
      const thetaOffset = (Math.PI * 2 / count) * i;
      this._orbitals.push({
        index: i,
        theta: thetaOffset,
        speed: SPEED,
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

    // Energy beam canvas (DPR capped at 2)
    const systemEl = this.container.querySelector('#orbital-system-3d');
    this._beamCanvas = this.container.querySelector('#energy-beam-canvas');
    if (this._beamCanvas && systemEl) {
      const r = systemEl.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._beamCanvas.width = r.width * dpr;
      this._beamCanvas.height = r.height * dpr;
      this._beamCanvas.style.width = r.width + 'px';
      this._beamCanvas.style.height = r.height + 'px';
      this._beamCtx = this._beamCanvas.getContext('2d');
      this._beamDpr = dpr;
    }

    // Init particle streams
    this._initParticles();

    // Trail dots along orbit path
    this._trailDots = [];
    const trailContainer = this.container.querySelector('#orbital-energy-trail');
    if (trailContainer) {
      for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'orbit-trail-dot';
        trailContainer.appendChild(dot);
        this._trailDots.push({
          el: dot,
          theta: (Math.PI * 2 / 4) * i,
          speed: 0.012,
        });
      }
    }
  }

  _startAnimation() {
    const systemEl = this.container.querySelector('#orbital-system-3d');
    if (!systemEl) return;

    const getRect = () => systemEl.getBoundingClientRect();
    const animate = () => {
      this._animId = requestAnimationFrame(animate);

      const r = getRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      const orbitRadius = Math.min(cx, cy) * 0.78;

      // ─── Advance orbit ───
      if (!this._paused) {
        for (const orb of this._orbitals) {
          orb.theta += orb.speed;
        }
      }

      let totalGlow = 0;
      const planetPositions = [];

      for (const orb of this._orbitals) {
        if (!orb.el) continue;

        // ─── 2D circular orbit ───
        const screenX = cx + orbitRadius * Math.cos(orb.theta);
        const screenY = cy + orbitRadius * Math.sin(orb.theta);

        // z-index: planets at top (sin < 0) behind center, bottom (sin > 0) in front
        const sinVal = Math.sin(orb.theta);
        const zIndex = Math.round(10 + sinVal * 5);
        planetPositions.push({ x: screenX, y: screenY });

        const scale = 1.0;
        const borderAlpha = 0.3;
        const shadowSpread = 16;

        orb.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
        orb.el.style.left = `${screenX.toFixed(1)}px`;
        orb.el.style.top = `${screenY.toFixed(1)}px`;
        orb.el.style.opacity = '1';
        orb.el.style.zIndex = zIndex;

        // All planets stay crisp — no depth blur
        orb.el.style.filter = 'none';

        // Dynamic sun illumination on holographic node
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
        }

        if (orb.nameEl) {
          orb.nameEl.style.opacity = '1';
        }

        if (orb.glowEl) {
          orb.glowEl.style.opacity = '0.3';
        }

        // Point Light
        const proximity = 1 - Math.min(Math.sqrt(
          (screenX - cx) * (screenX - cx) + (screenY - cy) * (screenY - cy)
        ) / orbitRadius, 1);
        const lightIntensity = Math.pow(proximity, 2) * 0.25;
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

      // ─── Particle streams + faint node beams ───
      const now = performance.now();
      if (this._beamCtx && this._beamCanvas && this._particles) {
        const dpr = this._beamDpr || 1;
        const bctx = this._beamCtx;
        bctx.clearRect(0, 0, this._beamCanvas.width, this._beamCanvas.height);

        const beamTime = now * 0.001;

        // Faint beam lines to nodes (very subtle)
        for (let i = 0; i < planetPositions.length; i++) {
          const target = planetPositions[i];
          if (!target) continue;
          const pulse = 0.15 + Math.sin(beamTime * 2 + i * 1.2) * 0.1;
          bctx.beginPath();
          bctx.moveTo(cx * dpr, cy * dpr);
          bctx.lineTo(target.x * dpr, target.y * dpr);
          bctx.strokeStyle = `rgba(167,139,250,${(pulse * 0.25).toFixed(3)})`;
          bctx.lineWidth = 0.5 * dpr;
          bctx.stroke();
        }

        // Particle stream rendering
        for (const p of this._particles) {
          p.angle += p.speed;

          const px = cx + p.radiusX * Math.cos(p.angle);
          const py = cy + p.radiusY * Math.sin(p.angle + p.tilt);

          // Store trail
          p.trail.push({ x: px, y: py });
          if (p.trail.length > this._particleTrailLen) p.trail.shift();

          // Draw trail
          for (let t = 0; t < p.trail.length - 1; t++) {
            const tp = p.trail[t];
            const trailAlpha = (t / p.trail.length) * p.alpha * 0.4;
            const trailSize = p.size * (t / p.trail.length) * 0.6;
            bctx.beginPath();
            bctx.arc(tp.x * dpr, tp.y * dpr, trailSize * dpr, 0, Math.PI * 2);
            bctx.fillStyle = hexToRgba(p.color, trailAlpha);
            bctx.fill();
          }

          // Draw particle
          bctx.beginPath();
          bctx.arc(px * dpr, py * dpr, p.size * dpr, 0, Math.PI * 2);
          bctx.fillStyle = hexToRgba(p.color, p.alpha);
          bctx.fill();

          // Glow pass for larger particles
          if (p.size > 2) {
            bctx.beginPath();
            bctx.arc(px * dpr, py * dpr, p.size * 2.5 * dpr, 0, Math.PI * 2);
            bctx.fillStyle = hexToRgba(p.color, p.alpha * 0.12);
            bctx.fill();
          }
        }
      }

      // ─── Orbit trail dots ───
      if (this._trailDots) {
        for (const trail of this._trailDots) {
          trail.theta += trail.speed;
          const tx = cx + orbitRadius * Math.cos(trail.theta);
          const ty = cy + orbitRadius * Math.sin(trail.theta);
          trail.el.style.left = `${tx.toFixed(1)}px`;
          trail.el.style.top = `${ty.toFixed(1)}px`;
          trail.el.style.transform = 'translate(-50%, -50%)';
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

    this.container.querySelector('#home-command-btn')?.addEventListener('click', () => {
      window.location.hash = '#command-center';
    });

    this.container.querySelector('#home-comms-btn')?.addEventListener('click', () => {
      window.location.hash = '#comms';
    });

    this.container.querySelector('#home-logout')?.addEventListener('click', () => {
      userAuth.clearSession();
      window.location.hash = '#login';
      window.location.reload();
    });

    // IDs that show the "coming soon" popup
    const comingSoonIds = ['gregoria'];

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

        // Lina Tour → cruise wave transition → slides presentation
        const bizNameLT = world.querySelector('.orbit-world-name')?.textContent || '';
        if (/lina.?tour/i.test(bizNameLT) || bizId === 'lina-tour') {
          this._triggerCruiseTransition(() => {
            window.location.hash = '#linatour';
          });
          return;
        }

        // Xazai → proposal page
        if (bizId === 'xazai') {
          window.location.href = 'Propuesta-Xazai-2026.html';
          return;
        }

        // ML Parts → business dashboard
        const bizNameText = world.querySelector('.orbit-world-name')?.textContent || '';
        if (/ml.?parts/i.test(bizNameText) || bizId === 'ml-parts') {
          window.location.hash = '#biz-dashboard/ml-parts';
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

  // ─── Timeline overlay for business progress ───
  _showTimeline(bizId, bizName) {
    // Remove existing overlay
    const existing = document.querySelector('.timeline-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'timeline-overlay';
    overlay.innerHTML = `
      <div class="timeline-container">
        <button class="timeline-close">&times;</button>
        <h2 class="timeline-title">${bizName}</h2>
        <p class="timeline-subtitle">Project Timeline</p>
        <div class="timeline-track" id="timeline-track">
          <div class="timeline-loading">Cargando...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Close button
    overlay.querySelector('.timeline-close').addEventListener('click', () => {
      overlay.classList.add('timeline-overlay--exit');
      if (this._timelineUnsub) { this._timelineUnsub(); this._timelineUnsub = null; }
      setTimeout(() => overlay.remove(), 300);
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.querySelector('.timeline-close').click();
      }
    });

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('timeline-overlay--active'));

    // Real-time listener
    const track = overlay.querySelector('#timeline-track');
    this._timelineUnsub = userAuth.onTimelineSnapshot(bizId, (steps) => {
      if (steps.length === 0) {
        track.innerHTML = '<div class="timeline-empty">No hay pasos registrados</div>';
        return;
      }
      track.innerHTML = `<div class="timeline-line-bg"></div>` + steps.map((step, i) => {
        const statusClass = step.status === 'completado' ? 'completed' : step.status === 'en_progreso' ? 'active' : 'pending';
        return `
          <div class="timeline-step timeline-step--${statusClass}" style="animation-delay: ${i * 0.1}s">
            <div class="timeline-node"></div>
            <div class="timeline-step-content">
              <span class="timeline-step-label">${step.title}</span>
              <span class="timeline-step-status">${step.status === 'completado' ? 'Completado' : step.status === 'en_progreso' ? 'En progreso' : 'Pendiente'}</span>
            </div>
          </div>
        `;
      }).join('');
    });
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
  // CRUISE WAVE — Ocean horizon transition for Lina Tour
  // ═══════════════════════════════════════════════════════
  _triggerCruiseTransition(onComplete) {
    document.querySelector('.lt-cruise-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lt-cruise-overlay';
    overlay.innerHTML = `
      <div class="lt-cruise-horizon"></div>
      <div class="lt-cruise-wave lt-cruise-wave--1"></div>
      <div class="lt-cruise-wave lt-cruise-wave--2"></div>
      <div class="lt-cruise-wave lt-cruise-wave--3"></div>
      <div class="lt-cruise-compass">
        <svg viewBox="0 0 60 60" width="60" height="60" fill="none" stroke="rgba(86,204,242,0.8)" stroke-width="1">
          <circle cx="30" cy="30" r="26" opacity="0.3"/>
          <line x1="30" y1="6" x2="30" y2="16" stroke-width="2"/>
          <line x1="30" y1="44" x2="30" y2="54" stroke-width="1.5" opacity="0.5"/>
          <line x1="6" y1="30" x2="16" y2="30" stroke-width="1.5" opacity="0.5"/>
          <line x1="44" y1="30" x2="54" y2="30" stroke-width="1.5" opacity="0.5"/>
          <polygon points="30,10 26,22 30,19 34,22" fill="rgba(212,168,67,0.9)" stroke="none"/>
          <polygon points="30,50 26,38 30,41 34,38" fill="rgba(86,204,242,0.4)" stroke="none"/>
        </svg>
      </div>
    `;

    // Inline styles for the overlay
    const s = overlay.style;
    s.position = 'fixed';
    s.inset = '0';
    s.zIndex = '50000';
    s.background = 'linear-gradient(180deg, #050a14 0%, #0a1628 40%, #0b4f6c 80%, #1b7a9e 100%)';
    s.display = 'flex';
    s.alignItems = 'center';
    s.justifyContent = 'center';
    s.opacity = '0';
    s.transition = 'opacity 0.6s ease';

    // Horizon line
    const hz = overlay.querySelector('.lt-cruise-horizon');
    hz.style.cssText = 'position:absolute;top:55%;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(86,204,242,0.5),rgba(212,168,67,0.4),rgba(86,204,242,0.5),transparent);transform:scaleX(0);transition:transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s;';

    // Waves
    overlay.querySelectorAll('.lt-cruise-wave').forEach((w, i) => {
      const delay = 0.2 + i * 0.15;
      const yOff = 58 + i * 6;
      w.style.cssText = `position:absolute;top:${yOff}%;left:-10%;width:120%;height:${40 - i*8}%;background:rgba(11,79,108,${0.25 - i*0.06});border-radius:50% 50% 0 0;transform:translateY(100%);transition:transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s;`;
    });

    // Compass
    const compass = overlay.querySelector('.lt-cruise-compass');
    compass.style.cssText = 'position:relative;z-index:2;opacity:0;transform:scale(0.5) rotate(-90deg);transition:opacity 0.5s ease 0.6s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s;';

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      s.opacity = '1';
      requestAnimationFrame(() => {
        hz.style.transform = 'scaleX(1)';
        overlay.querySelectorAll('.lt-cruise-wave').forEach(w => {
          w.style.transform = 'translateY(0)';
        });
        compass.style.opacity = '1';
        compass.style.transform = 'scale(1) rotate(0deg)';
      });
    });

    // Navigate after animation
    setTimeout(() => {
      if (onComplete) onComplete();
      setTimeout(() => overlay.remove(), 600);
    }, 1400);
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
    if (this._visHandler) {
      document.removeEventListener('visibilitychange', this._visHandler);
      this._visHandler = null;
    }
    this._beamCtx = null;
    this._beamCanvas = null;
    this._particles = null;
    this._trailDots = [];
    // Note: Do NOT remove curtain-overlay or shield-overlay here — they must
    // persist through navigation so the animation plays on the new page.
  }
}
