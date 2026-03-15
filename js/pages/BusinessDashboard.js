import { apiUrl } from '../services/apiConfig.js';
import userAuth from '../services/userAuth.js';
import { bizIncludes, bizMatch, normBiz } from '../services/bizUtils.js';
import {
  db, collection, getDocs, query, where, onSnapshot, Timestamp, doc, setDoc,
  addDoc, updateDoc, getDoc,
  storage, storageRef, uploadBytes, getDownloadURL
} from '../services/firebase.js';

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

/* ── Business Overview Configuration ─── */
const BIZ_CONFIG = {
  'xazai': {
    name: 'Xazai',
    tagline: 'Açai Bar & Smoothies',
    color: '#8B5CF6',
    colorRgb: '139,92,246',
    colorDark: '#6D28D9',
    gradient: 'linear-gradient(135deg, #8B5CF6, #D946EF)',
    icon: '🍽️',
    photo: 'assets/images/Xazai.jpeg',
    logo: 'assets/images/logo-xazai.png',
    hasProposal: true,
    trendLabel: 'Evolución de Ventas',
    trendSub: 'Cómo van tus ingresos mes a mes',
    trendKey: 'revenue',
    shareLabel: 'Tu Participación',
    shareSub: 'Tu peso dentro del ecosistema',
    staffTitle: 'Equipo Xazai',
    staffType: 'restaurant',
    staffColumns: ['Colaborador', 'Cargo', 'Asistencia', 'Puntualidad', 'Rating'],
  },
  'rush-ride': {
    name: 'Rush Ride Studio',
    tagline: 'Donde el fitness se transforma',
    color: '#39FF14',
    colorRgb: '57,255,20',
    colorDark: '#15803D',
    gradient: 'linear-gradient(135deg, #39FF14, #22C55E)',
    icon: '🏋️',
    photo: null,
    logo: null,
    hasProposal: false,
    trendLabel: 'Tu Progreso Mensual',
    trendSub: 'Crecimiento de ingresos y check-ins',
    trendKey: 'revenue',
    shareLabel: 'Tu Presencia',
    shareSub: 'Tu impacto dentro del ecosistema',
    staffTitle: 'Equipo Rush Ride',
    staffType: 'fitness',
    staffColumns: ['Colaborador', 'Rol', 'Clases', 'Puntualidad', 'Rating'],
  }
};

