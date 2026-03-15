import userAuth from '../services/userAuth.js';
import { apiUrl } from '../services/apiConfig.js';
import { bizMatch } from '../services/bizUtils.js';
import {
  db, collection, doc, getDocs, updateDoc, onSnapshot,
  query, where, orderBy, Timestamp
} from '../services/firebase.js';

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
    this._paused = false;        // orbit paused when a planet is clicked
    this._activeWorld = null;    // which world is currently emitting waves
  }

  /** Escape HTML entities to prevent XSS */
  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  async render() {
    const user = this.currentUser;
    const isSuperAdmin = user?.role === 'superadmin';
    const isCollaborator = user?.role === 'collaborator';

    // Collaborators go directly to the solicitudes board
    if (isCollaborator) {
      window.location.hash = '#collaborators';
      return;
    }

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

    // Fetch businesses + KPI data in PARALLEL (not sequentially)
    this._kpiData = null;
    const bizPromise = (isSuperAdmin
      ? userAuth.getAllBusinesses()
      : userAuth.getUserBusinesses(user?.phone)
    ).catch(e => { console.error('Failed to load businesses:', e); return []; });

    const kpiPromise = isSuperAdmin
      ? fetch(apiUrl('/api/command-data?range=30d'))
          .then(res => res.ok ? res.json() : null)
          .catch(e => { console.error('Failed to load KPI data:', e); return null; })
      : Promise.resolve(null);

    const [businesses, kpiData] = await Promise.all([bizPromise, kpiPromise]);
    this.businesses = businesses || [];
    this._kpiData = kpiData;

    const firstName = (user?.name || '').split(' ')[0] || '';

    this.container.innerHTML = `
      <section class="home-page">
        ${firstName ? `<div class="home-greeting">Hola, ${this._esc(firstName)}</div>` : ''}
        <div class="home-content">
          ${this.businesses.length > 0 ? this._buildOrbitalSystem() : this._buildEmptyState()}
        </div>

        <div class="home-actions">
          ${isSuperAdmin ? `
            <div class="home-admin-bar">
              <button class="home-admin" id="home-collab-btn" title="Panel de Equipo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </button>
              <button class="home-admin" id="home-command-btn" title="Command Center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button class="home-admin" id="home-finance-btn" title="Finanzas">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button class="home-admin" id="home-superadmin-btn" title="Super Admin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </button>
            </div>
          ` : ''}
          <button class="home-action-btn" id="home-logout" title="Cerrar sesion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Salir</span>
          </button>
        </div>

        ${this.businesses.length > 0 && isSuperAdmin ? this._buildSidePanels(firstName, user) : ''}
        ${this.businesses.length > 0 && isSuperAdmin ? this._buildMobileKpiStrip() : ''}

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

  _buildMobileKpiStrip() {
    const k = this._kpiData?.kpis;
    const fmt = (n) => (n || 0).toLocaleString('es-PA');
    const fmtMoney = (n) => '$' + (n || 0).toLocaleString('es-PA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const activeCount = this.businesses.filter(b => !/estephano/i.test(b.nombre)).length;
    const total = this.businesses.length;

    return `
      <div class="mobile-kpi-strip" id="mobile-kpi-strip">
        <div class="mobile-kpi-scroll">
          <div class="mobile-kpi-card">
            <div class="mobile-kpi-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="mobile-kpi-data">
              <span class="mobile-kpi-value">${k ? fmt(k.totalUsers) : '--'}</span>
              <span class="mobile-kpi-label">Usuarios</span>
            </div>
          </div>
          <div class="mobile-kpi-card">
            <div class="mobile-kpi-icon mobile-kpi-icon--revenue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="mobile-kpi-data">
              <span class="mobile-kpi-value">${k ? fmtMoney(k.totalRevenue) : '--'}</span>
              <span class="mobile-kpi-label">Revenue</span>
            </div>
          </div>
          <div class="mobile-kpi-card">
            <div class="mobile-kpi-icon mobile-kpi-icon--txn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div class="mobile-kpi-data">
              <span class="mobile-kpi-value">${k ? fmt(k.totalTransactions) : '--'}</span>
              <span class="mobile-kpi-label">Transacciones</span>
            </div>
          </div>
          <div class="mobile-kpi-card">
            <div class="mobile-kpi-icon mobile-kpi-icon--biz">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div class="mobile-kpi-data">
              <span class="mobile-kpi-value">${activeCount}/${total}</span>
              <span class="mobile-kpi-label">Negocios</span>
            </div>
          </div>
        </div>
      </div>
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
                ? `<img src="${this._esc(biz.logo)}" alt="${this._esc(biz.nombre)}" draggable="false" />`
                : `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                     <rect x="2" y="3" width="20" height="14" rx="2"/>
                     <line x1="8" y1="21" x2="16" y2="21"/>
                     <line x1="12" y1="17" x2="12" y2="21"/>
                   </svg>`
              }
            </div>
          </div>
          <span class="orbit-world-name">${this._esc(biz.nombre)}</span>
          <span class="orbit-world-readout">${this._esc(biz.tipo) || 'SISTEMA'}</span>
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
          <div class="orbital-energy-trail" id="orbital-energy-trail"></div>
        </div>

        <div class="orbital-point-lights" id="orbital-point-lights"></div>

        <div class="orbital-center-glow" id="orbital-center-glow"></div>

        <!-- 3D Geometric Core -->
        <div class="core-geometric" id="core-geometric">
          <div class="core-volumetric-rays"></div>
          <div class="core-ambient-glow"></div>
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

  // ─── Apple-style Entrance Animation ──────────────────────────

  _runCoreAssembly() {
    const core = this.container.querySelector('#core-geometric');
    if (!core) return;

    const scene3d = core.querySelector('.core-3d-scene');
    const rings = core.querySelectorAll('.core-orbit-ring');
    const rays = core.querySelector('.core-volumetric-rays');
    const energyRing = this.container.querySelector('#orbital-energy-ring');
    const centerGlow = this.container.querySelector('#orbital-center-glow');

    // Apple curve
    const appleCurve = 'cubic-bezier(0.22, 1, 0.36, 1)';

    // Start everything hidden
    if (scene3d) {
      scene3d.style.opacity = '0';
      scene3d.style.transform = 'scale(0.6)';
      scene3d.style.filter = 'blur(12px)';
    }
    rings.forEach(el => { el.style.opacity = '0'; el.style.transform = 'scale(0.5)'; });
    if (rays) { rays.style.opacity = '0'; rays.style.transform = 'translate(-50%, -50%) scale(0.3)'; }
    if (energyRing) { energyRing.style.opacity = '0'; energyRing.style.transform = 'translate(-50%, -50%) scale(0.4)'; }
    if (centerGlow) { centerGlow.style.opacity = '0'; centerGlow.style.transform = 'scale(0.2)'; }

    // Phase 1 (50ms): Logo materializes from blur
    setTimeout(() => {
      if (scene3d) {
        scene3d.style.transition = `opacity 0.9s ${appleCurve}, transform 0.9s ${appleCurve}, filter 0.9s ${appleCurve}`;
        scene3d.style.opacity = '1';
        scene3d.style.transform = 'scale(1)';
        scene3d.style.filter = 'blur(0)';
      }
    }, 50);

    // Phase 2 (200ms): Center glow expands outward
    setTimeout(() => {
      if (centerGlow) {
        centerGlow.style.transition = `opacity 1s ${appleCurve}, transform 1s ${appleCurve}`;
        centerGlow.style.opacity = '0.5';
        centerGlow.style.transform = 'scale(1)';
      }
    }, 200);

    // Phase 3 (350ms): Volumetric light rays bloom
    setTimeout(() => {
      if (rays) {
        rays.style.transition = `opacity 1.2s ${appleCurve}, transform 1.2s ${appleCurve}`;
        rays.style.opacity = String(getComputedStyle(document.documentElement).getPropertyValue('--vol-light-intensity').trim() || '0.9');
        rays.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    }, 350);

    // Phase 4 (500ms): Orbit rings appear with scale
    setTimeout(() => {
      rings.forEach((r, i) => {
        r.style.transition = `opacity 0.8s ${appleCurve} ${i * 0.1}s, transform 0.8s ${appleCurve} ${i * 0.1}s`;
        r.style.opacity = '1';
        r.style.transform = 'scale(1)';
      });
    }, 500);

    // Phase 5 (600ms): Energy ring scales up
    setTimeout(() => {
      if (energyRing) {
        energyRing.style.transition = `opacity 1s ${appleCurve}, transform 1s ${appleCurve}`;
        energyRing.style.opacity = '1';
        energyRing.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    }, 600);

    // Clean up inline transitions after everything settles
    setTimeout(() => {
      if (scene3d) scene3d.style.transition = '';
      if (scene3d) scene3d.style.filter = '';
      rings.forEach(r => { r.style.transition = ''; r.style.transform = ''; });
      if (rays) rays.style.transition = '';
      if (energyRing) { energyRing.style.transition = ''; energyRing.style.transform = 'translate(-50%, -50%)'; }
      if (centerGlow) centerGlow.style.transition = '';
      core.classList.add('core-geometric--assembled');
    }, 2000);
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
        size: 0.4 + Math.random() * 1.0,
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

    // Mobile detection + perf optimizations
    const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Cache rect — only recalculate on resize, not every frame
    let cachedRect = systemEl.getBoundingClientRect();
    const onResize = () => { cachedRect = systemEl.getBoundingClientRect(); };
    window.addEventListener('resize', onResize);
    this._cleanupResize = () => window.removeEventListener('resize', onResize);

    // Frame skipping for mobile: render every other frame
    let frameCount = 0;

    const animate = () => {
      this._animId = requestAnimationFrame(animate);

      // On mobile, skip every other frame to halve GPU load
      if (isMobile && ++frameCount % 2 !== 0) return;

      const r = cachedRect;
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

      // ─── Particle streams + faint node beams (skip on mobile) ───
      const now = performance.now();
      if (!isMobile && this._beamCtx && this._beamCanvas && this._particles) {
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
          if (p.size > 1) {
            bctx.beginPath();
            bctx.arc(px * dpr, py * dpr, p.size * 2.5 * dpr, 0, Math.PI * 2);
            bctx.fillStyle = hexToRgba(p.color, p.alpha * 0.12);
            bctx.fill();
          }
        }
      }

      // ─── Orbit trail dots (skip on mobile) ───
      if (!isMobile && this._trailDots) {
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

    // Apple-style entrance: planets emerge from blur with stagger
    const worldEls = this.container.querySelectorAll('.orbit-world');
    const appleCurve = 'cubic-bezier(0.22, 1, 0.36, 1)';
    worldEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.4)';
      el.style.filter = 'blur(8px)';
      setTimeout(() => {
        el.style.transition = `opacity 0.9s ${appleCurve}, transform 0.9s ${appleCurve}, filter 0.9s ${appleCurve}`;
        el.style.opacity = '1';
        el.style.filter = 'blur(0)';
        setTimeout(() => {
          el.style.transition = 'none';
          el.style.filter = '';
        }, 1000);
      }, 800 + i * 120);
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

  /* ═══════════════════════════════════════════════
     COLLABORATOR HOME — Task-focused dashboard
     ═══════════════════════════════════════════════ */

  async _renderCollaboratorHome(user) {
    const firstName = (user?.name || '').split(' ')[0] || 'Colaborador';

    this.container.innerHTML = `
      <section class="collab-home">
        <div class="collab-home__loading">
          <div class="collab-spinner"></div>
          <p>Cargando tus tareas...</p>
        </div>
      </section>`;

    // Load tasks assigned to this collaborator
    let tasks = [];
    let collabDoc = null;
    try {
      // Find collaborator by phone
      const collabSnap = await getDocs(
        query(collection(db, 'collaborators'), where('phone', '==', user.phone?.replace('+507', '') || ''))
      );
      if (!collabSnap.empty) {
        collabDoc = { id: collabSnap.docs[0].id, ...collabSnap.docs[0].data() };
      }
      // Also try with formatted phone
      if (!collabDoc) {
        const collabSnap2 = await getDocs(
          query(collection(db, 'collaborators'), where('phone', '==', user.phone || ''))
        );
        if (!collabSnap2.empty) {
          collabDoc = { id: collabSnap2.docs[0].id, ...collabSnap2.docs[0].data() };
        }
      }

      if (collabDoc) {
        const taskSnap = await getDocs(
          query(collection(db, 'solicitudes'), where('assignedTo', '==', collabDoc.id), orderBy('createdAt', 'desc'))
        );
        tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        // Fallback: load all tasks
        const taskSnap = await getDocs(
          query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc'))
        );
        tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('[Home] Collaborator load error:', e);
    }

    this._collabTasks = tasks;
    this._collabDoc = collabDoc;

    const STATUSES = {
      inbox: { label: 'Bandeja', color: '#8B5CF6' },
      in_progress: { label: 'En Proceso', color: '#3B82F6' },
      review: { label: 'Revision', color: '#F59E0B' },
      done: { label: 'Completado', color: '#22C55E' },
    };

    const activeTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

    this.container.innerHTML = `
      <section class="collab-home">
        <header class="collab-home__header">
          <div class="collab-home__greeting">
            <h1 class="collab-home__title">Hola, ${firstName}</h1>
            <p class="collab-home__subtitle">Tienes ${activeTasks.length} tarea${activeTasks.length !== 1 ? 's' : ''} activa${activeTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div class="collab-home__stats">
            <div class="collab-home__stat">
              <span class="collab-home__stat-val">${activeTasks.length}</span>
              <span class="collab-home__stat-label">Activas</span>
            </div>
            <div class="collab-home__stat">
              <span class="collab-home__stat-val" style="color:#22C55E;">${doneTasks.length}</span>
              <span class="collab-home__stat-label">Completadas</span>
            </div>
            ${urgentCount > 0 ? `
            <div class="collab-home__stat collab-home__stat--urgent">
              <span class="collab-home__stat-val" style="color:#EF4444;">${urgentCount}</span>
              <span class="collab-home__stat-label">Urgentes</span>
            </div>` : ''}
          </div>
          <button class="home-action-btn" id="collab-home-logout" title="Cerrar sesion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Salir</span>
          </button>
        </header>

        <div class="collab-home__grid" id="collab-home-grid">
          ${activeTasks.length === 0 && doneTasks.length === 0 ? `
            <div class="collab-home__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <h3>Sin tareas asignadas</h3>
              <p>Cuando te asignen solicitudes apareceran aqui.</p>
            </div>
          ` : `
            ${activeTasks.map((task, i) => this._buildCollabTaskCard(task, STATUSES, i)).join('')}
            ${doneTasks.length > 0 ? `
              <div class="collab-home__divider">
                <span>Completadas</span>
              </div>
              ${doneTasks.slice(0, 5).map((task, i) => this._buildCollabTaskCard(task, STATUSES, activeTasks.length + i)).join('')}
            ` : ''}
          `}
        </div>

        <footer class="collab-home__footer">ACCIOS CORE</footer>
        <div class="collab-modal-overlay" id="collab-modal-overlay"></div>
      </section>
    `;

    this._attachCollabHomeListeners(STATUSES);
    this._startCollabRealtimeSync(collabDoc, STATUSES);
  }

  _buildCollabTaskCard(task, STATUSES, index) {
    const pri = task.priority || 'medium';
    const status = STATUSES[task.status || 'inbox'] || STATUSES.inbox;
    const PCOLORS = { low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' };
    const priColor = PCOLORS[pri] || PCOLORS.medium;
    const dateStr = this._formatCollabDate(task.createdAt);
    const tags = task.tags || [];
    const isDone = task.status === 'done';

    return `
    <div class="collab-home__card collab-home__card--${pri} ${isDone ? 'collab-home__card--done' : ''}"
         data-task-id="${task.id}" style="--card-index:${index}; --pri-color:${priColor}; --status-color:${status.color};">
      <div class="collab-home__card-accent"></div>
      <div class="collab-home__card-body">
        <div class="collab-home__card-top">
          <span class="collab-home__card-priority" style="background:${priColor};"></span>
          <span class="collab-home__card-status" style="color:${status.color};">${status.label}</span>
        </div>
        <h3 class="collab-home__card-title">${this._esc(task.title) || 'Sin titulo'}</h3>
        ${task.description ? `<p class="collab-home__card-desc">${this._esc(task.description.slice(0, 140))}${task.description.length > 140 ? '...' : ''}</p>` : ''}
        ${tags.length ? `<div class="collab-home__card-tags">${tags.map(t => `<span class="collab-home__card-tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
        <div class="collab-home__card-bottom">
          <span class="collab-home__card-date">${dateStr}</span>
          <div class="collab-home__card-actions">
            ${!isDone ? `
              <button class="collab-home__card-btn" data-move="${task.id}" data-to="${task.status === 'inbox' ? 'in_progress' : task.status === 'in_progress' ? 'review' : 'done'}" title="Avanzar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="collab-home__card-btn collab-home__card-btn--done" data-complete="${task.id}" title="Completar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  _formatCollabDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  _attachCollabHomeListeners(STATUSES) {
    // Logout
    this.container.querySelector('#collab-home-logout')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('accios-logout'));
      userAuth.clearSession();
      window.location.hash = '#login';
      window.location.reload();
    });

    // Move task forward
    this.container.querySelectorAll('[data-move]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.move;
        const newStatus = btn.dataset.to;
        try {
          await updateDoc(doc(db, 'solicitudes', taskId), { status: newStatus, updatedAt: Timestamp.now() });
          const label = STATUSES[newStatus]?.label || newStatus;
          document.dispatchEvent(new CustomEvent('toast', { detail: { message: `Movido a ${label}`, type: 'info' } }));
        } catch (err) {
          console.error('[Home] Move task error:', err);
        }
      });
    });

    // Complete task
    this.container.querySelectorAll('[data-complete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.complete;
        try {
          await updateDoc(doc(db, 'solicitudes', taskId), { status: 'done', updatedAt: Timestamp.now() });
          document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Tarea completada', type: 'success' } }));
        } catch (err) {
          console.error('[Home] Complete task error:', err);
        }
      });
    });
  }

  _startCollabRealtimeSync(collabDoc, STATUSES) {
    if (!collabDoc) return;
    try {
      this._unsubCollabTasks = onSnapshot(
        query(collection(db, 'solicitudes'), where('assignedTo', '==', collabDoc.id), orderBy('createdAt', 'desc')),
        (snap) => {
          this._collabTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const grid = this.container.querySelector('#collab-home-grid');
          if (!grid) return;

          const activeTasks = this._collabTasks.filter(t => t.status !== 'done');
          const doneTasks = this._collabTasks.filter(t => t.status === 'done');

          // Update stat counts
          const statVals = this.container.querySelectorAll('.collab-home__stat-val');
          if (statVals[0]) statVals[0].textContent = activeTasks.length;
          if (statVals[1]) statVals[1].textContent = doneTasks.length;

          // Update subtitle
          const sub = this.container.querySelector('.collab-home__subtitle');
          if (sub) sub.textContent = `Tienes ${activeTasks.length} tarea${activeTasks.length !== 1 ? 's' : ''} activa${activeTasks.length !== 1 ? 's' : ''}`;

          grid.innerHTML = activeTasks.length === 0 && doneTasks.length === 0
            ? `<div class="collab-home__empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <h3>Sin tareas asignadas</h3>
                <p>Cuando te asignen solicitudes apareceran aqui.</p>
              </div>`
            : `${activeTasks.map((t, i) => this._buildCollabTaskCard(t, STATUSES, i)).join('')}
               ${doneTasks.length > 0 ? `
                 <div class="collab-home__divider"><span>Completadas</span></div>
                 ${doneTasks.slice(0, 5).map((t, i) => this._buildCollabTaskCard(t, STATUSES, activeTasks.length + i)).join('')}
               ` : ''}`;

          this._attachCollabHomeListeners(STATUSES);
        }
      );
    } catch (e) {
      console.warn('[Home] Collab realtime sync error:', e);
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

    this.container.querySelector('#home-collab-btn')?.addEventListener('click', () => {
      window.location.hash = '#collaborators';
    });

    this.container.querySelector('#home-logout')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('accios-logout'));
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
        if (bizMatch(bizId, 'mdn-podcast')) {
          this._triggerCurtainTransition(() => {
            window.location.hash = '#podcast/mdn-podcast';
          });
          return;
        }

        // La Vaina → shield assembly → presentation page
        if (bizMatch(bizId, 'lavaina')) {
          this._triggerShieldTransition(() => {
            window.location.hash = '#lavaina';
          });
          return;
        }

        // Lina Tour → cruise wave transition → slides presentation
        if (bizMatch(bizId, 'lina-tour') || bizMatch(bizId, 'linatour')) {
          this._triggerCruiseTransition(() => {
            window.location.hash = '#linatour';
          });
          return;
        }

        // Xazai → business dashboard
        if (bizMatch(bizId, 'xazai')) {
          window.location.hash = '#biz-dashboard/xazai';
          return;
        }

        // Rush Ride → business dashboard
        if (bizMatch(bizId, 'rush-ride') || bizMatch(bizId, 'rushride')) {
          window.location.hash = '#biz-dashboard/rush-ride';
          return;
        }

        // ML Parts → business dashboard
        if (bizMatch(bizId, 'ml-parts') || bizMatch(bizId, 'mlparts')) {
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
          <span class="cosmos-bubble-name">${this._esc(businessName)}</span>
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
    if (this._cleanupResize) this._cleanupResize();
    if (this._rippleInterval) {
      clearInterval(this._rippleInterval);
    }
    if (this._visHandler) {
      document.removeEventListener('visibilitychange', this._visHandler);
      this._visHandler = null;
    }
    if (this._unsubCollabTasks) {
      this._unsubCollabTasks();
      this._unsubCollabTasks = null;
    }
    this._beamCtx = null;
    this._beamCanvas = null;
    this._particles = null;
    this._trailDots = [];
    // Note: Do NOT remove curtain-overlay or shield-overlay here — they must
    // persist through navigation so the animation plays on the new page.
  }
}
