import { apiUrl } from '../services/apiConfig.js';
import userAuth from '../services/userAuth.js';

// ─── Shield SVG (stylized hexagonal crest split into 8 fragments) ───
const SHIELD_SVG = `
<svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" class="lv-shield-svg" id="lv-shield-svg">
  <!-- Fragment 1: Top-left wing -->
  <g class="lv-shield-fragment" data-frag="0">
    <path d="M100 10 L40 50 L40 90 L100 70 Z" fill="url(#shGrad1)" stroke="rgba(167,139,250,0.7)" stroke-width="1"/>
  </g>
  <!-- Fragment 2: Top-right wing -->
  <g class="lv-shield-fragment" data-frag="1">
    <path d="M100 10 L160 50 L160 90 L100 70 Z" fill="url(#shGrad1)" stroke="rgba(167,139,250,0.7)" stroke-width="1"/>
  </g>
  <!-- Fragment 3: Left mid -->
  <g class="lv-shield-fragment" data-frag="2">
    <path d="M40 90 L40 150 L70 170 L100 130 L100 70 Z" fill="url(#shGrad2)" stroke="rgba(167,139,250,0.6)" stroke-width="1"/>
  </g>
  <!-- Fragment 4: Right mid -->
  <g class="lv-shield-fragment" data-frag="3">
    <path d="M160 90 L160 150 L130 170 L100 130 L100 70 Z" fill="url(#shGrad2)" stroke="rgba(167,139,250,0.6)" stroke-width="1"/>
  </g>
  <!-- Fragment 5: Bottom-left -->
  <g class="lv-shield-fragment" data-frag="4">
    <path d="M40 150 L70 170 L100 200 L70 190 Z" fill="url(#shGrad3)" stroke="rgba(167,139,250,0.5)" stroke-width="1"/>
  </g>
  <!-- Fragment 6: Bottom-right -->
  <g class="lv-shield-fragment" data-frag="5">
    <path d="M160 150 L130 170 L100 200 L130 190 Z" fill="url(#shGrad3)" stroke="rgba(167,139,250,0.5)" stroke-width="1"/>
  </g>
  <!-- Fragment 7: Bottom point -->
  <g class="lv-shield-fragment" data-frag="6">
    <path d="M70 190 L100 200 L100 230 Z" fill="url(#shGrad4)" stroke="rgba(167,139,250,0.5)" stroke-width="1"/>
  </g>
  <!-- Fragment 8: Bottom point right -->
  <g class="lv-shield-fragment" data-frag="7">
    <path d="M130 190 L100 200 L100 230 Z" fill="url(#shGrad4)" stroke="rgba(167,139,250,0.5)" stroke-width="1"/>
  </g>
  <!-- Center diamond (assembles last) -->
  <g class="lv-shield-fragment" data-frag="8">
    <path d="M100 70 L80 100 L100 130 L120 100 Z" fill="rgba(167,139,250,0.4)" stroke="rgba(167,139,250,0.9)" stroke-width="1.5"/>
  </g>
  <defs>
    <linearGradient id="shGrad1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(124,58,237,0.7)"/>
      <stop offset="100%" stop-color="rgba(76,29,149,0.45)"/>
    </linearGradient>
    <linearGradient id="shGrad2" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="rgba(124,58,237,0.6)"/>
      <stop offset="100%" stop-color="rgba(76,29,149,0.35)"/>
    </linearGradient>
    <linearGradient id="shGrad3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(124,58,237,0.5)"/>
      <stop offset="100%" stop-color="rgba(46,16,101,0.4)"/>
    </linearGradient>
    <linearGradient id="shGrad4" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="rgba(124,58,237,0.45)"/>
      <stop offset="100%" stop-color="rgba(46,16,101,0.35)"/>
    </linearGradient>
  </defs>
</svg>`;