export class BusinessDashboard {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getSession();
    this.businessId = businessId || 'ml-parts';
    this.data = null;
    this._bizMeta = null;
    this._broadcastUnsub = null;
    this._lastBroadcastId = null; // prevent replaying old messages
    // Default to current month (e.g. "2026-03")
    const _now = new Date();
    this._currentRange = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;
  }

  async render() {
    // Auth guard — superadmin OR user with this business linked
    const isSuperAdmin = this.currentUser?.role === 'superadmin';
    const userBiz = this.currentUser?.businesses || [];
    const hasAccess = isSuperAdmin || bizIncludes(userBiz, this.businessId);

    if (!this.currentUser || !hasAccess) {
      this.container.innerHTML = `
        <section class="biz-dash" style="display:flex;align-items:center;justify-content:center;">
          <div style="text-align:center;color:var(--text-muted);font-family:var(--font-mono);">
            <div style="font-size:48px;margin-bottom:16px;">🔒</div>
            <div style="font-size:14px;">ACCESO DENEGADO</div>
            <p style="font-size:12px;color:var(--text-dim);margin-top:8px;">No tienes este negocio vinculado</p>
            <button class="glass-btn" style="margin-top:16px;" onclick="window.location.hash='#home'">Volver</button>
          </div>
        </section>`;
      return;
    }

    // ─── Cinematic Greeting (Apple-style) ───
    const userName = (this.currentUser?.name || '').split(' ')[0] || 'Usuario';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

    this.container.innerHTML = `
      <section class="biz-dash biz-dash--intro" style="--biz-color:#F97316; --biz-rgb:249,115,22; --biz-color-dark:#EA580C;">
        <canvas class="biz-dash__dust-canvas" aria-hidden="true"></canvas>
        <div class="biz-intro">
          <div class="biz-intro__greeting">${greeting},</div>
          <div class="biz-intro__name">${this._esc(userName)}</div>
          <div class="biz-intro__line"></div>
          <div class="biz-intro__sub">Preparando tu ecosistema</div>
        </div>
      </section>`;

    // Start dust particles during intro
    this._initDustParticles();

    // Fetch data while greeting plays
    const fetchPromise = this._fetchData(this._currentRange);

    // Wait minimum greeting duration + data fetch
    await Promise.all([
      fetchPromise,
      new Promise(r => setTimeout(r, 2400))
    ]);

    // Resolve business metadata
    this._resolveBizMeta();

    // ─── Overview mode for Xazai / Rush Ride ───
    if (BIZ_CONFIG[this.businessId]) {
      this.container.innerHTML = this._buildBusinessOverview();
      this._attachOverviewListeners();
      this._initBroadcastListener();
      if (isSuperAdmin) this._initBroadcastSender();
      return;
    }

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
        id: 'iron-protocol',
        name: 'IRON PROTOCOL',
        subtitle: 'Protocolo interno de ML Parts',
        website: 'ml.parts/iron',
        photo: 'assets/images/logo-ml-parts-metal.jpeg',
        progress: 0,
        emphasis: true,
        iron: true, // special flag for epic styling
        services: []
      },
      {
        id: 'megalift',
        name: 'Megalift',
        subtitle: 'Elevación industrial & logística vertical',
        website: 'megalifts.com',
        photo: 'assets/images/Negocios Estephano/Megalift.jpg',
        progress: 8,
        services: [
          { label: 'Auditoría integral del ecosistema digital', done: true },
          { label: 'Verificación de usuario Meta', done: false },
          { label: 'Optimización de sitio web — CRO para ventas y alquiler', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false, phase: 'Fase 2 — Pauta' },
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
        services: [
          { label: 'Auditoría integral del ecosistema digital', done: false },
          { label: 'Verificación de usuario Meta', done: false },
          { label: 'Optimización de sitio web — CRO para ventas y alquiler', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false, phase: 'Fase 2 — Pauta' },
          { label: 'Despliegue publicitario', done: false },
          { label: 'Monitoreo continuo', done: false },
        ]
      },
      {
        id: 'grupo-rca',
        name: 'Grupo RCA',
        subtitle: 'Grupo empresarial',
        website: 'Sin página web',
        photo: 'assets/images/Negocios Estephano/Grupo RCA.png',
        progress: 8,
        services: [
          { label: 'Auditoría integral del ecosistema digital', done: true },
          { label: 'Verificación de usuario Meta', done: false },
          { label: 'Creación de sitio web', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false, phase: 'Fase 2 — Pauta' },
          { label: 'Despliegue publicitario', done: false },
          { label: 'Monitoreo continuo', done: false },
        ]
      },
      {
        id: 'parmonca',
        name: 'Parmonca',
        subtitle: 'Soluciones industriales & mantenimiento integral',
        website: 'Sin página web',
        photo: 'assets/images/Negocios Estephano/Parmonca.jpg',
        progress: 1,
        branches: [
          { code: 'CR', name: 'Costa Rica', flag: '\uD83C\uDDE8\uD83C\uDDF7' },
          { code: 'PA', name: 'Panam\u00e1', flag: '\uD83C\uDDF5\uD83C\uDDE6' }
        ],
        services: [
          { label: 'Auditoría integral del ecosistema digital', done: false },
          { label: 'Verificación de usuario Meta', done: false },
          { label: 'Creación de sitio web', done: false },
          { label: 'Programación de CRM', done: false },
          { label: 'Activación de CRM', done: false },
          { label: 'Inyección de base de datos', done: false },
          { label: 'Conexión de Meta Pixel', done: false },
          { label: 'Pruebas', done: false },
          { label: 'Pase a producción', done: false },
          { label: 'Revisión y ajustes', done: false },
          { label: 'Arquitectura de pauta', done: false, phase: 'Fase 2 — Pauta' },
          { label: 'Despliegue publicitario', done: false },
          { label: 'Monitoreo continuo', done: false },
        ]
      }
    ];

    // ─── Fade out intro → assemble dashboard ───
    const intro = this.container.querySelector('.biz-intro');
    if (intro) {
      intro.classList.add('biz-intro--exit');
      await new Promise(r => setTimeout(r, 800));
    }

    // Render full dashboard
    this.container.innerHTML = this._buildHTML();
    this._attachListeners();
    this._attachPinListeners();

    // Staggered card assembly — each section animates independently
    this._runAssemblySequence();

    // ─── Ecosystem Broadcast System ───
    this._initBroadcastListener();
    if (isSuperAdmin) this._initBroadcastSender();
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
      'ml-parts': { name: 'ML Parts', icon: '⚙️', color: '#F97316' },
      'accios-core': { name: 'ACCIOS CORE', icon: '🔮', color: '#7C3AED' },
      'rush-ride': { name: 'Rush Ride Studio', icon: '🏋️', color: '#39FF14' },
      'xazai': { name: 'Xazai', icon: '🍽️', color: '#8B5CF6' }
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

  async _fetchData(range) {
    try {
      let startDate, endDate;
      if (/^\d{4}-\d{2}$/.test(range)) {
        // Month format (e.g. "2026-03")
        const [y, m] = range.split('-').map(Number);
        startDate = new Date(y, m - 1, 1).toISOString();
        endDate = new Date(y, m, 0, 23, 59, 59).toISOString();
      } else {
        // Pill format: 7d, 30d, 90d, 365d
        const days = parseInt(range) || 30;
        endDate = new Date().toISOString();
        startDate = new Date(Date.now() - days * 86400000).toISOString();
      }

      const params = new URLSearchParams({ range, startDate, endDate });
      const res = await fetch(apiUrl(`/api/command-data?${params}`));
      if (res.ok) this.data = await res.json();
    } catch (e) {
      console.warn('[BizDash] Fetch error:', e);
    }
  }

  async _refreshOverview(range) {
    this._currentRange = range;
    // Show subtle loading indicator
    const grid = this.container.querySelector('.biz-overview__kpi-grid');
    if (grid) grid.style.opacity = '0.5';
    await this._fetchData(range);
    this._resolveBizMeta();
    this.container.innerHTML = this._buildBusinessOverview();
    this._attachOverviewListeners();
  }

  _buildHTML() {
    const m = this._bizMeta;
    const kpis = this.data?.kpis || {};
    const totalTx = kpis.totalTransactions || kpis.totalOrders || '--';
    const avgRev = typeof m.revenue === 'number' && typeof m.users === 'number' && m.users > 0
      ? (m.revenue / m.users).toFixed(2)
      : '--';

    const cfg = BIZ_CONFIG[this.businessId] || {};
    const fallbackRgb = { 'ml-parts': '249,115,22' };
    const fallbackColor = { 'ml-parts': '#F97316' };
    const rgb = cfg.colorRgb || fallbackRgb[this.businessId] || '249,115,22';
    const color = cfg.color || fallbackColor[this.businessId] || '#F97316';

    return `
    <section class="biz-dash biz-dash--clients" style="--biz-color:${color}; --biz-rgb:${rgb}; --biz-color-dark:${cfg.colorDark || color};">
      <!-- Dust particle canvas (full dashboard background) -->
      <canvas class="biz-dash__dust-canvas" aria-hidden="true"></canvas>

      <!-- Directional light from top-right (dynamic brand color) -->
      <div class="biz-dash__toplight" style="background: radial-gradient(ellipse at 80% 15%, rgba(${rgb}, 0.07) 0%, rgba(${rgb}, 0.04) 25%, rgba(${rgb}, 0.015) 50%, transparent 75%);"></div>
      <div class="biz-dash__toplight-flare" style="background: radial-gradient(ellipse at 70% 10%, rgba(255, 255, 255, 0.035) 0%, rgba(${rgb}, 0.02) 30%, transparent 60%);"></div>

      <!-- Sidebar -->
      ${this._buildSidebar()}

      <!-- Left Panel: Metrics -->
      <div class="biz-dash__panel biz-dash__panel--left">
        ${this._buildLeftPanel(m, avgRev)}
      </div>

      <!-- Concrete Floor — spans full width -->
      <div class="biz-dash__floor"></div>

      <!-- Center: Credential Folder + Form Launcher -->
      <div class="biz-dash__center">
        <div class="biz-cred__folder" id="cred-folder-btn">
          <div class="biz-cred__folder-icon">${ICONS.folderLock}</div>
          <div class="biz-cred__folder-info">
            <div class="biz-cred__folder-name">Credenciales</div>
            <div class="biz-cred__folder-sub">Bóveda segura</div>
          </div>
          <div class="biz-cred__folder-shield">${ICONS.shield}</div>
        </div>

        <button class="biz-form__launcher" id="biz-form-launcher">
          <div class="biz-form__launcher-glow"></div>
          <span class="biz-form__launcher-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </span>
          <span class="biz-form__launcher-text">
            <span class="biz-form__launcher-label">Formulario Interactivo</span>
            <span class="biz-form__launcher-sub">Crear nueva solicitud</span>
          </span>
        </button>
      </div>

      <!-- Right Panel: Client Business Cards (stacked) -->
      <div class="biz-dash__panel biz-dash__panel--right biz-dash__clients-area">
        <div class="biz-dash__clients-header">
          <div class="biz-dash__clients-title-row">
            <div class="biz-dash__panel-dot"></div>
            <div>
              <h2 class="biz-dash__clients-title">Negocios</h2>
              <p class="biz-dash__clients-subtitle">Gestión de Accios Core</p>
            </div>
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

      <!-- Interactive Form Overlay -->
      ${this._buildFormOverlay()}

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
    // ── 5 companies for billing breakdown
    const companies = this._clientBusinesses.map(b => ({
      name: b.name,
      photo: b.photo,
      id: b.id,
    }));

    return `
      <div class="biz-dash__panel-header">
        <div class="biz-dash__panel-dot"></div>
        <div class="biz-dash__panel-name">${m.name}</div>
      </div>
      <div class="biz-dash__panel-status">
        <span class="biz-dash__status-dot biz-dash__status-dot--off"></span>
        Datos en tiempo real &middot; Sin datos &middot; Conexión de datos reales no disponible
      </div>

      <!-- 1. Facturación -->
      <div class="biz-kpi" data-kpi="billing">
        <div class="biz-kpi__header">
          <div class="biz-kpi__icon">${ICONS.dollarSign}</div>
          <div class="biz-kpi__titles">
            <div class="biz-kpi__label">Facturación</div>
            <div class="biz-kpi__sub">Total facturado en ML Parts</div>
          </div>
          <button class="biz-kpi__help" data-tooltip="billing">?</button>
        </div>
        <div class="biz-kpi__value">$0<span class="biz-kpi__unit">.00</span></div>
        ${this._buildMiniSparkline([0,0,0,0,0,0], 'bill')}
      </div>

      <!-- 2. Marketing ROI -->
      <div class="biz-kpi" data-kpi="marketing">
        <div class="biz-kpi__header">
          <div class="biz-kpi__icon">${ICONS.trendingUp}</div>
          <div class="biz-kpi__titles">
            <div class="biz-kpi__label">Marketing ROI</div>
            <div class="biz-kpi__sub">Retorno publicitario de ML Parts</div>
          </div>
          <button class="biz-kpi__help" data-tooltip="marketing">?</button>
        </div>
        <div class="biz-kpi__value">0<span class="biz-kpi__unit">%</span></div>
        <div class="biz-kpi__bar-row">
          <div class="biz-kpi__bar-item">
            <span class="biz-kpi__bar-label">Invertido</span>
            <div class="biz-kpi__bar-track"><div class="biz-kpi__bar-fill" style="width:0%"></div></div>
            <span class="biz-kpi__bar-val">$0</span>
          </div>
          <div class="biz-kpi__bar-item">
            <span class="biz-kpi__bar-label">Retorno</span>
            <div class="biz-kpi__bar-track"><div class="biz-kpi__bar-fill biz-kpi__bar-fill--return" style="width:0%"></div></div>
            <span class="biz-kpi__bar-val">$0</span>
          </div>
        </div>
      </div>

      <!-- 3. Cotizaciones -->
      <div class="biz-kpi" data-kpi="quotes">
        <div class="biz-kpi__header">
          <div class="biz-kpi__icon">${ICONS.package}</div>
          <div class="biz-kpi__titles">
            <div class="biz-kpi__label">Cotizaciones</div>
            <div class="biz-kpi__sub">Cotizaciones de ML Parts este mes</div>
          </div>
          <button class="biz-kpi__help" data-tooltip="quotes">?</button>
        </div>
        <div class="biz-kpi__value">0<span class="biz-kpi__unit"> / 0</span></div>
        <div class="biz-kpi__dual">
          <div class="biz-kpi__dual-item">
            <div class="biz-kpi__dual-ring">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(var(--biz-rgb),0.3)" stroke-width="3"
                  stroke-dasharray="${2*Math.PI*18}" stroke-dashoffset="${2*Math.PI*18}"
                  stroke-linecap="round" transform="rotate(-90 22 22)"/>
              </svg>
              <span class="biz-kpi__dual-num">0</span>
            </div>
            <span class="biz-kpi__dual-label">Enviadas</span>
          </div>
          <div class="biz-kpi__dual-sep"></div>
          <div class="biz-kpi__dual-item">
            <div class="biz-kpi__dual-ring">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(34,197,94,0.4)" stroke-width="3"
                  stroke-dasharray="${2*Math.PI*18}" stroke-dashoffset="${2*Math.PI*18}"
                  stroke-linecap="round" transform="rotate(-90 22 22)"/>
              </svg>
              <span class="biz-kpi__dual-num">0</span>
            </div>
            <span class="biz-kpi__dual-label">Cerradas</span>
          </div>
        </div>
      </div>

      <!-- 4. Top Vendedores -->
      <div class="biz-kpi" data-kpi="sellers">
        <div class="biz-kpi__header">
          <div class="biz-kpi__icon">${ICONS.users}</div>
          <div class="biz-kpi__titles">
            <div class="biz-kpi__label">Top Vendedor</div>
            <div class="biz-kpi__sub">Mejor ejecutivo de ML Parts</div>
          </div>
          <button class="biz-kpi__help" data-tooltip="sellers">?</button>
        </div>
        <div class="biz-kpi__value biz-kpi__value--text">Sin datos</div>
        <div class="biz-kpi__sellers-preview">
          <div class="biz-kpi__sellers-empty">
            <div class="biz-kpi__sellers-avatars">
              <div class="biz-kpi__sellers-av">1</div>
              <div class="biz-kpi__sellers-av">2</div>
              <div class="biz-kpi__sellers-av">3</div>
            </div>
            <span>Top 5 por empresa</span>
          </div>
        </div>
      </div>

      <!-- 5. Inventario -->
      <div class="biz-kpi" data-kpi="inventory">
        <div class="biz-kpi__header">
          <div class="biz-kpi__icon">${ICONS.server}</div>
          <div class="biz-kpi__titles">
            <div class="biz-kpi__label">Inventario</div>
            <div class="biz-kpi__sub">Inventario de ML Parts en alerta</div>
          </div>
          <button class="biz-kpi__help" data-tooltip="inventory">?</button>
        </div>
        <div class="biz-kpi__value">0<span class="biz-kpi__unit"> alertas</span></div>
        <div class="biz-kpi__inv-rows">
          <div class="biz-kpi__inv-empty">Sin productos en alerta</div>
        </div>
      </div>

`;
  }

  /* ── Mini Sparkline (simpler, for KPI cards) ── */
  _buildMiniSparkline(data, id) {
    const w = 180, h = 32, pad = 2;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = (w - pad*2) / Math.max(data.length - 1, 1);
    const pts = data.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad*2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const lastX = pts[pts.length-1]?.split(',')[0] || pad;
    const area = `M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(' ')} L${lastX},${h} L${pad},${h} Z`;
    return `<svg class="biz-kpi__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ks-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(var(--biz-rgb),0.2)"/>
          <stop offset="100%" stop-color="rgba(var(--biz-rgb),0)"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#ks-${id})"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="rgba(var(--biz-rgb),0.5)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  _buildClientCard(biz, index) {
    const initials = biz.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const photoHTML = biz.photo
      ? `<img class="biz-client__avatar-img" src="${biz.photo}" alt="${biz.name}" />`
      : `<span class="biz-client__avatar-initials">${initials}</span>`;

    const servicesHTML = biz.services.map(s => {
      const label = typeof s === 'string' ? s : s.label;
      const done = typeof s === 'object' && s.done;
      const phase = typeof s === 'object' && s.phase;
      const icon = done
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
      const divider = phase ? `<div class="biz-client__phase-divider"><span>${phase}</span></div>` : '';
      return `${divider}<div class="biz-client__service-item ${done ? 'biz-client__service-item--done' : ''}">
        ${icon}
        <span>${label}</span>
      </div>`;
    }).join('');

    // Branches (e.g. Parmonca CR / PA)
    const branchesHTML = biz.branches ? `
      <div class="biz-client__branches">
        ${biz.branches.map(b => `
          <div class="biz-client__branch">
            <span class="biz-client__branch-flag">${b.flag}</span>
            <span class="biz-client__branch-code">${b.code}</span>
            <span class="biz-client__branch-name">${b.name}</span>
          </div>`).join('')}
      </div>` : '';

    // Card modifier classes
    const modifiers = [
      biz.emphasis ? 'biz-client__card--emphasis' : '',
      biz.iron ? 'biz-client__card--iron' : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="biz-client__card${modifiers ? ' ' + modifiers : ''}" data-client-id="${biz.id}" style="animation-delay: ${index * 0.08}s;">
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

        ${branchesHTML}

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
        ${biz.services.length ? `
        <button class="biz-client__services-toggle" data-toggle="${biz.id}">
          <span>Roadmap</span>
          <svg class="biz-client__toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="biz-client__services-panel" id="services-${biz.id}">
          ${servicesHTML}
        </div>` : ''}
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
      .filter(a => bizMatch(a.business, this.businessId))
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

    // ── KPI Card Click → Detail Panels ─────────────────────────
    this._attachKpiListeners();

    // ── Interactive Form ──────────────────────────────────────────
    this._attachFormListeners();

    // ── Dust Particle System ─────────────────────────────────────
    this._initDustParticles();
  }

  _attachKpiListeners() {
    const TOOLTIPS = {
      billing: 'Muestra el total facturado por ML Parts. Incluye todas las formas de pago: transferencias bancarias, pagos con tarjeta en línea, efectivo y otros métodos.',
      marketing: 'ROI (Retorno sobre Inversión) de ML Parts. Mide cuánto dinero genera ML Parts por cada dólar invertido en publicidad.',
      quotes: 'Compara las cotizaciones enviadas por ML Parts contra las que se convirtieron en ventas reales. La tasa de cierre indica la efectividad comercial.',
      sellers: 'Muestra el ejecutivo o vendedor con mejor desempeño en ML Parts. Se mide por cantidad de negocios cerrados y monto total vendido.',
      inventory: 'Productos del inventario de ML Parts cuyo stock está por debajo del mínimo recomendado. Requieren reposición para evitar quiebres de stock.',
    };

    // Help tooltips (? buttons)
    this.container.querySelectorAll('.biz-kpi__help').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.tooltip;
        this._showKpiTooltip(btn, TOOLTIPS[key] || '');
      });
    });

    // KPI card clicks → detail panels
    this.container.querySelectorAll('.biz-kpi').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.biz-kpi__help')) return;
        const kpi = card.dataset.kpi;
        this._openKpiDetail(kpi);
      });
    });
  }

  _showKpiTooltip(anchor, text) {
    // Remove existing
    document.querySelector('.biz-kpi-tooltip')?.remove();

    const tip = document.createElement('div');
    tip.className = 'biz-kpi-tooltip';
    tip.innerHTML = `
      <div class="biz-kpi-tooltip__card">
        <div class="biz-kpi-tooltip__text">${this._esc(text)}</div>
        <div class="biz-kpi-tooltip__dismiss">Toca para cerrar</div>
      </div>`;

    // Centered on screen
    document.body.appendChild(tip);

    // Dismiss on click anywhere
    const dismiss = () => { tip.classList.add('biz-kpi-tooltip--exit'); setTimeout(() => tip.remove(), 300); document.removeEventListener('click', dismiss); };
    setTimeout(() => document.addEventListener('click', dismiss), 50);
    setTimeout(() => { if (document.contains(tip)) dismiss(); }, 6000);
  }

  _openKpiDetail(kpi) {
    // Remove any existing detail overlay
    document.querySelector('.biz-kpi-detail')?.remove();

    const companies = this._clientBusinesses;

    let content = '';
    switch (kpi) {
      case 'billing':
        content = this._buildBillingDetail(companies);
        break;
      case 'marketing':
        content = this._buildMarketingDetail();
        break;
      case 'quotes':
        content = this._buildQuotesDetail(companies);
        break;
      case 'sellers':
        content = this._buildSellersDetail(companies);
        break;
      case 'inventory':
        content = this._buildInventoryDetail(companies);
        break;
      default:
        return;
    }

    const detail = document.createElement('div');
    detail.className = 'biz-kpi-detail';
    detail.innerHTML = `
      <div class="biz-kpi-detail__inner">
        <button class="biz-kpi-detail__close">&times;</button>
        ${content}
      </div>`;

    document.body.appendChild(detail);

    detail.querySelector('.biz-kpi-detail__close').addEventListener('click', () => {
      detail.classList.add('biz-kpi-detail--exit');
      setTimeout(() => detail.remove(), 300);
    });
    detail.addEventListener('click', (e) => {
      if (e.target === detail) {
        detail.classList.add('biz-kpi-detail--exit');
        setTimeout(() => detail.remove(), 300);
      }
    });
  }

  _buildBillingDetail(companies) {
    const methods = ['Transferencia', 'Pago en Línea', 'Efectivo', 'Crédito'];
    const rows = companies.map(c => {
      const photo = c.photo ? `<img src="${c.photo}" class="biz-kpi-detail__logo" alt="${c.name}"/>` :
        `<div class="biz-kpi-detail__logo-ph">${c.name[0]}</div>`;
      return `
        <div class="biz-kpi-detail__biz">
          ${photo}
          <div class="biz-kpi-detail__biz-info">
            <div class="biz-kpi-detail__biz-name">${this._esc(c.name)}</div>
            <div class="biz-kpi-detail__biz-total">$0.00</div>
          </div>
        </div>
        <div class="biz-kpi-detail__methods">
          ${methods.map(m => `
            <div class="biz-kpi-detail__method">
              <span class="biz-kpi-detail__method-name">${m}</span>
              <span class="biz-kpi-detail__method-val">$0</span>
            </div>`).join('')}
        </div>`;
    }).join('<div class="biz-kpi-detail__sep"></div>');

    return `
      <h3 class="biz-kpi-detail__title">${ICONS.dollarSign} Facturación por Empresa</h3>
      <p class="biz-kpi-detail__desc">Desglose de ingresos por método de pago para cada empresa del ecosistema.</p>
      <div class="biz-kpi-detail__total-row">
        <span>Total Ecosistema</span>
        <span class="biz-kpi-detail__total-val">$0.00</span>
      </div>
      <div class="biz-kpi-detail__list">${rows}</div>`;
  }

  _buildMarketingDetail() {
    const terms = [
      { term: 'ROI', def: 'Retorno sobre Inversión. Mide cuánto ganas por cada dólar invertido en publicidad. Si inviertes $100 y generas $400 en ventas, tu ROI es 300%.' },
      { term: 'CPC', def: 'Costo por Click. Lo que pagas cada vez que alguien hace click en tu anuncio. Un CPC bajo significa que tu publicidad es eficiente.' },
      { term: 'CPM', def: 'Costo por Mil impresiones. Lo que cuesta que 1,000 personas vean tu anuncio. Útil para medir el alcance de campañas de marca.' },
      { term: 'CTR', def: 'Click-Through Rate (Tasa de clicks). El porcentaje de personas que ven tu anuncio y hacen click. Un CTR alto indica que tu anuncio es atractivo.' },
      { term: 'ROAS', def: 'Retorno sobre gasto publicitario. Similar al ROI pero específico para publicidad. Un ROAS de 4x significa $4 en ventas por cada $1 en ads.' },
      { term: 'Leads', def: 'Personas que mostraron interés real en tu producto o servicio. Por ejemplo, llenaron un formulario, llamaron o enviaron un mensaje.' },
    ];

    return `
      <h3 class="biz-kpi-detail__title">${ICONS.trendingUp} Resultados de Marketing</h3>
      <p class="biz-kpi-detail__desc">Rendimiento de la inversión publicitaria. Aquí verás cuánto se ha invertido y cuánto ha retornado en ventas.</p>
      <div class="biz-kpi-detail__mkt-summary">
        <div class="biz-kpi-detail__mkt-card">
          <span class="biz-kpi-detail__mkt-label">Invertido</span>
          <span class="biz-kpi-detail__mkt-val">$0</span>
        </div>
        <div class="biz-kpi-detail__mkt-card">
          <span class="biz-kpi-detail__mkt-label">Retorno</span>
          <span class="biz-kpi-detail__mkt-val biz-kpi-detail__mkt-val--green">$0</span>
        </div>
        <div class="biz-kpi-detail__mkt-card">
          <span class="biz-kpi-detail__mkt-label">ROI</span>
          <span class="biz-kpi-detail__mkt-val">0%</span>
        </div>
        <div class="biz-kpi-detail__mkt-card">
          <span class="biz-kpi-detail__mkt-label">Leads</span>
          <span class="biz-kpi-detail__mkt-val">0</span>
        </div>
      </div>
      <h4 class="biz-kpi-detail__subtitle">Glosario de Términos</h4>
      <div class="biz-kpi-detail__glossary">
        ${terms.map(t => `
          <div class="biz-kpi-detail__term">
            <span class="biz-kpi-detail__term-name">${t.term}</span>
            <span class="biz-kpi-detail__term-def">${t.def}</span>
          </div>`).join('')}
      </div>`;
  }

  _buildQuotesDetail(companies) {
    const rows = companies.map(c => `
      <div class="biz-kpi-detail__quote-row">
        <span class="biz-kpi-detail__quote-biz">${this._esc(c.name)}</span>
        <div class="biz-kpi-detail__quote-bars">
          <div class="biz-kpi-detail__quote-bar">
            <div class="biz-kpi-detail__quote-fill biz-kpi-detail__quote-fill--sent" style="width:0%"></div>
          </div>
          <div class="biz-kpi-detail__quote-bar">
            <div class="biz-kpi-detail__quote-fill biz-kpi-detail__quote-fill--closed" style="width:0%"></div>
          </div>
        </div>
        <div class="biz-kpi-detail__quote-nums">
          <span>0 env.</span>
          <span>0 cerr.</span>
        </div>
      </div>`).join('');

    return `
      <h3 class="biz-kpi-detail__title">${ICONS.package} Cotizaciones por Empresa</h3>
      <p class="biz-kpi-detail__desc">Cantidad de cotizaciones enviadas a clientes vs las que se convirtieron en ventas cerradas. La tasa de conversión indica la efectividad del proceso comercial.</p>
      <div class="biz-kpi-detail__quote-legend">
        <span><span class="biz-kpi-detail__legend-dot biz-kpi-detail__legend-dot--sent"></span>Enviadas</span>
        <span><span class="biz-kpi-detail__legend-dot biz-kpi-detail__legend-dot--closed"></span>Cerradas</span>
      </div>
      <div class="biz-kpi-detail__quote-list">${rows}</div>
      <div class="biz-kpi-detail__total-row">
        <span>Tasa de cierre global</span>
        <span class="biz-kpi-detail__total-val">0%</span>
      </div>`;
  }

  _buildSellersDetail(companies) {
    const rows = companies.map(c => `
      <div class="biz-kpi-detail__seller-company">
        <div class="biz-kpi-detail__seller-header">${this._esc(c.name)}</div>
        <div class="biz-kpi-detail__seller-list">
          ${[1,2,3,4,5].map(i => `
            <div class="biz-kpi-detail__seller-row biz-kpi-detail__seller-row--empty">
              <span class="biz-kpi-detail__seller-rank">#${i}</span>
              <span class="biz-kpi-detail__seller-name">—</span>
              <span class="biz-kpi-detail__seller-deals">0 cierres</span>
              <span class="biz-kpi-detail__seller-amount">$0</span>
            </div>`).join('')}
        </div>
      </div>`).join('');

    return `
      <h3 class="biz-kpi-detail__title">${ICONS.users} Top Vendedores por Empresa</h3>
      <p class="biz-kpi-detail__desc">Ranking de los 5 ejecutivos o vendedores con mejor desempeño por cada compañía. Se mide por negocios cerrados y monto vendido. Haz click en un vendedor para ver sus transacciones.</p>
      <div class="biz-kpi-detail__sellers">${rows}</div>`;
  }

  _buildInventoryDetail(companies) {
    const rows = companies.map(c => `
      <div class="biz-kpi-detail__inv-company">
        <div class="biz-kpi-detail__inv-header">${this._esc(c.name)}</div>
        <div class="biz-kpi-detail__inv-items">
          <div class="biz-kpi-detail__inv-empty">Sin alertas de inventario</div>
        </div>
      </div>`).join('');

    return `
      <h3 class="biz-kpi-detail__title">${ICONS.server} Inventario — Alertas de Stock</h3>
      <p class="biz-kpi-detail__desc">Productos cuyo inventario está por debajo del mínimo recomendado. Estos artículos requieren reposición para evitar quedarse sin stock y perder ventas.</p>
      <div class="biz-kpi-detail__inv-list">${rows}</div>`;
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

  /* ═══════════════════════════════════════════════════════════════
     Business Overview — Xazai & Rush Ride dashboard
     ═══════════════════════════════════════════════════════════════ */

  /* ── Business KPI Computation ──────────────────────────────────── */
  _computeKPIs(biz) {
    const fmt = (n) => typeof n === 'number' ? n.toLocaleString('es-PA') : '--';
    const fmtMoney = (n) => '$' + (typeof n === 'number' ? n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00');
    const fmtPct = (n) => Math.round(n) + '%';
    const rangeDays = this._currentRange === '7d' ? 7 : this._currentRange === '90d' ? 90 : this._currentRange === '365d' ? 365 : 30;

    if (this.businessId === 'xazai') {
      const revenue = biz.revenue || 0;
      const customers = biz.collections?.customers || biz.users || 0;
      const orders = biz.collections?.orders || 0;
      const sales = biz.collections?.sales || 0;
      const inventory = biz.collections?.inventory || 0;
      const staff = biz.collections?.rrhh_collaborators || 0;
      const avgOrder = orders > 0 ? revenue / orders : 0;
      const revenuePerDay = revenue / rangeDays;
      const ordersPerClient = customers > 0 ? (orders / customers) : 0;

      return [
        { label: 'Ventas del Período', sub: 'Ingresos generados', value: fmtMoney(revenue), icon: ICONS.dollarSign, accent: true },
        { label: 'Clientes', sub: 'Personas registradas', value: fmt(customers), icon: ICONS.users },
        { label: 'Pedidos', sub: `Órdenes en ${rangeDays} días`, value: fmt(orders), icon: ICONS.activity },
        { label: 'Ticket Promedio', sub: 'Gasto promedio por pedido', value: fmtMoney(avgOrder), icon: ICONS.zap },
        { label: 'Inventario', sub: 'Productos en stock', value: fmt(inventory), icon: ICONS.package },
        { label: 'Colaboradores', sub: 'Tu equipo de trabajo', value: fmt(staff), icon: ICONS.users },
        { label: 'Ventas/Día', sub: 'Promedio diario', value: fmtMoney(revenuePerDay), icon: ICONS.barChart },
        { label: 'Frecuencia', sub: 'Pedidos por cliente', value: ordersPerClient.toFixed(1) + 'x', icon: ICONS.trendingUp },
      ];
    }

    if (this.businessId === 'rush-ride') {
      const revenue = biz.revenue || 0;
      const users = biz.users || 0;
      const activeMembers = biz.activeMembers || biz.collections?.userMemberships || 0;
      const checkIns = biz.collections?.checkIns || 0;
      const reservations = biz.collections?.reservations || 0;
      const transactions = biz.collections?.transactions || 0;
      const revenuePerMember = activeMembers > 0 ? revenue / activeMembers : 0;
      const retention = users > 0 ? (activeMembers / users) * 100 : 0;
      const checkInsPerDay = checkIns / rangeDays;

      return [
        { label: 'Ingresos del Período', sub: 'Membresías + servicios', value: fmtMoney(revenue), icon: ICONS.dollarSign, accent: true },
        { label: 'Miembros Totales', sub: 'Personas registradas', value: fmt(users), icon: ICONS.users },
        { label: 'Check-ins', sub: `Visitas en ${rangeDays} días`, value: fmt(checkIns), icon: ICONS.activity },
        { label: 'Ingreso/Miembro', sub: 'Revenue por miembro activo', value: fmtMoney(revenuePerMember), icon: ICONS.zap },
        { label: 'Miembros Activos', sub: 'Membresías vigentes', value: fmt(activeMembers), icon: ICONS.users },
        { label: 'Reservaciones', sub: 'Clases reservadas', value: fmt(reservations), icon: ICONS.barChart },
        { label: 'Retención', sub: 'Activos vs total', value: fmtPct(retention), icon: ICONS.trendingUp },
        { label: 'Check-ins/Día', sub: 'Promedio diario', value: fmt(Math.round(checkInsPerDay)), icon: ICONS.activity },
      ];
    }

    return [];
  }

  _buildBusinessOverview() {
    const cfg = BIZ_CONFIG[this.businessId];
    const biz = this.data?.byBusiness?.[this.businessId] || {};
    const allActivity = this.data?.recentActivity || [];
    const activity = allActivity.filter(a => a.business === this.businessId).slice(0, 8);
    const totalRevAll = this.data?.kpis?.totalRevenue || 1;

    const revenue = biz.revenue ?? 0;
    const sharePercent = totalRevAll > 0 ? Math.round((revenue / totalRevAll) * 100) : 0;

    // KPIs
    const kpis = this._computeKPIs(biz);

    // Trend data from bizMonthlyTrend
    const bizTrend = this.data?.bizMonthlyTrend || [];
    const last6 = bizTrend.slice(-6);
    const trendData = last6.map(m => m[this.businessId]?.[cfg.trendKey] || 0);
    const trendLabels = last6.map(m => {
      if (!m.month) return '';
      const [y, mo] = m.month.split('-');
      return new Date(+y, +mo - 1).toLocaleDateString('es', { month: 'short' });
    });

    // Brand avatar — use photo if available, otherwise show business icon emoji
    const brandImg = cfg.photo
      ? `<img class="biz-overview__brand-img" src="${cfg.photo}" alt="${cfg.name}" />`
      : `<div class="biz-overview__brand-initials" style="background:${cfg.gradient};"><span style="font-size:26px;line-height:1;">${cfg.icon}</span></div>`;

    const logoHTML = cfg.logo
      ? `<img class="biz-overview__logo" src="${cfg.logo}" alt="${cfg.name}" />`
      : '';

    // Range labels — support both month format and pill format
    const rangeLabel = /^\d{4}-\d{2}$/.test(this._currentRange)
      ? new Date(this._currentRange + '-15').toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })
      : { '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', '90d': 'Últimos 90 días', '365d': 'Último año' }[this._currentRange] || 'Últimos 30 días';

    // Month picker value (only set when range is a month)
    const monthPickerValue = /^\d{4}-\d{2}$/.test(this._currentRange) ? this._currentRange : '';

    // Activity feed
    const actIcons = { order: '🛒', checkin: '🏋️', transaction: '💳', reservation: '📅', sale: '🧾', membership: '⭐', quote: '📄', expense: '📦', payment: '💰' };
    const actHTML = activity.length > 0
      ? activity.map(a => `
        <div class="biz-overview__act-item">
          <span class="biz-overview__act-icon">${actIcons[a.type] || '📌'}</span>
          <span class="biz-overview__act-text">${a.description || a.type}</span>
          <span class="biz-overview__act-time">${this._timeAgo(a.date)}</span>
        </div>`).join('')
      : '<div class="biz-overview__act-empty">Sin actividad reciente</div>';

    // Staff section
    const staff = biz.staff || [];
    const staffHTML = this._buildStaffSection(staff, cfg);

    // Proposal card (Xazai only)
    const proposalHTML = cfg.hasProposal ? `
      <div class="biz-overview__proposal biz-overview__card--assemble" style="--i:10">
        <div class="biz-overview__proposal-icon">${ICONS.info}</div>
        <div class="biz-overview__proposal-info">
          <div class="biz-overview__proposal-title">Propuesta de Marketing 2026</div>
          <div class="biz-overview__proposal-sub">Ver presentación completa →</div>
        </div>
      </div>` : '';

    // KPI grid HTML
    const kpiHTML = kpis.map((k, i) => `
      <div class="biz-overview__kpi${k.accent ? ' biz-overview__kpi--accent' : ''} biz-overview__card--assemble" style="--i:${i < 4 ? i + 1 : i + 1}">
        <div class="biz-overview__kpi-icon">${k.icon}</div>
        <div class="biz-overview__kpi-value">${k.value}</div>
        <div class="biz-overview__kpi-label">${k.label}</div>
        <div class="biz-overview__kpi-sub">${k.sub}</div>
      </div>`).join('');

    return `
    <section class="biz-overview" style="--biz-color:${cfg.color}; --biz-rgb:${cfg.colorRgb};">

      <!-- Header -->
      <div class="biz-overview__header biz-overview__card--assemble" style="--i:0">
        <div class="biz-overview__header-top">
          <button class="biz-overview__back" id="biz-ov-back">
            ${ICONS.arrowLeft}
            <span>Volver</span>
          </button>
          <div class="biz-overview__range-selector">
            <input type="month" class="biz-overview__month-picker" id="biz-month-picker" value="${monthPickerValue}" title="Seleccionar mes" />
            <div class="biz-overview__range-pills">
              ${['7d', '30d', '90d', '365d'].map(r => `
                <button class="biz-overview__range-btn${r === this._currentRange ? ' biz-overview__range-btn--active' : ''}" data-range="${r}">
                  ${r === '365d' ? '1A' : r.toUpperCase()}
                </button>`).join('')}
            </div>
          </div>
        </div>
        <div class="biz-overview__brand">
          <div class="biz-overview__brand-avatar">${brandImg}</div>
          <div class="biz-overview__brand-text">
            ${logoHTML}
            <h1 class="biz-overview__name">${cfg.name}</h1>
            <p class="biz-overview__tagline">${cfg.tagline}</p>
            <span class="biz-overview__range-label">${rangeLabel}</span>
          </div>
        </div>
      </div>

      <!-- KPI Grid (8 cards) -->
      <div class="biz-overview__kpi-grid biz-overview__kpi-grid--8">
        ${kpiHTML}
      </div>

      <!-- Charts Row -->
      <div class="biz-overview__charts">
        <div class="biz-overview__chart-card biz-overview__card--assemble" style="--i:5">
          <div class="biz-overview__chart-title">${cfg.trendLabel}</div>
          <div class="biz-overview__chart-sub">${cfg.trendSub}</div>
          <div class="biz-overview__bar-chart">
            ${this._buildBarChart(trendData, trendLabels)}
          </div>
        </div>
        <div class="biz-overview__chart-card biz-overview__chart-card--donut biz-overview__card--assemble" style="--i:5">
          <div class="biz-overview__chart-title">${cfg.shareLabel}</div>
          <div class="biz-overview__chart-sub">${cfg.shareSub}</div>
          <div class="biz-overview__donut-wrap">
            ${this._buildMiniDonut(sharePercent)}
          </div>
        </div>
      </div>

      <!-- Staff / Colaboradores -->
      ${staffHTML}

      <!-- Activity Feed -->
      <div class="biz-overview__activity biz-overview__card--assemble" style="--i:8">
        <div class="biz-overview__section-title">Actividad Reciente</div>
        <div class="biz-overview__act-list">${actHTML}</div>
      </div>

      <!-- Evidence Inbox -->
      <div class="biz-overview__inbox biz-overview__card--assemble" style="--i:9">
        <div class="biz-overview__section-title">📬 Bandeja de Evidencias</div>
        <div class="biz-overview__inbox-list" id="biz-inbox-list">
          <div class="biz-overview__inbox-loading">Cargando evidencias...</div>
        </div>
      </div>

      ${proposalHTML}
    </section>`;
  }

  _buildStaffSection(staff, cfg) {
    if (!staff || staff.length === 0) {
      return `
        <div class="biz-overview__staff biz-overview__card--assemble" style="--i:7">
          <div class="biz-overview__section-header">
            <div class="biz-overview__section-title">👥 ${cfg.staffTitle}</div>
          </div>
          <div class="biz-overview__act-empty">Sin datos de equipo disponibles</div>
        </div>`;
    }

    const activeCount = staff.filter(s => s.status === 'active').length;
    const avgPunctuality = Math.round(staff.reduce((s, m) => s + (m.punctuality || 0), 0) / staff.length);
    const avgRating = (staff.reduce((s, m) => s + (m.rating || 0), 0) / staff.length).toFixed(1);

    // Summary row
    const summaryHTML = `
      <div class="biz-overview__staff-summary">
        <div class="biz-overview__staff-stat">
          <div class="biz-overview__staff-stat-value">${activeCount}</div>
          <div class="biz-overview__staff-stat-label">Activos</div>
        </div>
        <div class="biz-overview__staff-stat">
          <div class="biz-overview__staff-stat-value">${avgPunctuality}%</div>
          <div class="biz-overview__staff-stat-label">Puntualidad Prom.</div>
        </div>
        <div class="biz-overview__staff-stat">
          <div class="biz-overview__staff-stat-value">⭐ ${avgRating}</div>
          <div class="biz-overview__staff-stat-label">Rating Prom.</div>
        </div>
      </div>`;

    // Staff rows
    const isRestaurant = cfg.staffType === 'restaurant';
    const rowsHTML = staff.map(s => {
      const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const punctColor = s.punctuality >= 90 ? '#22c55e' : s.punctuality >= 80 ? '#F59E0B' : '#ef4444';
      const statusDot = s.status === 'active' ? '#22c55e' : '#6b7280';
      const attendance = isRestaurant
        ? `${s.daysWorked || 0}/${s.totalDays || 28}`
        : `${s.classesGiven || 0}/${s.totalClasses || 0}`;
      const ratingStars = '⭐'.repeat(Math.min(Math.round(s.rating || 0), 5));

      return `
        <div class="biz-overview__staff-row">
          <div class="biz-overview__staff-person">
            <div class="biz-overview__staff-avatar">${initials}</div>
            <div class="biz-overview__staff-info">
              <div class="biz-overview__staff-name">
                <span class="biz-overview__staff-dot" style="background:${statusDot}"></span>
                ${this._esc(s.name)}
              </div>
              <div class="biz-overview__staff-role">${this._esc(s.role)}</div>
            </div>
          </div>
          <div class="biz-overview__staff-attendance">${attendance}</div>
          <div class="biz-overview__staff-punct">
            <div class="biz-overview__staff-bar-track">
              <div class="biz-overview__staff-bar-fill" style="width:${s.punctuality || 0}%; background:${punctColor}"></div>
            </div>
            <span style="color:${punctColor}">${s.punctuality || 0}%</span>
          </div>
          <div class="biz-overview__staff-rating">${s.rating ? s.rating.toFixed(1) : '--'}</div>
        </div>`;
    }).join('');

    return `
      <div class="biz-overview__staff biz-overview__card--assemble" style="--i:7">
        <div class="biz-overview__section-header">
          <div class="biz-overview__section-title">👥 ${cfg.staffTitle}</div>
          <div class="biz-overview__staff-badge">${staff.length} ${isRestaurant ? 'colaboradores' : 'miembros'}</div>
        </div>
        ${summaryHTML}
        <div class="biz-overview__staff-table">
          <div class="biz-overview__staff-head">
            <span class="biz-overview__staff-head-cell biz-overview__staff-head-cell--name">${cfg.staffColumns[0]}</span>
            <span class="biz-overview__staff-head-cell">${isRestaurant ? 'Asistencia' : 'Clases'}</span>
            <span class="biz-overview__staff-head-cell">${cfg.staffColumns[3]}</span>
            <span class="biz-overview__staff-head-cell">${cfg.staffColumns[4]}</span>
          </div>
          ${rowsHTML}
        </div>
      </div>`;
  }

  _buildBarChart(data, labels) {
    if (!data || data.length === 0) return '<div class="biz-overview__act-empty">Sin datos de tendencia</div>';
    const max = Math.max(...data, 1);
    const fmtVal = (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString();
    return `
      <div class="biz-overview__bars">
        ${data.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          return `
          <div class="biz-overview__bar-col">
            <div class="biz-overview__bar-value">${fmtVal(v)}</div>
            <div class="biz-overview__bar-track">
              <div class="biz-overview__bar-fill" style="height:${Math.max(pct, 4)}%"></div>
            </div>
            <div class="biz-overview__bar-label">${labels[i] || ''}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  _buildMiniDonut(percent) {
    const size = 120;
    const r = 48;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return `
      <svg class="biz-overview__donut-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
          stroke="var(--biz-color)" stroke-width="10"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"
          class="biz-overview__donut-arc"/>
      </svg>
      <div class="biz-overview__donut-center">
        <span class="biz-overview__donut-pct">${percent}%</span>
        <span class="biz-overview__donut-label">del total</span>
      </div>`;
  }

  _attachOverviewListeners() {
    // Back button
    const backBtn = this.container.querySelector('#biz-ov-back');
    if (backBtn) backBtn.addEventListener('click', () => { window.location.hash = '#home'; });

    // Range pill buttons
    this.container.querySelectorAll('.biz-overview__range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = btn.dataset.range;
        if (range && range !== this._currentRange) {
          this._refreshOverview(range);
        }
      });
    });

    // Month picker
    const monthPicker = this.container.querySelector('#biz-month-picker');
    if (monthPicker) {
      monthPicker.addEventListener('change', () => {
        if (monthPicker.value && monthPicker.value !== this._currentRange) {
          this._refreshOverview(monthPicker.value);
        }
      });
    }

    // Proposal card click (Xazai only)
    const proposal = this.container.querySelector('.biz-overview__proposal');
    if (proposal) {
      proposal.addEventListener('click', () => {
        window.location.href = 'Propuesta-Xazai-2026.html';
      });
    }

    // Load evidence inbox
    this._loadEvidenceInbox();
  }

  async _loadEvidenceInbox() {
    const listEl = this.container.querySelector('#biz-inbox-list');
    if (!listEl) return;

    try {
      // Simple query (no composite index needed) — sort client-side
      const q = query(
        collection(db, 'call-transcripts'),
        where('businessId', '==', this.businessId)
      );
      const snap = await getDocs(q);
      const transcripts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 20);

      if (transcripts.length === 0) {
        listEl.innerHTML = '<div class="biz-overview__inbox-empty">No hay evidencias de reuniones aún</div>';
        return;
      }

      listEl.innerHTML = transcripts.map(t => {
        const otherName = Object.values(t.participantNames || {}).find(n => n !== 'SuperAdmin') || 'Participante';
        const date = new Date(t.createdAt).toLocaleDateString('es-PA', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const preview = t.summary
          ? t.summary.replace(/\*\*/g, '').slice(0, 100) + '...'
          : (t.lines?.length ? `${t.lines.length} líneas transcritas` : 'Sin contenido');

        return `
          <div class="biz-overview__inbox-item" data-tid="${t.id}">
            <div class="biz-overview__inbox-icon">📋</div>
            <div class="biz-overview__inbox-content">
              <div class="biz-overview__inbox-subject">Minuta — Reunión con ${this._esc(otherName)}</div>
              <div class="biz-overview__inbox-preview">${this._esc(preview)}</div>
              <div class="biz-overview__inbox-date">${date}</div>
            </div>
            <div class="biz-overview__inbox-arrow">→</div>
          </div>`;
      }).join('');

      // Attach click handlers
      listEl.querySelectorAll('.biz-overview__inbox-item').forEach(item => {
        item.addEventListener('click', () => {
          const tid = item.dataset.tid;
          const transcript = transcripts.find(t => t.id === tid);
          if (transcript) this._showTranscriptDetail(transcript);
        });
      });
    } catch (err) {
      console.error('[BizDash] Load evidence inbox error:', err);
      listEl.innerHTML = '<div class="biz-overview__inbox-empty">Error al cargar evidencias</div>';
    }
  }

  _showTranscriptDetail(t) {
    // Remove existing modal
    document.querySelector('.biz-transcript-modal-overlay')?.remove();

    const otherName = Object.values(t.participantNames || {}).find(n => n !== 'SuperAdmin') || 'Participante';
    const date = new Date(t.createdAt).toLocaleDateString('es-PA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const duration = t.startedAt && t.endedAt
      ? Math.round((new Date(t.endedAt) - new Date(t.startedAt)) / 60000)
      : 0;

    const summaryHTML = t.summary
      ? t.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '\n• ').replace(/\n/g, '<br>')
      : '<em style="color:var(--text-muted);">Resumen en proceso...</em>';

    const linesHTML = (t.lines || []).map(l =>
      `<div class="biz-transcript-line">
        <span class="biz-transcript-time">${new Date(l.timestamp).toLocaleTimeString('es-PA')}</span>
        <span>${this._esc(l.text)}</span>
      </div>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'biz-transcript-modal-overlay';
    overlay.innerHTML = `
      <div class="biz-transcript-modal" style="--biz-color:var(--biz-color, #7C3AED); --biz-rgb:var(--biz-rgb, 124,58,237);">
        <div class="biz-transcript-modal__header">
          <div>
            <h3>📋 Minuta de Reunión</h3>
            <span class="biz-transcript-modal__meta">${date}${duration ? ` · ${duration} min` : ''} · con ${this._esc(otherName)}</span>
          </div>
          <button class="biz-transcript-modal__close" id="biz-tm-close">✕</button>
        </div>
        <div class="biz-transcript-modal__tabs">
          <button class="biz-transcript-modal__tab biz-transcript-modal__tab--active" data-tab="summary">Resumen IA</button>
          <button class="biz-transcript-modal__tab" data-tab="full">Transcripción Completa</button>
        </div>
        <div class="biz-transcript-modal__body" id="biz-tm-body">
          <div class="biz-transcript-modal__summary">${summaryHTML}</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('biz-transcript-modal-overlay--show'));

    // Close
    const closeModal = () => {
      overlay.classList.remove('biz-transcript-modal-overlay--show');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('#biz-tm-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Tabs
    overlay.querySelectorAll('.biz-transcript-modal__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.biz-transcript-modal__tab').forEach(t => t.classList.remove('biz-transcript-modal__tab--active'));
        tab.classList.add('biz-transcript-modal__tab--active');
        const body = overlay.querySelector('#biz-tm-body');
        if (tab.dataset.tab === 'summary') {
          body.innerHTML = `<div class="biz-transcript-modal__summary">${summaryHTML}</div>`;
        } else {
          body.innerHTML = `<div class="biz-transcript-modal__lines">${linesHTML || '<em>Sin transcripción</em>'}</div>`;
        }
      });
    });
  }

  _esc(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
  }

  /* ── XSS sanitizer ──────────────────────────────────────── */
  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  /* ── Staggered Assembly Sequence (Apple-style) ─────────── */
  _runAssemblySequence() {
    // Phase 1: Sidebar slides in
    const sidebar = this.container.querySelector('.biz-dash__sidebar');
    if (sidebar) {
      sidebar.classList.add('biz-assemble');
      sidebar.style.animationDelay = '0ms';
    }

    // Phase 2: Left panel metrics cascade in
    const leftPanel = this.container.querySelector('.biz-dash__panel--left');
    if (leftPanel) {
      leftPanel.classList.add('biz-assemble', 'biz-assemble--slide-up');
      leftPanel.style.animationDelay = '200ms';

      // Each metric card inside left panel
      const metrics = leftPanel.querySelectorAll('.biz-dash__metric');
      metrics.forEach((m, i) => {
        m.classList.add('biz-assemble', 'biz-assemble--card');
        m.style.animationDelay = `${350 + i * 120}ms`;
      });
    }

    // Phase 3: Right panel (business cards) assemble independently
    const rightPanel = this.container.querySelector('.biz-dash__panel--right');
    if (rightPanel) {
      rightPanel.classList.add('biz-assemble', 'biz-assemble--slide-up');
      rightPanel.style.animationDelay = '300ms';

      const cards = rightPanel.querySelectorAll('.biz-client__card');
      cards.forEach((card, i) => {
        card.classList.add('biz-assemble', 'biz-assemble--card');
        card.style.animationDelay = `${500 + i * 150}ms`;
      });
    }

    // Phase 4: Floor fades in
    const floor = this.container.querySelector('.biz-dash__floor');
    if (floor) {
      floor.classList.add('biz-assemble', 'biz-assemble--fade');
      floor.style.animationDelay = '400ms';
    }

    // Phase 5: Header elements
    const headers = this.container.querySelectorAll('.biz-dash__panel-header, .biz-dash__clients-header');
    headers.forEach((h, i) => {
      h.classList.add('biz-assemble', 'biz-assemble--fade');
      h.style.animationDelay = `${250 + i * 100}ms`;
    });
  }

  /* ── Ecosystem Broadcast — Real-time floating messages ──────── */

  _initBroadcastListener() {
    if (this._broadcastUnsub) { this._broadcastUnsub(); this._broadcastUnsub = null; }

    const bizNorm = normBiz(this.businessId);
    // Single document per ecosystem — no composite index needed
    const docRef = doc(db, 'ecosystem_broadcasts', bizNorm);

    this._broadcastFirstSnapshot = true;
    this._lastBroadcastNonce = null;

    this._broadcastUnsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        this._broadcastFirstSnapshot = false;
        return;
      }

      const data = snap.data();

      // First snapshot: just record the current nonce so we don't replay old messages
      if (this._broadcastFirstSnapshot) {
        this._broadcastFirstSnapshot = false;
        this._lastBroadcastNonce = data.nonce || null;
        return;
      }

      // Only show if nonce changed (new message) and it's recent (< 30s)
      if (data.nonce && data.nonce !== this._lastBroadcastNonce) {
        this._lastBroadcastNonce = data.nonce;

        // Check freshness — don't show messages older than 30s
        const sentMs = data.sentAt?.toMillis ? data.sentAt.toMillis() : (data.sentAt || 0);
        if (Date.now() - sentMs > 30000) return;

        // Don't show to the sender
        const myPhone = this.currentUser?.phone;
        if (data.sentByPhone === myPhone) return;

        this._displayBroadcast(data.message, data.sentByName || 'Sistema');
      }
    });
  }

  _displayBroadcast(message, senderName) {
    // Remove any existing broadcast
    document.querySelector('.eco-broadcast-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'eco-broadcast-overlay';
    overlay.innerHTML = `
      <div class="eco-broadcast">
        <div class="eco-broadcast__glow"></div>
        <div class="eco-broadcast__content">
          <div class="eco-broadcast__sender">${this._esc(senderName)}</div>
          <div class="eco-broadcast__message">${this._esc(message)}</div>
        </div>
        <div class="eco-broadcast__shimmer"></div>
      </div>`;

    document.body.appendChild(overlay);

    // Auto-dismiss after 6s
    setTimeout(() => {
      overlay.classList.add('eco-broadcast--exit');
      setTimeout(() => overlay.remove(), 1000);
    }, 6000);

    // Click to dismiss early
    overlay.addEventListener('click', () => {
      overlay.classList.add('eco-broadcast--exit');
      setTimeout(() => overlay.remove(), 1000);
    });
  }

  _initBroadcastSender() {
    // Floating send button (SuperAdmin only)
    const fab = document.createElement('button');
    fab.className = 'eco-broadcast-fab';
    fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    fab.title = 'Enviar mensaje al ecosistema';
    this.container.appendChild(fab);
    this._broadcastFab = fab;

    // Composer panel
    const composer = document.createElement('div');
    composer.className = 'eco-broadcast-composer';
    composer.style.display = 'none';
    composer.innerHTML = `
      <div class="eco-broadcast-composer__inner">
        <div class="eco-broadcast-composer__header">
          <span class="eco-broadcast-composer__title">Mensaje al Ecosistema</span>
          <button class="eco-broadcast-composer__close">&times;</button>
        </div>
        <textarea class="eco-broadcast-composer__input" placeholder="Escribe un mensaje para los usuarios conectados..." maxlength="280" rows="3"></textarea>
        <div class="eco-broadcast-composer__footer">
          <span class="eco-broadcast-composer__count">0/280</span>
          <button class="eco-broadcast-composer__send" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Enviar
          </button>
        </div>
      </div>`;
    this.container.appendChild(composer);
    this._broadcastComposer = composer;

    // Events
    fab.addEventListener('click', () => {
      const isOpen = composer.style.display !== 'none';
      composer.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        composer.querySelector('.eco-broadcast-composer__input').focus();
        fab.classList.add('eco-broadcast-fab--active');
      } else {
        fab.classList.remove('eco-broadcast-fab--active');
      }
    });

    composer.querySelector('.eco-broadcast-composer__close').addEventListener('click', () => {
      composer.style.display = 'none';
      fab.classList.remove('eco-broadcast-fab--active');
    });

    const input = composer.querySelector('.eco-broadcast-composer__input');
    const sendBtn = composer.querySelector('.eco-broadcast-composer__send');
    const countEl = composer.querySelector('.eco-broadcast-composer__count');

    input.addEventListener('input', () => {
      const len = input.value.trim().length;
      countEl.textContent = `${len}/280`;
      sendBtn.disabled = len === 0;
    });

    // Send on Enter (no shift)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) this._sendBroadcast(input.value.trim());
      }
    });

    sendBtn.addEventListener('click', () => {
      if (input.value.trim()) this._sendBroadcast(input.value.trim());
    });
  }

  async _sendBroadcast(message) {
    const input = this._broadcastComposer?.querySelector('.eco-broadcast-composer__input');
    const sendBtn = this._broadcastComposer?.querySelector('.eco-broadcast-composer__send');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const bizNorm = normBiz(this.businessId);
      const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      // Overwrite single doc per ecosystem — triggers onSnapshot for all listeners
      await setDoc(doc(db, 'ecosystem_broadcasts', bizNorm), {
        businessId: this.businessId,
        bizNorm,
        message,
        sentByPhone: this.currentUser?.phone || '',
        sentByName: this.currentUser?.name || 'Super Admin',
        sentAt: Timestamp.now(),
        nonce,
      });

      // Clear input + show confirmation
      if (input) { input.value = ''; }
      const countEl = this._broadcastComposer?.querySelector('.eco-broadcast-composer__count');
      if (countEl) countEl.textContent = '0/280';

      // Brief success feedback
      if (sendBtn) {
        sendBtn.innerHTML = '✓ Enviado';
        setTimeout(() => {
          sendBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar`;
        }, 1500);
      }

      // Show the broadcast locally to superadmin too (so they see what users see)
      this._displayBroadcast(message, 'Tú');

    } catch (err) {
      console.error('[Broadcast] Send failed:', err);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al enviar mensaje', type: 'error' } }));
    }
    if (sendBtn) sendBtn.disabled = false;
  }

  /* ══════════════════════════════════════════════════════════════════
     INTERACTIVE FORM SYSTEM — Apple-inspired multi-step wizard
     ══════════════════════════════════════════════════════════════════ */

  _buildFormOverlay() {
    return `
    <div class="biz-form__overlay" id="biz-form-overlay">
      <div class="biz-form__backdrop" id="biz-form-backdrop"></div>
      <div class="biz-form__container">
        <button class="biz-form__close" id="biz-form-close">${ICONS.xClose}</button>

        <!-- Progress -->
        <div class="biz-form__progress">
          <div class="biz-form__progress-track">
            <div class="biz-form__progress-fill" id="biz-form-progress-fill"></div>
          </div>
          <div class="biz-form__steps">
            <span class="biz-form__step-dot biz-form__step-dot--active" data-step="0">1</span>
            <span class="biz-form__step-dot" data-step="1">2</span>
            <span class="biz-form__step-dot" data-step="2">3</span>
            <span class="biz-form__step-dot" data-step="3">4</span>
          </div>
        </div>

        <!-- Slides -->
        <div class="biz-form__slides" id="biz-form-slides">

          <!-- Step 0: Info -->
          <div class="biz-form__slide biz-form__slide--active" data-slide="0">
            <div class="biz-form__slide-header">
              <h3 class="biz-form__slide-title">Información del Cliente</h3>
              <p class="biz-form__slide-sub">Completa los datos básicos de la solicitud</p>
            </div>
            <div class="biz-form__fields">
              <div class="biz-form__field">
                <label class="biz-form__label">Nombre del cliente</label>
                <input class="biz-form__input" id="biz-form-clientName" type="text" placeholder="Juan Pérez" autocomplete="off" />
              </div>
              <div class="biz-form__field">
                <label class="biz-form__label">Empresa</label>
                <input class="biz-form__input" id="biz-form-companyName" type="text" placeholder="Empresa S.A." autocomplete="off" />
              </div>
              <div class="biz-form__row">
                <div class="biz-form__field">
                  <label class="biz-form__label">Email</label>
                  <input class="biz-form__input" id="biz-form-email" type="email" placeholder="email@ejemplo.com" autocomplete="off" />
                </div>
                <div class="biz-form__field">
                  <label class="biz-form__label">Teléfono</label>
                  <input class="biz-form__input" id="biz-form-phone" type="tel" placeholder="+507 6000-0000" autocomplete="off" />
                </div>
              </div>
              <div class="biz-form__field">
                <label class="biz-form__label">Categoría</label>
                <div class="biz-form__select-wrap">
                  <select class="biz-form__select" id="biz-form-category">
                    <option value="">Seleccionar...</option>
                    <option value="parts-request">Solicitud de Partes</option>
                    <option value="quote">Cotización</option>
                    <option value="service">Servicio Técnico</option>
                    <option value="consulting">Consultoría</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div class="biz-form__field">
                <label class="biz-form__label">Descripción</label>
                <textarea class="biz-form__textarea" id="biz-form-description" rows="3" placeholder="Describe brevemente la solicitud..."></textarea>
              </div>
              <div class="biz-form__field">
                <label class="biz-form__label">Urgencia</label>
                <div class="biz-form__pills" id="biz-form-urgency">
                  <button class="biz-form__pill" data-value="low" type="button">
                    <span class="biz-form__pill-dot" style="background:#3B82F6"></span> Baja
                  </button>
                  <button class="biz-form__pill biz-form__pill--active" data-value="medium" type="button">
                    <span class="biz-form__pill-dot" style="background:#F59E0B"></span> Media
                  </button>
                  <button class="biz-form__pill" data-value="high" type="button">
                    <span class="biz-form__pill-dot" style="background:#EF4444"></span> Alta
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 1: Files -->
          <div class="biz-form__slide" data-slide="1">
            <div class="biz-form__slide-header">
              <h3 class="biz-form__slide-title">Archivos Adjuntos</h3>
              <p class="biz-form__slide-sub">Arrastra archivos o toca para seleccionar</p>
            </div>
            <div class="biz-form__dropzone" id="biz-form-dropzone">
              <input type="file" multiple class="biz-form__file-hidden" id="biz-form-file-input" />
              <div class="biz-form__dropzone-content">
                <div class="biz-form__dropzone-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div class="biz-form__dropzone-text">Suelta archivos aquí</div>
                <div class="biz-form__dropzone-hint">PDF, imágenes, documentos · Max 10MB c/u</div>
              </div>
            </div>
            <div class="biz-form__file-list" id="biz-form-file-list"></div>
          </div>

          <!-- Step 2: Signature -->
          <div class="biz-form__slide" data-slide="2">
            <div class="biz-form__slide-header">
              <h3 class="biz-form__slide-title">Firma Digital</h3>
              <p class="biz-form__slide-sub">Dibuja tu firma abajo o solicita firma remota</p>
            </div>
            <div class="biz-form__sig-wrapper" id="biz-form-sig-wrapper">
              <canvas class="biz-form__sig-canvas" id="biz-form-sig-canvas"></canvas>
              <div class="biz-form__sig-placeholder" id="biz-form-sig-placeholder">
                <span>Firma aquí</span>
              </div>
              <button class="biz-form__sig-clear" id="biz-form-sig-clear" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                Limpiar
              </button>
            </div>
            <div class="biz-form__sig-divider">
              <span>ó</span>
            </div>
            <button class="biz-form__btn biz-form__btn--outline" id="biz-form-sig-remote" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Enviar a dispositivo móvil
            </button>
            <div class="biz-form__sig-remote-status" id="biz-form-sig-remote-status"></div>
          </div>

          <!-- Step 3: Review -->
          <div class="biz-form__slide" data-slide="3">
            <div class="biz-form__slide-header">
              <h3 class="biz-form__slide-title">Revisar y Enviar</h3>
              <p class="biz-form__slide-sub">Confirma que toda la información sea correcta</p>
            </div>
            <div class="biz-form__review" id="biz-form-review"></div>
          </div>

        </div>

        <!-- Navigation -->
        <div class="biz-form__nav">
          <button class="biz-form__btn biz-form__btn--ghost" id="biz-form-prev" type="button">Atrás</button>
          <button class="biz-form__btn biz-form__btn--primary" id="biz-form-next" type="button">Siguiente</button>
        </div>
      </div>
    </div>`;
  }

  _attachFormListeners() {
    const launcher = this.container.querySelector('#biz-form-launcher');
    if (launcher) launcher.addEventListener('click', () => this._openForm());

    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;

    overlay.querySelector('#biz-form-close')?.addEventListener('click', () => this._closeForm());
    overlay.querySelector('#biz-form-backdrop')?.addEventListener('click', () => this._closeForm());
    overlay.querySelector('#biz-form-next')?.addEventListener('click', () => this._formNext());
    overlay.querySelector('#biz-form-prev')?.addEventListener('click', () => this._formPrev());
    overlay.querySelector('#biz-form-sig-clear')?.addEventListener('click', () => this._clearSignature());
    overlay.querySelector('#biz-form-sig-remote')?.addEventListener('click', () => this._sendSignatureToMobile());

    // Urgency pills
    overlay.querySelectorAll('#biz-form-urgency .biz-form__pill').forEach(pill => {
      pill.addEventListener('click', () => {
        overlay.querySelectorAll('#biz-form-urgency .biz-form__pill').forEach(p => p.classList.remove('biz-form__pill--active'));
        pill.classList.add('biz-form__pill--active');
      });
    });

    // Dropzone
    this._initDropzone();
  }

  _openForm() {
    this._formStep = 0;
    this._formFiles = [];
    this._sigHasContent = false;
    this._sigRemoteUnsub = null;

    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;

    // Reset slides
    overlay.querySelectorAll('.biz-form__slide').forEach(s => s.classList.remove('biz-form__slide--active'));
    overlay.querySelector('[data-slide="0"]')?.classList.add('biz-form__slide--active');

    // Reset progress
    this._updateFormProgress(0);

    // Reset fields
    overlay.querySelectorAll('.biz-form__input, .biz-form__textarea').forEach(el => el.value = '');
    overlay.querySelector('.biz-form__select').value = '';
    overlay.querySelectorAll('#biz-form-urgency .biz-form__pill').forEach(p => p.classList.remove('biz-form__pill--active'));
    overlay.querySelector('[data-value="medium"]')?.classList.add('biz-form__pill--active');
    const fileList = overlay.querySelector('#biz-form-file-list');
    if (fileList) fileList.innerHTML = '';

    // Reset nav
    const prevBtn = overlay.querySelector('#biz-form-prev');
    const nextBtn = overlay.querySelector('#biz-form-next');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) { nextBtn.textContent = 'Siguiente'; nextBtn.disabled = false; }

    // Show overlay
    requestAnimationFrame(() => {
      overlay.classList.add('biz-form__overlay--show');
      // Init signature canvas after transition
      setTimeout(() => this._initSignatureCanvas(), 350);
    });
  }

  _closeForm() {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;
    overlay.classList.remove('biz-form__overlay--show');
    if (this._sigRemoteUnsub) { this._sigRemoteUnsub(); this._sigRemoteUnsub = null; }
  }

  _formNext() {
    if (this._formStep === 3) {
      this._submitForm();
      return;
    }
    if (!this._validateFormStep(this._formStep)) return;

    if (this._formStep === 2) {
      // Build review before showing step 3
      this._buildFormReview();
    }

    this._formStep++;
    this._formGoTo(this._formStep);
  }

  _formPrev() {
    if (this._formStep <= 0) return;
    this._formStep--;
    this._formGoTo(this._formStep);
  }

  _formGoTo(step) {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;

    // Update slides
    overlay.querySelectorAll('.biz-form__slide').forEach(s => {
      s.classList.remove('biz-form__slide--active', 'biz-form__slide--exit-left', 'biz-form__slide--exit-right');
    });
    const target = overlay.querySelector(`[data-slide="${step}"]`);
    if (target) target.classList.add('biz-form__slide--active');

    // Update progress
    this._updateFormProgress(step);

    // Update nav buttons
    const prevBtn = overlay.querySelector('#biz-form-prev');
    const nextBtn = overlay.querySelector('#biz-form-next');
    if (prevBtn) prevBtn.style.display = step === 0 ? 'none' : '';
    if (nextBtn) {
      nextBtn.textContent = step === 3 ? 'Enviar' : 'Siguiente';
      nextBtn.disabled = false;
      if (step === 3) nextBtn.classList.add('biz-form__btn--submit');
      else nextBtn.classList.remove('biz-form__btn--submit');
    }

    // Re-init signature canvas when entering step 2
    if (step === 2) setTimeout(() => this._initSignatureCanvas(), 100);
  }

  _updateFormProgress(step) {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;
    const fill = overlay.querySelector('#biz-form-progress-fill');
    if (fill) fill.style.width = `${((step + 1) / 4) * 100}%`;
    overlay.querySelectorAll('.biz-form__step-dot').forEach(dot => {
      const s = parseInt(dot.dataset.step);
      dot.classList.toggle('biz-form__step-dot--active', s <= step);
      dot.classList.toggle('biz-form__step-dot--current', s === step);
    });
  }

  _validateFormStep(step) {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return false;

    if (step === 0) {
      const name = overlay.querySelector('#biz-form-clientName')?.value?.trim();
      const category = overlay.querySelector('#biz-form-category')?.value;
      if (!name) {
        this._shakeField(overlay.querySelector('#biz-form-clientName'));
        return false;
      }
      if (!category) {
        this._shakeField(overlay.querySelector('.biz-form__select-wrap'));
        return false;
      }
      return true;
    }
    // Steps 1, 2 are optional (files, signature)
    return true;
  }

  _shakeField(el) {
    if (!el) return;
    el.classList.add('biz-form__shake');
    el.addEventListener('animationend', () => el.classList.remove('biz-form__shake'), { once: true });
  }

  _collectFormInfo() {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return {};
    const urgencyPill = overlay.querySelector('#biz-form-urgency .biz-form__pill--active');
    return {
      clientName: overlay.querySelector('#biz-form-clientName')?.value?.trim() || '',
      companyName: overlay.querySelector('#biz-form-companyName')?.value?.trim() || '',
      email: overlay.querySelector('#biz-form-email')?.value?.trim() || '',
      phone: overlay.querySelector('#biz-form-phone')?.value?.trim() || '',
      category: overlay.querySelector('#biz-form-category')?.value || '',
      description: overlay.querySelector('#biz-form-description')?.value?.trim() || '',
      urgency: urgencyPill?.dataset?.value || 'medium',
    };
  }

  // ── File Upload ─────────────────────────────────────────────────

  _initDropzone() {
    const overlay = this.container.querySelector('#biz-form-overlay');
    if (!overlay) return;
    const dropzone = overlay.querySelector('#biz-form-dropzone');
    const fileInput = overlay.querySelector('#biz-form-file-input');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('biz-form__dropzone--dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('biz-form__dropzone--dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('biz-form__dropzone--dragover');
      this._handleFilesSelected(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => {
      this._handleFilesSelected(fileInput.files);
      fileInput.value = '';
    });
  }

  _handleFilesSelected(fileList) {
    if (!this._formFiles) this._formFiles = [];
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: `${file.name} excede 10MB`, type: 'error' } }));
        continue;
      }
      if (this._formFiles.length >= 8) {
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Máximo 8 archivos', type: 'error' } }));
        break;
      }
      this._formFiles.push(file);
    }
    this._renderFileList();
  }

  _renderFileList() {
    const list = this.container.querySelector('#biz-form-file-list');
    if (!list) return;
    if (!this._formFiles.length) { list.innerHTML = ''; return; }

    list.innerHTML = this._formFiles.map((file, i) => {
      const isImg = file.type.startsWith('image/');
      const sizeKB = (file.size / 1024).toFixed(0);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const size = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      const icon = isImg
        ? `<div class="biz-form__file-thumb" data-file-idx="${i}"></div>`
        : `<div class="biz-form__file-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>`;
      return `
        <div class="biz-form__file-card" style="animation-delay:${i * 0.05}s">
          ${icon}
          <div class="biz-form__file-info">
            <span class="biz-form__file-name">${file.name}</span>
            <span class="biz-form__file-size">${size}</span>
          </div>
          <button class="biz-form__file-remove" data-rm="${i}" type="button">${ICONS.xClose}</button>
        </div>`;
    }).join('');

    // Render image thumbnails
    this._formFiles.forEach((file, i) => {
      if (!file.type.startsWith('image/')) return;
      const thumb = list.querySelector(`[data-file-idx="${i}"]`);
      if (!thumb) return;
      const reader = new FileReader();
      reader.onload = (e) => { thumb.style.backgroundImage = `url(${e.target.result})`; };
      reader.readAsDataURL(file);
    });

    // Remove buttons
    list.querySelectorAll('.biz-form__file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.rm);
        this._formFiles.splice(idx, 1);
        this._renderFileList();
      });
    });
  }

  async _uploadFormFiles(docId) {
    const urls = [];
    for (const file of this._formFiles) {
      try {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `form-submissions/${docId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        const url = await getDownloadURL(ref);
        urls.push({ name: file.name, url, type: file.type, size: file.size });
      } catch (err) {
        console.error('[Form] Upload failed:', file.name, err);
      }
    }
    return urls;
  }

  // ── Signature Canvas ────────────────────────────────────────────

  _initSignatureCanvas() {
    const canvas = this.container.querySelector('#biz-form-sig-canvas');
    const wrapper = this.container.querySelector('#biz-form-sig-wrapper');
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '200px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this._sigCtx = ctx;
    this._sigCanvas = canvas;

    // Remove old listeners by cloning
    const clone = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(clone, canvas);
    this._sigCanvas = clone;
    const newCtx = clone.getContext('2d');
    newCtx.scale(dpr, dpr);
    newCtx.strokeStyle = '#FFFFFF';
    newCtx.lineWidth = 2.5;
    newCtx.lineCap = 'round';
    newCtx.lineJoin = 'round';
    this._sigCtx = newCtx;

    let drawing = false;
    const getPos = (e) => {
      const r = clone.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const p = getPos(e);
      newCtx.beginPath();
      newCtx.moveTo(p.x, p.y);
      // Hide placeholder
      const ph = this.container.querySelector('#biz-form-sig-placeholder');
      if (ph) ph.style.opacity = '0';
    };
    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      newCtx.lineTo(p.x, p.y);
      newCtx.stroke();
      this._sigHasContent = true;
    };
    const end = () => { drawing = false; };

    clone.addEventListener('pointerdown', start);
    clone.addEventListener('pointermove', move);
    clone.addEventListener('pointerup', end);
    clone.addEventListener('pointerleave', end);
  }

  _clearSignature() {
    if (!this._sigCtx || !this._sigCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    this._sigCtx.clearRect(0, 0, this._sigCanvas.width / dpr, this._sigCanvas.height / dpr);
    this._sigHasContent = false;
    const ph = this.container.querySelector('#biz-form-sig-placeholder');
    if (ph) ph.style.opacity = '1';
  }

  _getSignatureDataUrl() {
    if (!this._sigCanvas || !this._sigHasContent) return null;
    return this._sigCanvas.toDataURL('image/png');
  }

  async _uploadSignature(docId) {
    const dataUrl = this._getSignatureDataUrl();
    if (!dataUrl) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `form-submissions/${docId}/signature_${Date.now()}.png`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, blob);
      return await getDownloadURL(ref);
    } catch (err) {
      console.error('[Form] Signature upload failed:', err);
      return null;
    }
  }

  // ── Remote Signature (Send to Mobile) ───────────────────────────

  async _sendSignatureToMobile() {
    const statusEl = this.container.querySelector('#biz-form-sig-remote-status');
    const btn = this.container.querySelector('#biz-form-sig-remote');
    if (!statusEl || !btn) return;

    btn.disabled = true;
    statusEl.innerHTML = `<div class="biz-form__sig-pending"><div class="biz-form__spinner"></div> Preparando solicitud de firma...</div>`;

    try {
      // Create a signature request doc
      const info = this._collectFormInfo();
      const sigReqRef = await addDoc(collection(db, 'signature-requests'), {
        formTitle: info.clientName || 'Solicitud sin nombre',
        requestedBy: this.currentUser?.phone || 'unknown',
        requestedByName: this.currentUser?.name || 'SuperAdmin',
        status: 'pending',
        createdAt: Timestamp.now(),
        signatureUrl: null,
      });

      // Listen for signature completion
      this._sigRemoteUnsub = onSnapshot(doc(db, 'signature-requests', sigReqRef.id), (snap) => {
        const data = snap.data();
        if (data?.status === 'signed' && data?.signatureUrl) {
          statusEl.innerHTML = `<div class="biz-form__sig-done">✓ Firma recibida desde dispositivo móvil</div>`;
          this._remoteSignatureUrl = data.signatureUrl;
          this._sigHasContent = true; // Mark as having signature
          btn.disabled = true;
          if (this._sigRemoteUnsub) { this._sigRemoteUnsub(); this._sigRemoteUnsub = null; }
        }
      });

      statusEl.innerHTML = `
        <div class="biz-form__sig-pending">
          <div class="biz-form__spinner"></div>
          <span>Esperando firma del dispositivo...</span>
          <span class="biz-form__sig-id">ID: ${sigReqRef.id.slice(0, 8)}</span>
        </div>`;

      // Send push notification to all registered collaborators
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const tokens = [];
        usersSnap.forEach(u => {
          const d = u.data();
          if (d.fcmToken && d.phone !== this.currentUser?.phone) tokens.push(d.fcmToken);
        });
        if (tokens.length) {
          await fetch(apiUrl('/api/send-push'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens,
              title: '✍️ Firma Requerida',
              body: `${this.currentUser?.name || 'SuperAdmin'} solicita tu firma`,
              url: `/#sign/${sigReqRef.id}`,
            }),
          }).catch(() => {});
        }
      } catch (_) { /* push is best-effort */ }

      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Solicitud de firma enviada', type: 'success' } }));
    } catch (err) {
      console.error('[Form] Remote signature failed:', err);
      statusEl.innerHTML = `<div class="biz-form__sig-error">Error al enviar solicitud</div>`;
      btn.disabled = false;
    }
  }

  // ── Review & Submit ─────────────────────────────────────────────

  _buildFormReview() {
    const review = this.container.querySelector('#biz-form-review');
    if (!review) return;
    const info = this._collectFormInfo();
    const urgencyLabels = { low: 'Baja', medium: 'Media', high: 'Alta' };
    const urgencyColors = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444' };
    const categoryLabels = {
      'parts-request': 'Solicitud de Partes', 'quote': 'Cotización',
      'service': 'Servicio Técnico', 'consulting': 'Consultoría', 'other': 'Otro'
    };

    const sigPreview = this._sigHasContent
      ? (this._remoteSignatureUrl
          ? `<img src="${this._remoteSignatureUrl}" class="biz-form__review-sig" alt="Firma" />`
          : `<img src="${this._getSignatureDataUrl()}" class="biz-form__review-sig" alt="Firma" />`)
      : '<span class="biz-form__review-empty">Sin firma</span>';

    const filesPreview = this._formFiles?.length
      ? this._formFiles.map(f => `<span class="biz-form__review-file">${f.name}</span>`).join('')
      : '<span class="biz-form__review-empty">Sin archivos</span>';

    review.innerHTML = `
      <div class="biz-form__review-section">
        <div class="biz-form__review-title">Información</div>
        <div class="biz-form__review-grid">
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Cliente</span>
            <span class="biz-form__review-value">${info.clientName || '—'}</span>
          </div>
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Empresa</span>
            <span class="biz-form__review-value">${info.companyName || '—'}</span>
          </div>
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Email</span>
            <span class="biz-form__review-value">${info.email || '—'}</span>
          </div>
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Teléfono</span>
            <span class="biz-form__review-value">${info.phone || '—'}</span>
          </div>
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Categoría</span>
            <span class="biz-form__review-value">${categoryLabels[info.category] || '—'}</span>
          </div>
          <div class="biz-form__review-item">
            <span class="biz-form__review-label">Urgencia</span>
            <span class="biz-form__review-value" style="color:${urgencyColors[info.urgency]}">${urgencyLabels[info.urgency]}</span>
          </div>
        </div>
        ${info.description ? `<div class="biz-form__review-desc">${info.description}</div>` : ''}
      </div>
      <div class="biz-form__review-section">
        <div class="biz-form__review-title">Archivos (${this._formFiles?.length || 0})</div>
        <div class="biz-form__review-files">${filesPreview}</div>
      </div>
      <div class="biz-form__review-section">
        <div class="biz-form__review-title">Firma</div>
        ${sigPreview}
      </div>`;
  }

  async _submitForm() {
    const overlay = this.container.querySelector('#biz-form-overlay');
    const nextBtn = overlay?.querySelector('#biz-form-next');
    if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = '<div class="biz-form__spinner"></div> Enviando...'; }

    try {
      const info = this._collectFormInfo();

      // 1. Create Firestore doc
      const docRef = await addDoc(collection(db, 'form-submissions'), {
        businessId: 'ml-parts',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'submitted',
        submittedBy: {
          phone: this.currentUser?.phone || '',
          name: this.currentUser?.name || '',
          role: this.currentUser?.role || '',
        },
        info,
        files: [],
        signature: { dataUrl: null, storageUrl: null, signedBy: this.currentUser?.phone || '', method: 'direct' },
      });

      // 2. Upload files
      const fileUrls = await this._uploadFormFiles(docRef.id);

      // 3. Upload signature
      let sigUrl = this._remoteSignatureUrl || null;
      if (!sigUrl && this._sigHasContent) {
        sigUrl = await this._uploadSignature(docRef.id);
      }

      // 4. Update doc with file URLs and signature
      await updateDoc(doc(db, 'form-submissions', docRef.id), {
        files: fileUrls,
        signature: {
          storageUrl: sigUrl,
          signedBy: this.currentUser?.phone || '',
          signedAt: Timestamp.now(),
          method: this._remoteSignatureUrl ? 'remote' : 'direct',
        },
        updatedAt: Timestamp.now(),
      });

      // Success animation
      if (overlay) {
        const container = overlay.querySelector('.biz-form__container');
        if (container) {
          container.innerHTML = `
            <div class="biz-form__success">
              <div class="biz-form__success-check">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 class="biz-form__success-title">¡Enviado con Éxito!</h3>
              <p class="biz-form__success-sub">La solicitud ha sido registrada correctamente</p>
              <button class="biz-form__btn biz-form__btn--primary" onclick="this.closest('.biz-form__overlay').classList.remove('biz-form__overlay--show')" type="button">Cerrar</button>
            </div>`;
        }
      }

      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Formulario enviado exitosamente', type: 'success' } }));
      this._remoteSignatureUrl = null;
    } catch (err) {
      console.error('[Form] Submit failed:', err);
      document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Error al enviar formulario', type: 'error' } }));
      if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Reintentar'; }
    }
  }

  unmount() {
    // Cleanup dust particles
    if (this._dustRAF) cancelAnimationFrame(this._dustRAF);
    if (this._dustResizeHandler) window.removeEventListener('resize', this._dustResizeHandler);
    const section = this.container.querySelector('.biz-dash');
    if (section && this._dustMouseHandler) {
      section.removeEventListener('mousemove', this._dustMouseHandler);
    }
    // Cleanup broadcast
    if (this._broadcastUnsub) { this._broadcastUnsub(); this._broadcastUnsub = null; }
    document.querySelector('.eco-broadcast-overlay')?.remove();
    // Cleanup form
    if (this._sigRemoteUnsub) { this._sigRemoteUnsub(); this._sigRemoteUnsub = null; }
    // Cleanup modals (now inline in dashboard, removed with container)
    document.getElementById('cred-pin-overlay')?.remove();
    document.getElementById('cred-vault-overlay')?.remove();
  }
}
