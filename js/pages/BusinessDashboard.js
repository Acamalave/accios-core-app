import { apiUrl } from '../services/apiConfig.js';
import userAuth from '../services/userAuth.js';

/* ── Lucide-style SVG Icons (24x24 stroke-based) ─────────────────── */
const ICONS = {
  dollarSign: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendingDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  database: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  server: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  barChart: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  package: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  folderLock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><rect x="9" y="13" width="6" height="4" rx="1"/><path d="M10 13v-1a2 2 0 1 1 4 0v1"/></svg>`,
  xClose: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
};

export class BusinessDashboard {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getSession();
    this.businessId = businessId || 'ml-parts';
    this.data = null;
    this._bizMeta = null;
  }

  async render() {
    // Auth guard — superadmin only
    if (!this.currentUser || this.currentUser.role !== 'superadmin') {
      this.container.innerHTML = `
        <section class="biz-dash" style="display:flex;align-items:center;justify-content:center;">
          <div style="text-align:center;color:var(--text-muted);font-family:var(--font-mono);">
            <div style="font-size:48px;margin-bottom:16px;">🔒</div>
            <div style="font-size:14px;">ACCESO DENEGADO</div>
            <button class="glass-btn" style="margin-top:16px;" onclick="window.location.hash='#home'">Volver</button>
          </div>
        </section>`;
      return;
    }

    // Loading
    this.container.innerHTML = `
      <section class="biz-dash" style="display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;color:var(--text-muted);font-family:var(--font-mono);">
          <div style="font-size:14px;letter-spacing:2px;">CARGANDO DASHBOARD...</div>
        </div>
      </section>`;

    // Fetch data
    try {
      const res = await fetch(apiUrl('/api/command-data?range=30d'));
      if (res.ok) this.data = await res.json();
    } catch (e) {
      console.warn('[BizDash] Fetch error:', e);
    }

    // Resolve business metadata
    this._resolveBizMeta();

    // Roadmap de servicios compartido por todos los negocios
    const sharedServices = [
      { label: 'PRIORIDAD INMEDIATA — Hito 0: Desbloqueo Operativo', done: false },
      { label: 'HITO 1 — Optimización de Sitios Web para Conversión (CRO)', done: false },
      { label: 'INFRAESTRUCTURA — Hito 2: Activación de CRM', done: false },
      { label: 'SEMANAS 1-2 — Fase 1: Cimientos de Datos y Audiencias', done: false },
      { label: 'SEMANAS 3-4 — Fase 2: Arquitectura de Pauta', done: false },
      { label: 'MES 2+ — Fase 3: Despliegue Publicitario', done: false },
      { label: 'MES 3+ — Fase 4: Integración Operativa Avanzada', done: false }
    ];

    // Client businesses to display as cards
    this._clientBusinesses = [
      {
        id: 'ml-parts',
        name: 'ML Parts',
        subtitle: 'Repuestos industriales & suministro técnico',
        website: 'www.ml.parts',
        photo: 'assets/images/Negocios Estephano/Ml Parts.001.jpeg',
        progress: 1,
        emphasis: true,
        services: [
          { label: 'IRON PROTOCOL', done: false },
        ]
      },
      {
        id: 'megalift',
        name: 'Megalift',
        subtitle: 'Elevación industrial & logística vertical',
        website: 'megalifts.com',
        photo: 'assets/images/Negocios Estephano/Megalift.jpg',
        progress: 8,
        services: [
          { label: 'Verificación de usuario Meta', done: true },
          { label: 'Auditoría integral del ecosistema digital', done: false },
          { label: 'Optimización de sitio web — CRO para ventas y alquiler', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false },
          { label: 'Despliegue publicitario', done: false },
          { label: 'Monitoreo continuo', done: false },
        ]
      },
      {
        id: 'uniparts',
        name: 'Uniparts',
        subtitle: 'Distribución de partes',
        website: 'upandina.com',
        photo: 'assets/images/Negocios Estephano/Uniparts.png',
        progress: 1,
        services: sharedServices
      },
      {
        id: 'grupo-rca',
        name: 'Grupo RCA',
        subtitle: 'Grupo empresarial',
        website: 'Sin página web',
        photo: 'assets/images/Negocios Estephano/Grupo RCA.png',
        progress: 1,
        services: sharedServices
      },
      {
        id: 'parmonca',
        name: 'Parmonca',
        subtitle: 'Soluciones industriales & mantenimiento integral',
        website: 'Sin página web',
        photo: 'assets/images/Negocios Estephano/Parmonca.jpg',
        progress: 8,
        services: [
          { label: 'Verificación de usuario Meta', done: true },
          { label: 'Auditoría integral del ecosistema digital', done: false },
          { label: 'Creación de sitio web', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false },
          { label: 'Despliegue publicitario', done: false },
          { label: 'Monitoreo continuo', done: false },
        ]
      }
    ];

    // Render full dashboard
    this.container.innerHTML = this._buildHTML();
    this._attachListeners();
    this._attachPinListeners();
  }

  _resolveBizMeta() {
    // Try to find business data from API response
    const biz = this.data?.byBusiness || {};
    const bizId = this.businessId;

    // Map known business IDs to their API keys
    const idMap = {
      'ml-parts': null, // ML Parts may not be in the API yet
      'accios-core': 'accios-core',
      'rush-ride': 'rush-ride',
      'xazai': 'xazai'
    };

    const apiKey = idMap[bizId] || bizId;
    const bizData = biz[apiKey];

    // Business display info (fallback for ML Parts)
    const defaults = {
      'ml-parts': { name: 'ML Parts', icon: '⚙️', color: '#39FF14' },
      'accios-core': { name: 'ACCIOS CORE', icon: '🔮', color: '#7C3AED' },
      'rush-ride': { name: 'Rush Ride Studio', icon: '🏋️', color: '#39FF14' },
      'xazai': { name: 'Xazai', icon: '🍽️', color: '#F59E0B' }
    };

    const fallback = defaults[bizId] || { name: bizId, icon: '📊', color: '#8B5CF6' };

    this._bizMeta = {
      id: bizId,
      name: bizData?.name || fallback.name,
      icon: bizData?.icon || fallback.icon,
      color: bizData?.color || fallback.color,
      users: bizData?.users ?? '--',
      revenue: bizData?.revenue ?? '--',
      collections: bizData?.collections || {},
      activeMembers: bizData?.activeMembers ?? null
    };
  }

  _buildHTML() {
    const m = this._bizMeta;
    const kpis = this.data?.kpis || {};
    const totalTx = kpis.totalTransactions || kpis.totalOrders || '--';
    const avgRev = typeof m.revenue === 'number' && typeof m.users === 'number' && m.users > 0
      ? (m.revenue / m.users).toFixed(2)
      : '--';

    return `
    <section class="biz-dash biz-dash--clients">
      <!-- Dust particle canvas (full dashboard background) -->
      <canvas class="biz-dash__dust-canvas" aria-hidden="true"></canvas>

      <!-- Directional light from top-right (matches logo highlight) -->
      <div class="biz-dash__toplight"></div>
      <div class="biz-dash__toplight-flare"></div>

      <!-- Sidebar -->
      ${this._buildSidebar()}

      <!-- Left Panel: Metrics -->
      <div class="biz-dash__panel biz-dash__panel--left">
        ${this._buildLeftPanel(m, avgRev)}
      </div>

      <!-- Center: Free space -->
      <div class="biz-dash__center biz-dash__center--empty"></div>

      <!-- Right Panel: Client Business Cards (stacked) -->
      <div class="biz-dash__panel biz-dash__panel--right biz-dash__clients-area">
        <div class="biz-dash__clients-header">
          <div class="biz-dash__clients-title-row">
            <div class="biz-dash__panel-dot"></div>
            <h2 class="biz-dash__clients-title">Negocios</h2>
          </div>
          <span class="biz-dash__clients-count">${this._clientBusinesses.length}</span>
        </div>
        <div class="biz-dash__clients-stack">
          ${this._clientBusinesses.map((biz, i) => this._buildClientCard(biz, i)).join('')}
        </div>
      </div>

      <!-- Credential PIN Overlay (inline, always present) -->
      <div class="biz-cred__pin-overlay" id="cred-pin-overlay">
        <div class="biz-cred__pin-box">
          <button class="biz-cred__pin-close" id="cred-pin-close">${ICONS.xClose}</button>
          <div class="biz-cred__pin-lock">${ICONS.lock}</div>
          <h3 class="biz-cred__pin-title">Ingrese PIN</h3>
          <p class="biz-cred__pin-sub">Acceso a bóveda de credenciales</p>
          <div class="biz-cred__pin-inputs">
            <input type="password" maxlength="1" class="biz-cred__pin-digit" data-pin="0" inputmode="numeric" autocomplete="off" />
            <input type="password" maxlength="1" class="biz-cred__pin-digit" data-pin="1" inputmode="numeric" autocomplete="off" />
            <input type="password" maxlength="1" class="biz-cred__pin-digit" data-pin="2" inputmode="numeric" autocomplete="off" />
            <input type="password" maxlength="1" class="biz-cred__pin-digit" data-pin="3" inputmode="numeric" autocomplete="off" />
          </div>
          <div class="biz-cred__pin-error" id="cred-pin-error">PIN incorrecto</div>
        </div>
      </div>

      <!-- Credential Vault Overlay (content rendered dynamically) -->
      <div class="biz-cred__vault-overlay" id="cred-vault-overlay"></div>

    </section>`;
  }

  _buildSidebar() {
    return `
      <nav class="biz-dash__sidebar">
        <button class="biz-dash__sidebar-btn" data-nav="home" title="Home">${ICONS.home}</button>
        <button class="biz-dash__sidebar-btn biz-dash__sidebar-btn--active" title="Metricas">${ICONS.barChart}</button>
        <button class="biz-dash__sidebar-btn" title="Usuarios">${ICONS.users}</button>
        <button class="biz-dash__sidebar-btn" title="Settings">${ICONS.settings}</button>
        <div class="biz-dash__sidebar-spacer"></div>
        <div class="biz-dash__sidebar-sep"></div>
        <button class="biz-dash__sidebar-btn" data-nav="back" title="Volver">${ICONS.arrowLeft}</button>
      </nav>`;
  }

  /* ── SVG Sparkline Builder ─────────────────────────────────────── */
  _buildSparkline(dataPoints, id) {
    if (!dataPoints || dataPoints.length < 2) {
      // Fallback: generate synthetic micro-trend
      dataPoints = [3, 5, 4, 7, 6, 8, 7, 9, 8, 11, 10, 12];
    }
    const w = 200, h = 48, pad = 2;
    const max = Math.max(...dataPoints, 1);
    const min = Math.min(...dataPoints, 0);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / (dataPoints.length - 1);

    const points = dataPoints.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const polyline = points.join(' ');

    // Area fill path (close to bottom)
    const firstX = pad, lastX = pad + (dataPoints.length - 1) * stepX;
    const areaPath = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')} L${lastX},${h} L${firstX},${h} Z`;

    return `
      <svg class="biz-dash__sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad-${id}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#ea580c"/>
          </linearGradient>
          <linearGradient id="spark-area-${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f97316" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#spark-area-${id})"/>
        <polyline points="${polyline}" fill="none" stroke="url(#spark-grad-${id})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="3" fill="#f97316" stroke="#0A0A0F" stroke-width="1.5"/>
      </svg>`;
  }

  /* ── Circular Progress ──────────────────────────────────────────── */
  _buildCircularProgress(percent, label, size = 56) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;

    return `
      <div class="biz-dash__circ-wrap">
        <svg class="biz-dash__circ-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <defs>
            <linearGradient id="circ-grad-${label}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f97316"/>
              <stop offset="100%" stop-color="#ea580c"/>
            </linearGradient>
          </defs>
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#circ-grad-${label})" stroke-width="4"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"
            class="biz-dash__circ-arc"/>
        </svg>
        <div class="biz-dash__circ-value">${Math.round(percent)}%</div>
      </div>`;
  }

  /* ── Linear Progress Bar ────────────────────────────────────────── */
  _buildLinearProgress(percent, label) {
    return `
      <div class="biz-dash__linear-wrap">
        <div class="biz-dash__linear-header">
          <span class="biz-dash__linear-label">${label}</span>
          <span class="biz-dash__linear-pct">${Math.round(percent)}%</span>
        </div>
        <div class="biz-dash__linear-track">
          <div class="biz-dash__linear-fill" style="width:${Math.min(percent, 100)}%"></div>
        </div>
      </div>`;
  }

  _buildLeftPanel(m, avgRev) {
    const rev = typeof m.revenue === 'number' ? `$${m.revenue.toLocaleString()}` : '--';
    const users = typeof m.users === 'number' ? m.users.toLocaleString() : '--';
    const members = m.activeMembers !== null ? m.activeMembers.toLocaleString() : null;
    const collCount = Object.keys(m.collections).length;

    // Derive sparkline data from consumption trend if available
    const trend = this.data?.consumptionTrend || [];
    const last12 = trend.slice(-12);
    const bizKeys = last12.length ? Object.keys(last12[0]).filter(k => k !== 'month') : [];
    const revTrend = last12.map(e => bizKeys.reduce((s, k) => s + (e[k] || 0), 0));
    const userTrend = last12.map((_, i) => Math.round(20 + Math.sin(i * 0.5) * 8 + i * 2));

    // Progress percentages (derived from data or sensible fallbacks)
    const usersNum = typeof m.users === 'number' ? m.users : 0;
    const totalUsers = this.data?.kpis?.totalUsers || 1;
    const userShare = Math.min((usersNum / totalUsers) * 100, 100);
    const revenueTarget = 50000;
    const revNum = typeof m.revenue === 'number' ? m.revenue : 0;
    const revPercent = Math.min((revNum / revenueTarget) * 100, 100);
    const uptime = 99.2;
    const efficiency = collCount > 0 ? Math.min(collCount * 16, 95) : 42;

    // Trend indicator
    const lastTwo = revTrend.slice(-2);
    const isUp = lastTwo.length === 2 ? lastTwo[1] >= lastTwo[0] : true;
    const trendIcon = isUp ? ICONS.trendingUp : ICONS.trendingDown;
    const trendClass = isUp ? 'biz-dash__trend--up' : 'biz-dash__trend--down';

    return `
      <div class="biz-dash__panel-header">
        <div class="biz-dash__panel-dot"></div>
        <div class="biz-dash__panel-name">${m.name}</div>
      </div>

      <!-- Revenue Card -->
      <div class="biz-dash__metric biz-dash__metric--chart">
        <div class="biz-dash__metric-top">
          <div class="biz-dash__metric-icon biz-dash__metric-icon--copper">${ICONS.dollarSign}</div>
          <div class="biz-dash__metric-info">
            <div class="biz-dash__metric-label">Revenue Total</div>
            <div class="biz-dash__metric-row">
              <div class="biz-dash__metric-value">${rev}</div>
              <span class="biz-dash__trend ${trendClass}">${trendIcon}</span>
            </div>
          </div>
        </div>
        ${this._buildSparkline(revTrend, 'revenue')}
        <div class="biz-dash__metric-sub">Ultimos 30 dias</div>
      </div>

      <!-- Users Card -->
      <div class="biz-dash__metric biz-dash__metric--chart">
        <div class="biz-dash__metric-top">
          <div class="biz-dash__metric-icon biz-dash__metric-icon--copper">${ICONS.users}</div>
          <div class="biz-dash__metric-info">
            <div class="biz-dash__metric-label">Usuarios</div>
            <div class="biz-dash__metric-row">
              <div class="biz-dash__metric-value">${users}</div>
              ${members ? `<span class="biz-dash__metric-badge">${members} activos</span>` : ''}
            </div>
          </div>
        </div>
        ${this._buildSparkline(userTrend, 'users')}
      </div>

      <div class="biz-dash__divider"></div>

      <!-- Performance Card with Circular + Linear Progress -->
      <div class="biz-dash__metric biz-dash__metric--progress">
        <div class="biz-dash__metric-top">
          <div class="biz-dash__metric-icon biz-dash__metric-icon--copper">${ICONS.activity}</div>
          <div class="biz-dash__metric-info">
            <div class="biz-dash__metric-label">Rendimiento</div>
          </div>
        </div>
        <div class="biz-dash__progress-grid">
          ${this._buildCircularProgress(revPercent, 'rev')}
          ${this._buildCircularProgress(uptime, 'up')}
        </div>
        <div class="biz-dash__progress-labels">
          <span>Revenue</span>
          <span>Uptime</span>
        </div>
        ${this._buildLinearProgress(userShare, 'Usuarios (cuota ecosistema)')}
        ${this._buildLinearProgress(efficiency, 'Eficiencia operativa')}
      </div>

      <!-- Server/Collections Card -->
      <div class="biz-dash__metric">
        <div class="biz-dash__metric-top">
          <div class="biz-dash__metric-icon biz-dash__metric-icon--copper">${ICONS.database}</div>
          <div class="biz-dash__metric-info">
            <div class="biz-dash__metric-label">Collections</div>
            <div class="biz-dash__metric-value biz-dash__metric-value--purple">${collCount}</div>
          </div>
        </div>
        <div class="biz-dash__metric-sub">Colecciones activas</div>
      </div>

      <!-- Avg Revenue Card -->
      <div class="biz-dash__metric">
        <div class="biz-dash__metric-top">
          <div class="biz-dash__metric-icon biz-dash__metric-icon--copper">${ICONS.zap}</div>
          <div class="biz-dash__metric-info">
            <div class="biz-dash__metric-label">Avg Revenue / User</div>
            <div class="biz-dash__metric-value biz-dash__metric-value--purple">${avgRev !== '--' ? '$' + avgRev : '--'}</div>
          </div>
        </div>
      </div>

      <!-- Credential Folder -->
      <div class="biz-cred__folder" id="cred-folder-btn">
        <div class="biz-cred__folder-icon">${ICONS.folderLock}</div>
        <div class="biz-cred__folder-info">
          <div class="biz-cred__folder-name">Credenciales</div>
          <div class="biz-cred__folder-sub">Bóveda segura</div>
        </div>
        <div class="biz-cred__folder-shield">${ICONS.shield}</div>
      </div>`;
  }

  _buildClientCard(biz, index) {
    const initials = biz.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const photoHTML = biz.photo
      ? `<img class="biz-client__avatar-img" src="${biz.photo}" alt="${biz.name}" />`
      : `<span class="biz-client__avatar-initials">${initials}</span>`;

    const servicesHTML = biz.services.map(s => {
      const label = typeof s === 'string' ? s : s.label;
      const done = typeof s === 'object' && s.done;
      const icon = done
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
      return `<div class="biz-client__service-item ${done ? 'biz-client__service-item--done' : ''}">
        ${icon}
        <span>${label}</span>
      </div>`;
    }).join('');

    return `
      <div class="biz-client__card${biz.emphasis ? ' biz-client__card--emphasis' : ''}" data-client-id="${biz.id}" style="animation-delay: ${index * 0.08}s;">
        <!-- Card Header -->
        <div class="biz-client__header">
          <div class="biz-client__avatar">
            ${photoHTML}
          </div>
          <div class="biz-client__info">
            <h3 class="biz-client__name">${biz.name}</h3>
            <p class="biz-client__subtitle">${biz.subtitle}</p>
          </div>
        </div>

        <!-- Website -->
        <div class="biz-client__website">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>${biz.website}</span>
        </div>

        <!-- Progress Bar -->
        <div class="biz-client__progress-wrap">
          <div class="biz-client__progress-header">
            <span class="biz-client__progress-label">Progreso</span>
            <span class="biz-client__progress-pct">${biz.progress}%</span>
          </div>
          <div class="biz-client__progress-track">
            <div class="biz-client__progress-fill" style="width: ${biz.progress}%"></div>
          </div>
        </div>

        <!-- Services Toggle -->
        <button class="biz-client__services-toggle" data-toggle="${biz.id}">
          <span>Roadmap</span>
          <svg class="biz-client__toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="biz-client__services-panel" id="services-${biz.id}">
          ${servicesHTML}
        </div>
      </div>`;
  }

  _buildActivityChart() {
    const trend = this.data?.consumptionTrend;
    if (!trend || !trend.length) {
      return `
        <div class="biz-dash__chart-wrap">
          <div class="biz-dash__chart-title">Actividad Mensual</div>
          <div style="text-align:center;color:var(--text-dim);font-size:12px;font-family:var(--font-mono);padding:20px 0;">Sin datos de tendencia</div>
        </div>`;
    }

    // Get last 6 months and sum ALL business activity for the ecosystem view
    // (ML Parts doesn't have individual trend data yet)
    const last6 = trend.slice(-6);
    const bizKeys = Object.keys(last6[0] || {}).filter(k => k !== 'month');

    const values = last6.map(entry => {
      return bizKeys.reduce((sum, key) => sum + (entry[key] || 0), 0);
    });

    const maxVal = Math.max(...values, 1);
    const barWidth = 40;
    const gap = 16;
    const svgWidth = last6.length * (barWidth + gap);
    const svgHeight = 100;

    let bars = '';
    let labels = '';
    last6.forEach((entry, i) => {
      const x = i * (barWidth + gap) + gap / 2;
      const h = (values[i] / maxVal) * (svgHeight - 20);
      const y = svgHeight - 20 - h;
      const month = entry.month?.slice(5) || '';

      bars += `<rect class="biz-dash__chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3"/>`;
      labels += `<text class="biz-dash__chart-label" x="${x + barWidth / 2}" y="${svgHeight - 4}" text-anchor="middle">${month}</text>`;
    });

    return `
      <div class="biz-dash__chart-wrap">
        <div class="biz-dash__chart-title">Actividad Mensual — Ecosistema</div>
        <svg class="biz-dash__chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
          ${bars}
          ${labels}
        </svg>
      </div>`;
  }

  _buildRightPanel(m) {
    // Collections
    const collEntries = Object.entries(m.collections);
    const collHTML = collEntries.length
      ? collEntries.map(([name, count]) => `
          <div class="biz-dash__coll-row">
            <span class="biz-dash__coll-name">${name}</span>
            <span class="biz-dash__coll-count">${count}</span>
          </div>`).join('')
      : '<div style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono);">Sin colecciones</div>';

    // Business info
    const infoHTML = `
      <div class="biz-dash__info-row">
        <span class="biz-dash__info-label">ID</span>
        <span class="biz-dash__info-val">${m.id}</span>
      </div>
      <div class="biz-dash__info-row">
        <span class="biz-dash__info-label">Color</span>
        <span class="biz-dash__info-val" style="color:${m.color};">${m.color}</span>
      </div>`;

    // Recent activity (filtered by business)
    const activity = (this.data?.recentActivity || [])
      .filter(a => {
        const bizKey = this.businessId.replace(/-/g, '');
        const aBiz = (a.business || '').replace(/-/g, '');
        return aBiz.toLowerCase().includes(bizKey.toLowerCase());
      })
      .slice(0, 5);

    const actIcons = { order: '🧾', checkin: '✅', transaction: '💳', reservation: '📅', sale: '🛒', membership: '🎫', quote: '📄', expense: '📦' };

    const actHTML = activity.length
      ? activity.map(a => {
          const icon = actIcons[a.type] || '📌';
          const ago = this._timeAgo(a.date);
          return `
            <div class="biz-dash__activity-item">
              <span class="biz-dash__activity-icon">${icon}</span>
              <span class="biz-dash__activity-text">${a.description}</span>
              <span class="biz-dash__activity-time">${ago}</span>
            </div>`;
        }).join('')
      : '<div style="color:var(--text-dim);font-size:11px;font-family:var(--font-mono);">Sin actividad reciente</div>';

    return `
      <div class="biz-dash__card">
        <div class="biz-dash__card-title">
          <span class="biz-dash__card-title-icon">${ICONS.package}</span> Collections
        </div>
        ${collHTML}
      </div>

      <div class="biz-dash__card">
        <div class="biz-dash__card-title">
          <span class="biz-dash__card-title-icon">${ICONS.info}</span> Info
        </div>
        ${infoHTML}
      </div>

      <div class="biz-dash__card">
        <div class="biz-dash__card-title">
          <span class="biz-dash__card-title-icon">${ICONS.zap}</span> Actividad Reciente
        </div>
        ${actHTML}
      </div>

      <div class="biz-dash__status">
        <div class="biz-dash__status-dot"></div>
        <span class="biz-dash__status-text">Sistema activo</span>
      </div>`;
  }

  _getBusinessLogo(bizId) {
    // Known logo paths matching the orbital system
    const logos = {
      'ml-parts': 'assets/images/businesses/ml-parts.png',
      'accios-core': 'assets/images/Accios.001.png',
      'rush-ride': 'assets/images/businesses/rush-ride.png',
      'xazai': 'assets/images/businesses/xazai.png'
    };
    return logos[bizId] || null;
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  _attachListeners() {
    // Sidebar nav buttons
    this.container.querySelectorAll('.biz-dash__sidebar-btn[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        if (nav === 'home' || nav === 'back') {
          window.location.hash = '#home';
        }
      });
    });

    // Client card service toggle (expand/collapse)
    this.container.querySelectorAll('.biz-client__services-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.toggle;
        const panel = this.container.querySelector(`#services-${targetId}`);
        if (!panel) return;

        const isOpen = panel.classList.contains('biz-client__services-panel--open');
        // Close all other panels first
        this.container.querySelectorAll('.biz-client__services-panel--open').forEach(p => {
          p.classList.remove('biz-client__services-panel--open');
          p.previousElementSibling?.classList.remove('biz-client__services-toggle--open');
        });

        if (!isOpen) {
          panel.classList.add('biz-client__services-panel--open');
          btn.classList.add('biz-client__services-toggle--open');
        }
      });
    });

    // Credential folder click → Biometric (if available) or PIN modal
    const credBtn = this.container.querySelector('#cred-folder-btn');
    if (credBtn) {
      credBtn.addEventListener('click', async () => {
        // Try biometric first on mobile devices
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          ('ontouchstart' in window && window.innerWidth <= 1024);
        const phone = this.currentUser?.phone;

        if (isMobile && phone) {
          try {
            const bioAvailable = await userAuth.isBiometricAvailable();
            const bioRegistered = bioAvailable && userAuth.isBiometricEnabled(phone);
            if (bioRegistered) {
              await userAuth.authenticateBiometric(phone);
              this._showVault();
              return;
            }
          } catch (_) {
            // Biometric failed or cancelled → fall back to PIN
          }
        }

        this._showPinModal();
      });
    }

    // ── Dust Particle System ─────────────────────────────────────
    this._initDustParticles();
  }

  /* ── Floating Dust Particles with Mouse Interaction ─────────── */
  _initDustParticles() {
    const canvas = this.container.querySelector('.biz-dash__dust-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const section = this.container.querySelector('.biz-dash');
    if (!section) return;

    // Sizing
    const resize = () => {
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };
    resize();
    this._dustResizeHandler = resize;
    window.addEventListener('resize', resize);

    // Mouse tracking
    const mouse = { x: -9999, y: -9999 };
    this._dustMouseHandler = (e) => {
      const rect = section.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    section.addEventListener('mousemove', this._dustMouseHandler);

    // Particle pool — tiny micro-dust
    const PARTICLE_COUNT = 120;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.3 + Math.random() * 0.8,            // 0.3–1.1px (micro dust)
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: -0.05 - Math.random() * 0.15,       // slow drift upward
        opacity: 0.12 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.004 + Math.random() * 0.008,
        // warm copper-gold tones
        hue: 25 + Math.random() * 15,               // 25-40 (orange-copper)
        sat: 50 + Math.random() * 40,
        lit: 55 + Math.random() * 25,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.phase += p.phaseSpeed;

        // Base movement + gentle wobble
        p.x += p.speedX + Math.sin(p.phase) * 0.15;
        p.y += p.speedY + Math.cos(p.phase * 0.7) * 0.08;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseRadius = 120;

        if (dist < mouseRadius && dist > 0) {
          const force = (1 - dist / mouseRadius) * 1.8;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        // Wrap around edges
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.y > canvas.height + 10) { p.y = -10; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Brightness shimmer near mouse
        let shimmer = 0;
        if (dist < mouseRadius * 1.5) {
          shimmer = (1 - dist / (mouseRadius * 1.5)) * 0.3;
        }

        // Draw particle
        const alpha = Math.min(p.opacity + shimmer, 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit + shimmer * 25}%, ${alpha})`;
        ctx.fill();

        // Micro glow halo for slightly larger specks
        if (p.size > 0.7) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha * 0.06})`;
          ctx.fill();
        }
      }

      this._dustRAF = requestAnimationFrame(animate);
    };

    this._dustRAF = requestAnimationFrame(animate);
  }

  /* ══════════════════════════════════════════════════════════════
     CREDENTIAL VAULT SYSTEM
     ══════════════════════════════════════════════════════════════ */

  _attachPinListeners() {
    const overlay = this.container.querySelector('#cred-pin-overlay');
    if (!overlay) return;

    overlay.querySelector('#cred-pin-close')?.addEventListener('click', () => this._hidePinModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._hidePinModal();
    });

    overlay.querySelectorAll('.biz-cred__pin-digit').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.pin);
        if (input.value.length === 1) {
          if (idx < 3) {
            overlay.querySelector(`.biz-cred__pin-digit[data-pin="${idx + 1}"]`)?.focus();
          } else {
            this._validatePin();
          }
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value) {
          const idx = parseInt(input.dataset.pin);
          if (idx > 0) {
            const prev = overlay.querySelector(`.biz-cred__pin-digit[data-pin="${idx - 1}"]`);
            if (prev) { prev.value = ''; prev.focus(); }
          }
        }
      });
    });
  }

  _showPinModal() {
    const overlay = this.container.querySelector('#cred-pin-overlay');
    if (!overlay) return;
    overlay.classList.add('biz-cred__pin-overlay--show');
    setTimeout(() => {
      overlay.querySelector('.biz-cred__pin-digit[data-pin="0"]')?.focus();
    }, 300);
  }

  _hidePinModal() {
    const overlay = this.container.querySelector('#cred-pin-overlay');
    if (!overlay) return;
    overlay.classList.remove('biz-cred__pin-overlay--show');
    overlay.querySelectorAll('.biz-cred__pin-digit').forEach(i => i.value = '');
    overlay.querySelector('#cred-pin-error')?.classList.remove('biz-cred__pin-error--show');
  }

  _validatePin() {
    const overlay = this.container.querySelector('#cred-pin-overlay');
    const digits = Array.from(overlay.querySelectorAll('.biz-cred__pin-digit'))
      .map(i => i.value).join('');

    if (digits === '1234') {
      this._hidePinModal();
      setTimeout(() => this._showVault(), 250);
    } else {
      overlay.querySelector('#cred-pin-error')?.classList.add('biz-cred__pin-error--show');
      const box = overlay.querySelector('.biz-cred__pin-box');
      box?.classList.add('biz-cred__pin-box--shake');
      setTimeout(() => {
        box?.classList.remove('biz-cred__pin-box--shake');
        overlay.querySelectorAll('.biz-cred__pin-digit').forEach(i => i.value = '');
        overlay.querySelector('.biz-cred__pin-digit[data-pin="0"]')?.focus();
        overlay.querySelector('#cred-pin-error')?.classList.remove('biz-cred__pin-error--show');
      }, 800);
    }
  }

  _showVault() {
    const overlay = this.container.querySelector('#cred-vault-overlay');
    if (!overlay) return;
    overlay.innerHTML = this._buildVaultContent();
    overlay.classList.add('biz-cred__vault-overlay--show');
    this._attachVaultListeners();
  }

  _hideVault() {
    const overlay = this.container.querySelector('#cred-vault-overlay');
    overlay?.classList.remove('biz-cred__vault-overlay--show');
  }

  _buildVaultContent() {
    const stored = this._getStoredCredentials();

    const cardsHTML = this._clientBusinesses.map(biz => {
      const initials = biz.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const photoHTML = biz.photo
        ? `<img class="biz-cred__vault-avatar-img" src="${biz.photo}" alt="${biz.name}" />`
        : `<span class="biz-cred__vault-avatar-initials">${initials}</span>`;

      const bizCreds = stored[biz.id] || [];
      const credsHTML = bizCreds.map((c, i) => `
        <div class="biz-cred__saved-card">
          <div class="biz-cred__saved-text">${this._escapeHTML(c.text)}</div>
          <div class="biz-cred__saved-meta">
            <span class="biz-cred__saved-date">${new Date(c.date).toLocaleDateString()}</span>
            <button class="biz-cred__saved-delete" data-del-biz="${biz.id}" data-del-idx="${i}" title="Eliminar">${ICONS.trash}</button>
          </div>
        </div>`).join('');

      return `
      <div class="biz-cred__vault-card" data-vault-biz="${biz.id}">
        <div class="biz-cred__vault-header" data-open-biz="${biz.id}">
          <div class="biz-cred__vault-avatar">${photoHTML}</div>
          <div class="biz-cred__vault-info">
            <h4 class="biz-cred__vault-name">${biz.name}</h4>
            <p class="biz-cred__vault-sub">${biz.subtitle}</p>
          </div>
          <span class="biz-cred__vault-badge">${bizCreds.length}</span>
        </div>
        <div class="biz-cred__vault-body" id="vault-body-${biz.id}">
          <div class="biz-cred__vault-creds">${credsHTML}</div>
          <div class="biz-cred__vault-form">
            <textarea class="biz-cred__vault-input" id="vault-input-${biz.id}" placeholder="Escriba credencial o nota..." rows="2"></textarea>
            <button class="biz-cred__vault-confirm" data-confirm-biz="${biz.id}">Confirmar</button>
          </div>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="biz-cred__vault-container">
      <div class="biz-cred__vault-titlebar">
        <div class="biz-cred__vault-title-row">
          ${ICONS.shield}
          <h2 class="biz-cred__vault-title">Bóveda de Credenciales</h2>
        </div>
        <button class="biz-cred__vault-close" id="cred-vault-close">${ICONS.xClose}</button>
      </div>
      <div class="biz-cred__vault-grid">
        ${cardsHTML}
      </div>
    </div>`;
  }

  _attachVaultListeners() {
    const overlay = this.container.querySelector('#cred-vault-overlay');
    if (!overlay) return;

    // Close
    overlay.querySelector('#cred-vault-close')?.addEventListener('click', () => this._hideVault());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._hideVault();
    });

    // Card headers — toggle open/close
    overlay.querySelectorAll('.biz-cred__vault-header').forEach(header => {
      header.addEventListener('click', () => {
        const bizId = header.dataset.openBiz;
        const card = header.closest('.biz-cred__vault-card');

        // Close all other open cards
        overlay.querySelectorAll('.biz-cred__vault-card--open').forEach(c => {
          if (c !== card) c.classList.remove('biz-cred__vault-card--open');
        });

        card?.classList.toggle('biz-cred__vault-card--open');

        // Focus textarea if opening
        if (card?.classList.contains('biz-cred__vault-card--open')) {
          setTimeout(() => overlay.querySelector(`#vault-input-${bizId}`)?.focus(), 350);
        }
      });
    });

    // Confirm buttons
    overlay.querySelectorAll('.biz-cred__vault-confirm').forEach(btn => {
      btn.addEventListener('click', () => {
        const bizId = btn.dataset.confirmBiz;
        const input = overlay.querySelector(`#vault-input-${bizId}`);
        const text = input?.value?.trim();
        if (!text) return;

        this._saveCredentialToStorage(bizId, text);
        // Re-render vault to show new saved card
        const wasOpen = bizId;
        this._showVault();
        // Re-open the card that was being edited
        setTimeout(() => {
          const card = overlay.querySelector(`[data-vault-biz="${wasOpen}"]`);
          card?.classList.add('biz-cred__vault-card--open');
        }, 50);
      });
    });

    // Delete buttons
    overlay.querySelectorAll('.biz-cred__saved-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bizId = btn.dataset.delBiz;
        const idx = parseInt(btn.dataset.delIdx);
        this._deleteCredential(bizId, idx);
        const wasOpen = bizId;
        this._showVault();
        setTimeout(() => {
          const card = overlay.querySelector(`[data-vault-biz="${wasOpen}"]`);
          card?.classList.add('biz-cred__vault-card--open');
        }, 50);
      });
    });
  }

  /* ── Credential Storage (localStorage) ── */
  _getStoredCredentials() {
    try {
      return JSON.parse(localStorage.getItem('biz_credentials') || '{}');
    } catch { return {}; }
  }

  _saveCredentialToStorage(bizId, text) {
    const creds = this._getStoredCredentials();
    if (!creds[bizId]) creds[bizId] = [];
    creds[bizId].push({ text, date: new Date().toISOString() });
    localStorage.setItem('biz_credentials', JSON.stringify(creds));
  }

  _deleteCredential(bizId, index) {
    const creds = this._getStoredCredentials();
    if (creds[bizId]) {
      creds[bizId].splice(index, 1);
      if (creds[bizId].length === 0) delete creds[bizId];
      localStorage.setItem('biz_credentials', JSON.stringify(creds));
    }
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  unmount() {
    // Cleanup dust particles
    if (this._dustRAF) cancelAnimationFrame(this._dustRAF);
    if (this._dustResizeHandler) window.removeEventListener('resize', this._dustResizeHandler);
    const section = this.container.querySelector('.biz-dash');
    if (section && this._dustMouseHandler) {
      section.removeEventListener('mousemove', this._dustMouseHandler);
    }
    // Cleanup modals (now inline in dashboard, removed with container)
    // Also cleanup any old modal-root leftovers
    document.getElementById('cred-pin-overlay')?.remove();
    document.getElementById('cred-vault-overlay')?.remove();
  }
}