// ─── Pricing config ─────────────────────────────────────────────
const MONTHLY_BASE = 124.00;
const SETUP_COST = 760.00;
const ADDONS = [
  { id: 'facturacion', name: 'Facturacion Electronica Fiscal', desc: 'Integracion oficial para emitir facturas electronicas avaladas por la DGI directamente desde tu punto de venta, de forma automatica al cerrar cada cuenta.', price: 60.00, type: 'once', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  { id: 'pos', name: 'Ecosistema de Pagos Integrado (POS)', desc: 'Convierte tu tableta en una terminal de cobro. Tarifa de 3.5% + $0.50 (+ ITBMS sobre los $0.50), mejorable por volumen. Acceso inmediato a tus fondos mediante tarjeta corporativa dedicada ($37 + ITBMS) o transferencias a tu banco por $1.00 en 48 horas.', price: 386.00, type: 'once', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` },
  { id: 'ia', name: 'Asistente Operativo con IA', desc: 'Chatea con tu restaurante. Hazle preguntas al sistema sobre tu operacion, recibe alertas inteligentes de inventario y sugerencias para reducir costos e impulsar ventas basadas en tus propios datos historicos.', price: 49.00, type: 'monthly', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="17" r="1"/></svg>` },
];

// ─── Role data ──────────────────────────────────────────────────
const ROLES = [
  {
    id: 'consumer',
    tab: 'Cliente',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    title: 'La Experiencia que Hace Volver al Cliente',
    objective: 'Ordenar facil, pagar rapido y querer volver.',
    features: [
      { name: 'Menu Digital con Fotos HD', desc: 'Cada plato cobra vida en pantalla — fotos profesionales, descripciones y precios siempre actualizados.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>` },
      { name: 'Ordenar desde la Mesa via QR', desc: 'Escanea, elige y ordena sin esperas. Tu mesa es tu control remoto.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/></svg>` },
      { name: 'Pagar desde el Telefono', desc: 'Divide la cuenta, paga tu parte y sal cuando quieras. Cero friccion.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>` },
      { name: 'Factura Electronica Automatica', desc: 'Tu factura legal llega a tu correo antes de que termines el postre.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
    ],
  },
  {
    id: 'waiter',
    tab: 'Mesero(a)',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    title: 'Servicio Impecable, Cero Errores',
    objective: 'Tomar ordenes rapido, no cometer errores y dar mejor servicio.',
    features: [
      { name: 'Tomar Ordenes en Tablet/Movil', desc: 'Interfaz intuitiva disenada para velocidad — toca, confirma y listo.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>` },
      { name: 'Enviar Directo a Cocina/Barra', desc: 'La orden viaja en milisegundos. Sin caminar, sin gritar, sin malentendidos.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>` },
      { name: 'Estado del Pedido en Tiempo Real', desc: 'Sabe exactamente cuando esta listo cada plato sin ir a preguntar a cocina.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
    ],
  },
  {
    id: 'kitchen',
    tab: 'Cocina (KDS)',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    title: 'Cocina Sincronizada, Platos Perfectos',
    objective: 'Preparar rapido, no perder ordenes y coordinar estaciones.',
    features: [
      { name: 'Display Digital KDS (Adios Papel)', desc: 'Pantalla en tiempo real que reemplaza comandas de papel. Mas claro, mas rapido, mas limpio.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
      { name: 'Ruteo Automatico por Estacion', desc: 'Cada plato llega a la estacion correcta — parrilla, frios, postres — automaticamente.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>` },
      { name: 'Tiempos de Preparacion con Alertas', desc: 'Cronometros visuales que avisan cuando un plato esta tardando. Nada se quema, nada se olvida.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
    ],
  },
  {
    id: 'cashier',
    tab: 'Cajero(a)',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    title: 'Cobros Exactos, Caja Siempre Cuadrada',
    objective: 'Cobrar sin errores, facturar legalmente y cuadrar la caja.',
    features: [
      { name: 'Cobro con Multiples Metodos', desc: 'Tarjeta, efectivo, Yappy, transferencia — divide y cobra como el cliente necesite, todo en una sola pantalla.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` },
      { name: 'Factura Electronica Auto via PAC', desc: 'La factura se genera y envia sola al momento del cobro. 100% legal, 0% esfuerzo.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
      { name: 'Cierre de Caja (Corte Z) Completo', desc: 'Desglose total por metodo de pago, propinas, descuentos y devoluciones. Un click y listo.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>` },
    ],
  },
  {
    id: 'admin',
    tab: 'Administrador',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: 'Control Total, Decisiones con Datos',
    objective: 'Ver todo, controlar costos, tomar decisiones con datos y hacer crecer el negocio.',
    features: [
      { name: 'Dashboard en Tiempo Real', desc: 'Ventas, mesas activas, ordenes pendientes — todo en un vistazo. Tu restaurante en la palma de tu mano.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>` },
      { name: 'Inventario con Deduccion Automatica', desc: 'Cada venta descuenta ingredientes automaticamente. Sabes que falta antes de que se acabe.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>` },
      { name: 'Prediccion de Demanda con IA', desc: 'Inteligencia Artificial analiza patrones y te dice que preparar, cuando comprar y como optimizar tu operacion.', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H6a2 2 0 0 0 0 4h12a2 2 0 0 0 0-4h-4c0-3 2-4 2-6a4 4 0 0 0-4-4z"/><line x1="10" y1="20" x2="14" y2="20"/></svg>` },
    ],
  },
];

export class LaVainaPresentation {
  constructor(container, currentUser) {
    this.container = container;
    this.currentUser = currentUser;
    this._observers = [];
    this._currentSection = 0;
    this._sections = [];
    this._selectedOptions = new Set();
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  async render() {
    this.container.innerHTML = this._buildPage();
    this._sections = Array.from(this.container.querySelectorAll('.lv-section'));

    // Fetch business logo and replace hero title
    try {
      const biz = await userAuth.getBusiness('lavaina');
      if (biz?.logo) {
        const heroClient = this.container.querySelector('.lv-hero-client');
        if (heroClient) {
          heroClient.innerHTML = `<img src="${biz.logo}" alt="${biz.nombre || 'La Vaina'}" class="lv-hero-logo">`;
        }
      }
    } catch (e) { /* fallback to text */ }

    // Play shield entry if overlay exists from Home transition
    const existingOverlay = document.getElementById('lv-shield-transition-overlay');
    if (existingOverlay) {
      await this._wait(400);
      existingOverlay.classList.add('lv-shield-overlay--dissolving');
      await this._wait(700);
      existingOverlay.remove();
    } else {
      // Direct navigation — play shield entry inline
      await this._playInlineShieldEntry();
    }

    this._initScrollAnimations();
    this._initSectionTracker();
    this._attachListeners();
  }

  unmount() {
    this._observers.forEach(o => o.disconnect());
    this._observers = [];
    document.querySelector('.lv-modal-overlay')?.remove();
    document.querySelector('.lv-confirm-overlay')?.remove();
    document.querySelector('#lv-mobile-receipt')?.remove();
  }

  // ═══════════════════════════════════════════════════════════════
  //  BUILD PAGE HTML
  // ═══════════════════════════════════════════════════════════════

  _buildPage() {
    return `
      <div class="lv-page" id="lv-page">

        <!-- Shield Entry (inline, for direct navigation) -->
        <div class="lv-shield-overlay" id="lv-shield-inline" style="display:none;">
          <div class="lv-shield-container">
            ${SHIELD_SVG}
            <div class="lv-shield-scanline" id="lv-shield-scanline"></div>
            <div class="lv-shield-particles" id="lv-shield-particles"></div>
          </div>
        </div>

        <!-- Back Button -->
        <button class="lv-back-btn" id="lv-back" aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <!-- Floating CTA -->
        <button class="lv-float-cta" id="lv-float-cta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Ver Propuesta Economica
        </button>

        <!-- ═══ SECTION 1: HERO ═══ -->
        <section class="lv-section lv-hero" id="lv-sec-hero">
          <div data-lv-reveal>
            <div class="lv-hero-badge">
              <span class="lv-hero-badge-dot"></span>
              PROPUESTA EJECUTIVA 2026
            </div>
          </div>
          <div data-lv-reveal>
            <h1 class="lv-hero-client">La Vaina</h1>
          </div>
          <div data-lv-reveal>
            <p class="lv-hero-tagline">
              No construimos <em>otra app de restaurante</em>.<br>
              Reconstruimos la forma en que <em>operas, cobras y creces</em>.
            </p>
          </div>
          <div data-lv-reveal>
            <p class="lv-hero-wow">
              Tomamos cada necesidad basica de gestion, la mejoramos con inteligencia artificial y la fusionamos en un ecosistema unico. Control total. Operaciones automatizadas. La aplicacion del futuro para tu restaurante — hoy.
            </p>
          </div>
          <div class="lv-hero-scroll" data-lv-reveal>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            <span>Descubre mas</span>
          </div>
        </section>

        <!-- ═══ SECTION 2: ROLES ═══ -->
        <section class="lv-section lv-roles" id="lv-sec-roles">
          <div data-lv-reveal>
            <div class="lv-section-tag">Soluciones por Rol</div>
            <h2 class="lv-section-title">Una App. Cada Rol. Resuelto.</h2>
            <p class="lv-section-subtitle">
              Cinco experiencias disenadas para cada persona en tu restaurante — del cliente al dueno. Cada vista es una herramienta de precision.
            </p>
          </div>

          <div class="lv-role-tabs" data-lv-reveal>
            ${ROLES.map((r, i) => `<button class="lv-role-tab${i === 0 ? ' active' : ''}" data-role="${r.id}">${r.tab}</button>`).join('')}
          </div>

          ${ROLES.map((r, i) => `
            <div class="lv-role-panel${i === 0 ? ' active' : ''}" data-role-panel="${r.id}">
              <div class="lv-role-icon">${r.icon}</div>
              <h3 class="lv-role-title">${r.title}</h3>
              <p class="lv-role-objective">${r.objective}</p>
              <div class="lv-role-features">
                ${r.features.map(f => `
                  <div class="lv-role-feature">
                    <div class="lv-role-feature-icon">${f.icon}</div>
                    <div class="lv-role-feature-text">
                      <span class="lv-role-feature-name">${f.name}</span>
                      <span class="lv-role-feature-desc">${f.desc}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button class="lv-role-more" data-action="show-features">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Ver mas de 144 funcionalidades identificadas
              </button>
            </div>
          `).join('')}
        </section>

        <!-- ═══ SECTION 3: PRICING ═══ -->
        <section class="lv-section lv-pricing" id="lv-sec-pricing">
          <div data-lv-reveal>
            <div class="lv-section-tag">Propuesta Economica</div>
            <h2 class="lv-section-title">Inversion Clara, Sin Sorpresas</h2>
            <p class="lv-section-subtitle">Tu primer mes de licencia es por nuestra cuenta. Sin compromisos, sin letra pequena.</p>
          </div>

          <div class="lv-pricing-layout" data-lv-reveal>
            <!-- ── LEFT COLUMN: Modules ── -->
            <div class="lv-pricing-modules">

              <!-- A1: Licencia App -->
              <div class="lv-base-module">
                <div class="lv-base-module-header">
                  <div class="lv-base-module-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                  </div>
                  <div class="lv-base-module-title-wrap">
                    <div class="lv-base-module-name">Licencia App, Plan de Exito y Soluciones</div>
                    <div class="lv-base-module-price">
                      <span class="lv-base-module-amount">$${MONTHLY_BASE.toFixed(2)}</span><span class="lv-base-module-period"> / mes</span>
                    </div>
                  </div>
                  <span class="lv-free-badge">Mes 1 GRATIS</span>
                </div>
                <p class="lv-base-module-desc">El motor de tu restaurante. Acceso ilimitado a todas las vistas, soporte continuo, actualizaciones en la nube y copias de seguridad.</p>
              </div>

              <!-- A2: Setup Total -->
              <div class="lv-base-module">
                <div class="lv-base-module-header">
                  <div class="lv-base-module-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div class="lv-base-module-title-wrap">
                    <div class="lv-base-module-name">Setup Total (Puesta en Marcha)</div>
                    <div class="lv-base-module-price">
                      <span class="lv-base-module-amount">$${SETUP_COST.toFixed(2)}</span><span class="lv-base-module-period"> unico</span>
                    </div>
                  </div>
                </div>
                <p class="lv-base-module-desc">Inversion unica de implementacion. Sin sorpresas, sin costos ocultos. Incluye:</p>
                <div class="lv-base-module-bullets">
                  ${['Configuracion de arquitectura y roles del sistema', 'Migracion y digitalizacion completa de tu menu', 'Auditoria e integracion de hardware', 'Capacitacion de todo tu equipo'].map(b => `
                    <div class="lv-base-module-bullet">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>${b}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="lv-base-module-tag">Incluido</div>
              </div>

              <!-- B: Hardware Trust Badge -->
              <div class="lv-trust-badge">
                <div class="lv-trust-badge-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </div>
                <div class="lv-trust-badge-content">
                  <div class="lv-trust-badge-title">Transparencia Total en Hardware</div>
                  <p class="lv-trust-badge-text">Nuestro negocio es el software, no revender aparatos. Operamos con cero comisiones ocultas sobre el hardware. Necesitaras tablets para operar, pero las impresoras son opcionales (nuestro sistema KDS elimina el papel). Te asesoramos y gestionamos la compra pasandote los links directos para que compres al costo real del mercado, sin intermediarios.</p>
                </div>
              </div>

              <!-- C: Additional Services -->
              <div class="lv-addons-section">
                <div class="lv-addons-title">Servicios Adicionales</div>
                <div class="lv-addons-subtitle">Potencia tu sistema con estos modulos opcionales.</div>

                ${ADDONS.map(addon => `
                  <label class="lv-addon-item" data-addon="${addon.id}">
                    <div class="lv-toggle">
                      <input type="checkbox" class="lv-addon-toggle" data-price="${addon.price}" data-type="${addon.type}" data-addon-id="${addon.id}">
                      <span class="lv-toggle-track"></span>
                    </div>
                    <div class="lv-addon-info">
                      <div class="lv-addon-name">${addon.name}</div>
                      <div class="lv-addon-desc">${addon.desc}</div>
                    </div>
                    <div class="lv-addon-price-wrap">
                      <span class="lv-addon-price">+$${addon.price.toFixed(2)}</span>
                      <span class="lv-addon-price-type">${addon.type === 'once' ? 'unico' : '/ mes'}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- ── RIGHT COLUMN: Floating Receipt ── -->
            <div class="lv-pricing-receipt">
              <div class="lv-receipt-card">
                <div class="lv-receipt-header">Tu Inversion</div>

                <div class="lv-receipt-lines" id="lv-receipt-lines">
                  <div class="lv-receipt-line">
                    <span>Setup Total</span>
                    <span class="lv-receipt-line-price">$${SETUP_COST.toFixed(2)}</span>
                  </div>
                  <div class="lv-receipt-line lv-receipt-line--free">
                    <span>Licencia Mes 1</span>
                    <span class="lv-receipt-line-price"><s class="lv-receipt-strikethrough">$${MONTHLY_BASE.toFixed(2)}</s> $0.00</span>
                  </div>
                </div>

                <div class="lv-receipt-divider"></div>

                <div class="lv-receipt-total">
                  <span class="lv-receipt-total-label">Total a Pagar Hoy</span>
                  <span class="lv-receipt-total-amount" id="lv-total-hoy">$${SETUP_COST.toFixed(2)}</span>
                </div>

                <div class="lv-receipt-divider"></div>

                <div class="lv-receipt-monthly">
                  <div class="lv-receipt-monthly-row">
                    <span class="lv-receipt-monthly-label">Mensualidad</span>
                    <span class="lv-receipt-monthly-amount" id="lv-mensualidad">$${MONTHLY_BASE.toFixed(2)}</span>
                  </div>
                  <div class="lv-receipt-monthly-note">A partir del Mes 2</div>
                </div>

                <button class="lv-receipt-cta" id="lv-receipt-cta">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Continuar al Pago</span>
                </button>
              </div>
            </div>
          </div>

        </section>

        <!-- ═══ SECTION 4: PAYMENT ═══ -->
        <section class="lv-section lv-payment" id="lv-sec-payment">
          <div data-lv-reveal>
            <div class="lv-section-tag">Metodo de Pago</div>
            <h2 class="lv-section-title">Elige Como Pagar</h2>
            <p class="lv-section-subtitle">
              Acepta esta propuesta y da el primer paso hacia la transformacion digital de tu restaurante.
            </p>
          </div>
          <div class="lv-payment-buttons" data-lv-reveal>
            <button class="lv-pay-btn lv-pay-btn--tarjeta" id="lv-pay-tarjeta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span>Pagar con Tarjeta</span>
            </button>
            <button class="lv-pay-btn lv-pay-btn--alt" id="lv-pay-yappy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Yappy / ACH</span>
            </button>
          </div>
        </section>

        <!-- Navigation Bar -->
        <nav class="lv-nav" id="lv-nav">
          <button class="lv-nav-btn" id="lv-nav-prev" aria-label="Anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="lv-nav-dots" id="lv-nav-dots">
            <button class="lv-nav-dot active" data-sec="0" aria-label="Hero"></button>
            <button class="lv-nav-dot" data-sec="1" aria-label="Roles"></button>
            <button class="lv-nav-dot" data-sec="2" aria-label="Precios"></button>
            <button class="lv-nav-dot" data-sec="3" aria-label="Pago"></button>
          </div>
          <button class="lv-nav-btn" id="lv-nav-next" aria-label="Siguiente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </nav>

        <footer class="lv-footer">Desarrollado por Acacio Malave</footer>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  //  SHIELD ASSEMBLY ANIMATION (spring physics)
  // ═══════════════════════════════════════════════════════════════

  _playShieldAssembly(svgEl, onComplete) {
    const fragments = svgEl.querySelectorAll('.lv-shield-fragment');
    const springs = [];

    fragments.forEach((frag, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 180;
      springs.push({
        el: frag,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: (Math.random() - 0.5) * 400,
        vx: 0, vy: 0, vr: 0,
        opacity: 0,
        delay: i * 55,
        started: false,
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
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += s.vr * dt;
        s.opacity = Math.min(1, s.opacity + dt * 5);

        s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.r.toFixed(1)}deg)`;
        s.el.style.opacity = s.opacity.toFixed(2);

        if (Math.abs(s.x) > 0.3 || Math.abs(s.y) > 0.3 || Math.abs(s.r) > 0.3) {
          allSettled = false;
        }
      }

      if (allSettled) {
        fragments.forEach(f => { f.style.transform = ''; f.style.opacity = '1'; });
        svgEl.classList.add('lv-shield--assembled');
        setTimeout(() => onComplete && onComplete(), 350);
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  async _playInlineShieldEntry() {
    const overlay = this.container.querySelector('#lv-shield-inline');
    if (!overlay) return;

    overlay.style.display = 'flex';
    const svgEl = overlay.querySelector('.lv-shield-svg');
    const scanline = overlay.querySelector('#lv-shield-scanline');

    await new Promise(resolve => {
      this._playShieldAssembly(svgEl, () => {
        scanline.classList.add('active');
        this._spawnShieldParticles(overlay.querySelector('#lv-shield-particles'));
        resolve();
      });
    });

    await this._wait(600);
    overlay.classList.add('lv-shield-overlay--dissolving');
    await this._wait(700);
    overlay.style.display = 'none';
  }

  _spawnShieldParticles(container) {
    if (!container) return;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('div');
      p.className = 'lv-shield-particle';
      const angle = (Math.PI * 2 / 16) * i;
      const dist = 30 + Math.random() * 40;
      p.style.left = `${50 + Math.cos(angle) * 20}%`;
      p.style.top = `${50 + Math.sin(angle) * 20}%`;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      p.style.animationDelay = `${Math.random() * 0.3}s`;
      container.appendChild(p);
      requestAnimationFrame(() => p.classList.add('active'));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  SCROLL REVEAL (IntersectionObserver)
  // ═══════════════════════════════════════════════════════════════

  _initScrollAnimations() {
    const els = this.container.querySelectorAll('[data-lv-reveal], [data-lv-reveal-stagger]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lv-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
    this._observers.push(observer);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SECTION TRACKER (nav dots + floating CTA)
  // ═══════════════════════════════════════════════════════════════

  _initSectionTracker() {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = this._sections.indexOf(entry.target);
          if (idx >= 0) {
            this._currentSection = idx;
            this._updateNavDots(idx);
            this._updateFloatingCTA(idx);
          }
        }
      });
    }, { threshold: 0.4 });

    this._sections.forEach(sec => sectionObserver.observe(sec));
    this._observers.push(sectionObserver);
  }

  _updateNavDots(idx) {
    const dots = this.container.querySelectorAll('.lv-nav-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  _updateFloatingCTA(idx) {
    const cta = this.container.querySelector('#lv-float-cta');
    if (!cta) return;
    // Show after hero, hide when on pricing or payment
    cta.classList.toggle('visible', idx === 1);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRICING CALCULATOR
  // ═══════════════════════════════════════════════════════════════

  _recalcTotal() {
    let totalHoy = SETUP_COST;
    let mensualidad = MONTHLY_BASE;
    const addonLines = [];

    this.container.querySelectorAll('.lv-addon-toggle:checked').forEach(cb => {
      const price = parseFloat(cb.dataset.price);
      const type = cb.dataset.type;
      const id = cb.dataset.addonId;
      const addon = ADDONS.find(a => a.id === id);
      if (type === 'once') {
        totalHoy += price;
        addonLines.push({ name: addon?.name || id, price, type });
      }
      if (type === 'monthly') {
        mensualidad += price;
        addonLines.push({ name: addon?.name || id, price, type });
      }
    });

    // Update desktop receipt
    const linesEl = this.container.querySelector('#lv-receipt-lines');
    if (linesEl) {
      let html = `
        <div class="lv-receipt-line"><span>Setup Total</span><span class="lv-receipt-line-price">$${SETUP_COST.toFixed(2)}</span></div>
        <div class="lv-receipt-line lv-receipt-line--free"><span>Licencia Mes 1</span><span class="lv-receipt-line-price"><s class="lv-receipt-strikethrough">$${MONTHLY_BASE.toFixed(2)}</s> $0.00</span></div>
      `;
      addonLines.forEach(a => {
        html += `<div class="lv-receipt-line lv-receipt-line--addon"><span>${a.name}</span><span class="lv-receipt-line-price">+$${a.price.toFixed(2)}${a.type === 'monthly' ? '/mes' : ''}</span></div>`;
      });
      linesEl.innerHTML = html;
    }

    // Update totals
    const animateEl = (sel, val) => {
      const el = this.container.querySelector(sel);
      if (el) { el.textContent = `$${val.toFixed(2)}`; el.classList.add('updating'); setTimeout(() => el.classList.remove('updating'), 300); }
    };
    animateEl('#lv-total-hoy', totalHoy);
    animateEl('#lv-mensualidad', mensualidad);

    // Update mobile receipt (appended to body, not in container)
    const mHoy = document.querySelector('#lv-mobile-total-hoy');
    const mMens = document.querySelector('#lv-mobile-mensualidad');
    if (mHoy) mHoy.textContent = `$${totalHoy.toFixed(2)}`;
    if (mMens) mMens.textContent = `$${mensualidad.toFixed(2)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAYMENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  _handlePagarTarjeta() {
    let totalHoy = SETUP_COST;
    this.container.querySelectorAll('.lv-addon-toggle:checked').forEach(cb => {
      if (cb.dataset.type === 'once') totalHoy += parseFloat(cb.dataset.price);
    });
    this._showCardPaymentModal(totalHoy);
  }

  // ── Card Payment Modal ──────────────────────────────────────
  _showCardPaymentModal(amount) {
    document.querySelector('.lv-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lv-modal-overlay';
    overlay.innerHTML = `
      <div class="lv-modal lv-card-modal">
        <div class="lv-card-modal-header">
          <div class="lv-card-modal-amount-label">Total a pagar</div>
          <div class="lv-card-modal-amount">$${amount.toFixed(2)}</div>
        </div>

        <div class="lv-card-brand" id="lv-card-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--purple-400)" stroke-width="1.5">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>

        <div class="lv-card-error" id="lv-card-error" style="display:none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span id="lv-card-error-text"></span>
        </div>

        <form class="lv-card-form" id="lv-card-form" autocomplete="on">
          <div class="lv-card-field">
            <label class="lv-card-label" for="lv-cc-name">Nombre del titular</label>
            <input class="lv-card-input" type="text" id="lv-cc-name"
                   name="cc-name" autocomplete="cc-name"
                   placeholder="Como aparece en la tarjeta" required>
          </div>
          <div class="lv-card-field">
            <label class="lv-card-label" for="lv-cc-number">Numero de tarjeta</label>
            <input class="lv-card-input lv-card-input--number" type="text" id="lv-cc-number"
                   name="cc-number" autocomplete="cc-number" inputmode="numeric"
                   placeholder="0000 0000 0000 0000" maxlength="19" required>
          </div>
          <div class="lv-card-row">
            <div class="lv-card-field lv-card-field--half">
              <label class="lv-card-label" for="lv-cc-exp">Vencimiento</label>
              <input class="lv-card-input" type="text" id="lv-cc-exp"
                     name="cc-exp" autocomplete="cc-exp" inputmode="numeric"
                     placeholder="MM/YY" maxlength="5" required>
            </div>
            <div class="lv-card-field lv-card-field--half">
              <label class="lv-card-label" for="lv-cc-csc">CVV</label>
              <input class="lv-card-input" type="text" id="lv-cc-csc"
                     name="cc-csc" autocomplete="cc-csc" inputmode="numeric"
                     placeholder="123" maxlength="4" required>
            </div>
          </div>
          <button class="lv-card-submit" type="submit" id="lv-card-submit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span id="lv-card-submit-text">Pagar $${amount.toFixed(2)}</span>
          </button>
        </form>
        <button class="lv-card-cancel" id="lv-card-cancel">Cancelar</button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('lv-modal-overlay--visible'));
    this._attachCardModalListeners(overlay, amount);
  }

  _attachCardModalListeners(overlay, amount) {
    const form = overlay.querySelector('#lv-card-form');
    const numberInput = overlay.querySelector('#lv-cc-number');
    const expInput = overlay.querySelector('#lv-cc-exp');
    const cvvInput = overlay.querySelector('#lv-cc-csc');
    const cancelBtn = overlay.querySelector('#lv-card-cancel');

    numberInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      const brand = this._detectCardBrand(val);
      if (brand === 'AMEX') {
        val = val.substring(0, 15);
        val = val.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (m, g1, g2, g3) => {
          let r = g1; if (g2) r += ' ' + g2; if (g3) r += ' ' + g3; return r;
        });
      } else {
        val = val.substring(0, 16);
        val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      }
      e.target.value = val;
      this._updateCardBrandIcon(overlay, brand);
      cvvInput.maxLength = brand === 'AMEX' ? 4 : 3;
    });

    expInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
      e.target.value = val;
    });

    cvvInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeModal(overlay);
    });
    cancelBtn.addEventListener('click', () => this._closeModal(overlay));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._processCardPayment(overlay, amount);
    });
  }

  _detectCardBrand(number) {
    const n = number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'VISA';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'MASTERCARD';
    if (/^3[47]/.test(n)) return 'AMEX';
    return '';
  }

  _updateCardBrandIcon(overlay, brand) {
    const el = overlay.querySelector('#lv-card-brand');
    const colors = { VISA: '#1A1F71', MASTERCARD: '#EB001B', AMEX: '#006FCF' };
    const labels = { VISA: 'Visa', MASTERCARD: 'Mastercard', AMEX: 'American Express' };
    el.innerHTML = brand
      ? `<span class="lv-card-brand-text" style="color:${colors[brand]}">${labels[brand]}</span>`
      : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--purple-400)" stroke-width="1.5">
           <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
         </svg>`;
  }

  async _processCardPayment(overlay, amount) {
    const submitBtn = overlay.querySelector('#lv-card-submit');
    const submitText = overlay.querySelector('#lv-card-submit-text');
    const errorEl = overlay.querySelector('#lv-card-error');

    const cardNumber = overlay.querySelector('#lv-cc-number').value.replace(/\s/g, '');
    const expRaw = overlay.querySelector('#lv-cc-exp').value;
    const cvv = overlay.querySelector('#lv-cc-csc').value;
    const fullName = overlay.querySelector('#lv-cc-name').value.trim();

    if (cardNumber.length < 13) { this._showCardError(overlay, 'Numero de tarjeta invalido'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expRaw)) { this._showCardError(overlay, 'Fecha de vencimiento invalida'); return; }
    if (cvv.length < 3) { this._showCardError(overlay, 'CVV invalido'); return; }
    if (!fullName) { this._showCardError(overlay, 'Ingresa el nombre del titular'); return; }

    const [expMonth, expYear] = expRaw.split('/');
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'ACCIOS';
    const cardType = this._detectCardBrand(cardNumber) || 'VISA';

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitText.textContent = 'Procesando...';
    submitBtn.classList.add('lv-card-submit--loading');

    try {
      const res = await fetch(apiUrl('/api/paguelofacil-charge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: 'La Vaina — Sistema de Gestion de Restaurante',
          email: 'cobro@accios.app',
          phone: '68204698',
          cardNumber, expMonth, expYear: '20' + expYear,
          cvv, firstName, lastName, cardType
        }),
      });

      const data = await res.json();

      if (data.success) {
        this._closeModal(overlay);
        this._showConfirmation();
      } else {
        this._showCardError(overlay, data.message || 'Pago rechazado. Intenta con otra tarjeta.');
        submitBtn.disabled = false;
        submitText.textContent = `Reintentar $${amount.toFixed(2)}`;
        submitBtn.classList.remove('lv-card-submit--loading');
      }
    } catch (err) {
      console.error('Card payment error:', err);
      this._showCardError(overlay, 'Error de conexion. Intenta de nuevo.');
      submitBtn.disabled = false;
      submitText.textContent = `Reintentar $${amount.toFixed(2)}`;
      submitBtn.classList.remove('lv-card-submit--loading');
    }
  }

  _showCardError(overlay, message) {
    const errorEl = overlay.querySelector('#lv-card-error');
    const errorText = overlay.querySelector('#lv-card-error-text');
    errorText.textContent = message;
    errorEl.style.display = 'flex';
    errorEl.classList.remove('lv-card-error--shake');
    requestAnimationFrame(() => errorEl.classList.add('lv-card-error--shake'));
  }

  _showYappyAchModal() {
    document.querySelector('.lv-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lv-modal-overlay';
    overlay.innerHTML = `
      <div class="lv-modal">
        <h3 class="lv-modal-title">Metodo de Transferencia</h3>
        <div class="lv-modal-options">
          <button class="lv-modal-option" data-method="yappy">
            <div class="lv-modal-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            Yappy
          </button>
          <button class="lv-modal-option" data-method="ach">
            <div class="lv-modal-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            ACH
          </button>
        </div>
        <div class="lv-modal-details" id="lv-modal-details" style="display:none;"></div>
        <div class="lv-modal-actions" id="lv-modal-actions" style="display:none;">
          <button class="lv-modal-btn lv-modal-btn--secondary" id="lv-modal-exit">Salir</button>
          <button class="lv-modal-btn lv-modal-btn--primary" id="lv-modal-confirm">Ya realice el pago</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('lv-modal-overlay--visible'));

    // Method selection
    overlay.querySelectorAll('.lv-modal-option').forEach(opt => {
      opt.addEventListener('click', () => {
        overlay.querySelectorAll('.lv-modal-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this._showTransferDetails(overlay, opt.dataset.method);
      });
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeModal(overlay);
    });
  }

  _showTransferDetails(overlay, method) {
    const detailsEl = overlay.querySelector('#lv-modal-details');
    const actionsEl = overlay.querySelector('#lv-modal-actions');

    if (method === 'yappy') {
      detailsEl.innerHTML = `
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Transferir a</span>
          <span class="lv-modal-detail-value">Yappy</span>
        </div>
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Numero</span>
          <div style="display:flex;align-items:center;">
            <span class="lv-modal-detail-value" id="lv-yappy-num">+507 6820-4698</span>
            <button class="lv-modal-copy" data-copy="+50768204698" title="Copiar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">A nombre de</span>
          <span class="lv-modal-detail-value">Acacio Malave</span>
        </div>
      `;
    } else {
      detailsEl.innerHTML = `
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Banco</span>
          <span class="lv-modal-detail-value">Banco General</span>
        </div>
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Tipo de cuenta</span>
          <span class="lv-modal-detail-value">Corriente</span>
        </div>
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Numero</span>
          <div style="display:flex;align-items:center;">
            <span class="lv-modal-detail-value" id="lv-ach-num">04-12-01-123456-7</span>
            <button class="lv-modal-copy" data-copy="04120112345677" title="Copiar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
        <div class="lv-modal-detail-row">
          <span class="lv-modal-detail-label">Titular</span>
          <span class="lv-modal-detail-value">Acacio Malave</span>
        </div>
      `;
    }

    detailsEl.style.display = 'block';
    actionsEl.style.display = 'flex';

    // Exit button
    overlay.querySelector('#lv-modal-exit')?.addEventListener('click', () => {
      this._closeModal(overlay);
    });

    // Confirm button
    overlay.querySelector('#lv-modal-confirm')?.addEventListener('click', () => {
      this._closeModal(overlay);
      this._showConfirmation();
    });

    // Copy buttons
    overlay.querySelectorAll('.lv-modal-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.copy;
        navigator.clipboard?.writeText(text);
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
      });
    });
  }

  _closeModal(overlay) {
    overlay.classList.remove('lv-modal-overlay--visible');
    setTimeout(() => overlay.remove(), 350);
  }

  // ═══════════════════════════════════════════════════════════════
  //  CONFIRMATION (post-payment)
  // ═══════════════════════════════════════════════════════════════

  _showConfirmation() {
    document.querySelector('.lv-confirm-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lv-confirm-overlay';
    overlay.innerHTML = `
      <div class="lv-confirm-shield" id="lv-confirm-shield">
        <div class="lv-shield-container">
          ${SHIELD_SVG.replace('id="lv-shield-svg"', 'id="lv-confirm-svg"')}
          <div class="lv-shield-particles" id="lv-confirm-particles"></div>
        </div>
      </div>
      <div class="lv-confirm-message" id="lv-confirm-message">
        <div class="lv-confirm-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 class="lv-confirm-title">Pago en Verificacion</h2>
        <p class="lv-confirm-text">
          Estamos realizando las comprobaciones necesarias. Nuestro equipo se comunicara contigo muy pronto para brindarte el proximo paso y comenzar a construir juntos el futuro digital de tu restaurante.
        </p>
        <button class="lv-confirm-btn" id="lv-confirm-back">Volver al Inicio</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Play shield assembly
    const svgEl = overlay.querySelector('#lv-confirm-svg');
    this._playShieldAssembly(svgEl, () => {
      this._spawnShieldParticles(overlay.querySelector('#lv-confirm-particles'));
      setTimeout(() => {
        const msg = overlay.querySelector('#lv-confirm-message');
        if (msg) msg.classList.add('visible');
      }, 300);
    });

    overlay.querySelector('#lv-confirm-back')?.addEventListener('click', () => {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        window.location.hash = '#home';
      }, 500);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  FEATURES MODAL (144 funcionalidades)
  // ═══════════════════════════════════════════════════════════════

  _showFeaturesModal() {
    document.querySelector('.lv-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lv-modal-overlay';
    overlay.innerHTML = `
      <div class="lv-modal" style="max-height:80vh;overflow-y:auto;">
        <h3 class="lv-modal-title">144+ Funcionalidades Identificadas</h3>
        <p style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;margin-bottom:var(--space-4);line-height:1.6;">
          Hemos mapeado mas de 144 funcionalidades criticas para la gestion integral de tu restaurante. Este es un resumen de las categorias principales:
        </p>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-5);">
          ${[
            ['Gestion de Menu', '18 funcionalidades — Menu digital, categorias, modificadores, fotos, precios por horario...'],
            ['Sistema de Ordenes', '22 funcionalidades — Ordenes en mesa, para llevar, delivery, split de cuentas...'],
            ['Cocina & KDS', '14 funcionalidades — Display digital, ruteo por estacion, alertas, tiempos...'],
            ['Punto de Venta', '20 funcionalidades — Cobros, propinas, descuentos, facturas, corte Z...'],
            ['Inventario', '16 funcionalidades — Stock, recetas, costos, ordenes de compra, merma...'],
            ['Reportes & BI', '15 funcionalidades — Ventas, productos top, horas pico, proyecciones...'],
            ['Marketing', '12 funcionalidades — Lealtad, cupones, push notifications, resenas...'],
            ['RRHH & Personal', '10 funcionalidades — Turnos, asistencia, nomina, permisos...'],
            ['Inteligencia Artificial', '8 funcionalidades — Prediccion de demanda, optimizacion de menu, chatbot...'],
            ['Integraciones', '9 funcionalidades — PagueloFacil, Yappy, delivery apps, contabilidad...'],
          ].map(([cat, desc]) => `
            <div style="padding:var(--space-3);background:rgba(124,58,237,0.05);border:1px solid rgba(124,58,237,0.1);border-radius:var(--radius-md);">
              <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-primary);margin-bottom:2px;">${cat}</div>
              <div style="font-size:var(--text-xs);color:var(--text-dim);line-height:1.5;">${desc}</div>
            </div>
          `).join('')}
        </div>
        <div class="lv-modal-actions">
          <button class="lv-modal-btn lv-modal-btn--primary" id="lv-features-close" style="flex:1;">Entendido</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('lv-modal-overlay--visible'));

    overlay.querySelector('#lv-features-close')?.addEventListener('click', () => {
      this._closeModal(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeModal(overlay);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════

  _attachListeners() {
    // Back button
    this.container.querySelector('#lv-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // Floating CTA → scroll to pricing
    this.container.querySelector('#lv-float-cta')?.addEventListener('click', () => {
      this.container.querySelector('#lv-sec-pricing')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Nav prev/next
    this.container.querySelector('#lv-nav-prev')?.addEventListener('click', () => {
      const prev = Math.max(0, this._currentSection - 1);
      this._sections[prev]?.scrollIntoView({ behavior: 'smooth' });
    });

    this.container.querySelector('#lv-nav-next')?.addEventListener('click', () => {
      const next = Math.min(this._sections.length - 1, this._currentSection + 1);
      this._sections[next]?.scrollIntoView({ behavior: 'smooth' });
    });

    // Nav dots
    this.container.querySelectorAll('.lv-nav-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.sec);
        this._sections[idx]?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Role tabs
    this.container.querySelectorAll('.lv-role-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.lv-role-tab').forEach(t => t.classList.remove('active'));
        this.container.querySelectorAll('.lv-role-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = this.container.querySelector(`[data-role-panel="${tab.dataset.role}"]`);
        if (panel) panel.classList.add('active');
      });
    });

    // Pricing addon toggles
    this.container.querySelectorAll('.lv-addon-toggle').forEach(cb => {
      cb.addEventListener('change', () => this._recalcTotal());
    });

    // Receipt CTA → scroll to payment
    this.container.querySelector('#lv-receipt-cta')?.addEventListener('click', () => {
      this.container.querySelector('#lv-sec-payment')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Mobile sticky receipt bar (appended to body to escape overflow:hidden)
    document.querySelector('#lv-mobile-receipt')?.remove();
    const mobileReceipt = document.createElement('div');
    mobileReceipt.className = 'lv-mobile-receipt';
    mobileReceipt.id = 'lv-mobile-receipt';
    mobileReceipt.innerHTML = `
      <div class="lv-mobile-receipt-summary">
        <div class="lv-mobile-receipt-col">
          <span class="lv-mobile-receipt-label">Hoy</span>
          <span class="lv-mobile-receipt-value" id="lv-mobile-total-hoy">$${SETUP_COST.toFixed(2)}</span>
        </div>
        <div class="lv-mobile-receipt-col">
          <span class="lv-mobile-receipt-label">Mensual</span>
          <span class="lv-mobile-receipt-value" id="lv-mobile-mensualidad">$${MONTHLY_BASE.toFixed(2)}</span>
        </div>
        <button class="lv-mobile-receipt-btn" id="lv-mobile-receipt-btn">Pagar</button>
      </div>
    `;
    document.body.appendChild(mobileReceipt);
    this._mobileReceipt = mobileReceipt;

    document.querySelector('#lv-mobile-receipt-btn')?.addEventListener('click', () => {
      this.container.querySelector('#lv-sec-payment')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Payment buttons
    this.container.querySelector('#lv-pay-tarjeta')?.addEventListener('click', () => {
      this._handlePagarTarjeta();
    });

    this.container.querySelector('#lv-pay-yappy')?.addEventListener('click', () => {
      this._showYappyAchModal();
    });

    // "Ver más funcionalidades" buttons
    this.container.querySelectorAll('[data-action="show-features"]').forEach(btn => {
      btn.addEventListener('click', () => this._showFeaturesModal());
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
