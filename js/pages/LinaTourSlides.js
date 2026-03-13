import userAuth from '../services/userAuth.js';

/* ─────────────────────────────────────────────────────────
 *  LINA TOUR × ACCIOS CORE — Presentation Slides
 *  Futuristic travel-agency deck with nautical accents
 * ───────────────────────────────────────────────────────── */

export class LinaTourSlides {
  constructor(container, currentUser) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this._current = 0;
    this._total = 0;
    this._touchStartX = 0;
    this._touchStartY = 0;
  }

  /* ── Render ────────────────────────────────────────────── */
  async render() {
    // Try to get Lina Tour logo from Firebase
    let logoUrl = '';
    try {
      const biz = await userAuth.getBusiness('lina-tour');
      logoUrl = biz?.logo || '';
    } catch (_) { /* no logo fallback */ }

    this.container.innerHTML = `
    <section class="lt-deck">
      <!-- Navigation bar -->
      <nav class="lt-nav">
        <button class="lt-nav-back" id="lt-back-home" title="Volver al ecosistema">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="lt-nav-brand">
          ${logoUrl ? `<img src="${logoUrl}" class="lt-nav-logo" alt="Lina Tour" />` : ''}
          <span class="lt-nav-title">LINA TOUR</span>
          <span class="lt-nav-sep">×</span>
          <span class="lt-nav-sub">ROYAL CARIBBEAN</span>
        </div>
        <div class="lt-nav-progress">
          <span class="lt-nav-slide-num" id="lt-slide-num">01</span>
          <span class="lt-nav-slide-sep">/</span>
          <span class="lt-nav-slide-total" id="lt-slide-total">10</span>
        </div>
      </nav>

      <!-- Progress bar -->
      <div class="lt-progress-track">
        <div class="lt-progress-fill" id="lt-progress-fill"></div>
      </div>

      <!-- Slides container -->
      <div class="lt-slides" id="lt-slides">

        <!-- ═══════ SLIDE 1: COVER ═══════ -->
        <div class="lt-slide lt-slide--cover" data-slide="0">
          <div class="lt-cover-bg">
            <div class="lt-cover-waves"></div>
            <div class="lt-cover-grid"></div>
          </div>
          <div class="lt-slide-inner">
            <div class="lt-cover-badge">ACCIOS CORE — Technology Partner</div>
            <h1 class="lt-cover-title">
              <span class="lt-gradient-cruise">Plataforma Digital</span>
            </h1>
            <h2 class="lt-cover-sub">Lina Tour × Royal Caribbean</h2>
            <p class="lt-cover-tagline">Entendamos el proyecto antes de hablar de números</p>
            <div class="lt-cover-meta">
              <span>Preparado para: <strong>Lina Tour</strong></span>
              <span>Ciudad de Panamá — 2026</span>
            </div>
            <button class="lt-cover-cta" id="lt-start-btn">
              Comenzar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ═══════ SLIDE 2: PUNTO DE PARTIDA ═══════ -->
        <div class="lt-slide" data-slide="1">
          <div class="lt-slide-inner">
            <div class="lt-section-num">01</div>
            <h2 class="lt-slide-title">El Punto de Partida</h2>
            <p class="lt-slide-lead">Lina Tour tiene una oportunidad real. Y un proceso que la frena.</p>
            <div class="lt-card-glass lt-fade-up">
              <p>Usted tiene la concesión de Royal Caribbean en Panamá — eso es un activo valioso. Pero hoy, operar esa concesión depende de procesos manuales, datos en múltiples lugares, y ninguna visibilidad real del negocio en tiempo real.</p>
            </div>
            <h3 class="lt-slide-h3">¿Cómo funciona el negocio hoy?</h3>
            <div class="lt-process-steps lt-fade-up">
              <div class="lt-step"><span class="lt-step-num">1</span><span>Entra al sistema de RC (Cruising Power)</span></div>
              <div class="lt-step"><span class="lt-step-num">2</span><span>Busca disponibilidad y precios manualmente</span></div>
              <div class="lt-step"><span class="lt-step-num">3</span><span>Copia o anota esa información</span></div>
              <div class="lt-step"><span class="lt-step-num">4</span><span>Pasa datos a Umbrella o una hoja de cálculo</span></div>
              <div class="lt-step"><span class="lt-step-num">5</span><span>Genera cotización en otro programa</span></div>
              <div class="lt-step"><span class="lt-step-num">6</span><span>Hace seguimiento de cada reserva por separado</span></div>
              <div class="lt-step"><span class="lt-step-num">7</span><span>Arma el resumen de ventas y comisiones a mano</span></div>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 3: PAIN TABLE ═══════ -->
        <div class="lt-slide" data-slide="2">
          <div class="lt-slide-inner">
            <div class="lt-section-num">01</div>
            <h2 class="lt-slide-title">Lo Que Le Cuesta</h2>
            <p class="lt-slide-lead">El proceso manual tiene costos invisibles que impiden el crecimiento.</p>
            <div class="lt-table-wrap lt-fade-up">
              <table class="lt-table">
                <thead><tr><th>Problema actual</th><th>Lo que le cuesta</th></tr></thead>
                <tbody>
                  <tr><td>Ingreso manual de datos</td><td>Horas de trabajo que podrían dedicarse a vender</td></tr>
                  <tr><td>Información dispersa</td><td>Decisiones lentas, sin visibilidad real del negocio</td></tr>
                  <tr><td>Sin KPIs en tiempo real</td><td>No sabe si está creciendo o estancado hasta que es tarde</td></tr>
                  <tr><td>Comisiones sin seguimiento</td><td>Riesgo de cobrar menos de lo que RC le debe</td></tr>
                  <tr><td>Sin historial centralizado</td><td>Cada consulta requiere buscar en múltiples sistemas</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 4: ROYAL CARIBBEAN API ═══════ -->
        <div class="lt-slide" data-slide="3">
          <div class="lt-slide-inner">
            <div class="lt-section-num">02</div>
            <h2 class="lt-slide-title">Lo Que Royal Caribbean Pide</h2>
            <p class="lt-slide-lead">Antes de hablar de soluciones, hay que entender la realidad del proceso.</p>
            <div class="lt-two-col">
              <div class="lt-card-glass lt-fade-up">
                <h4 class="lt-card-label lt-color-a">Camino A — Intermediario (TravelTek)</h4>
                <ul class="lt-list">
                  <li>Setup: $2,000 – $8,000 USD (pago único)</li>
                  <li>Suscripción: $500 – $2,500/mes</li>
                  <li>Lina Tour contrata directo con TravelTek</li>
                  <li>Inicio en 2–4 semanas</li>
                  <li>Dependencia de terceros</li>
                </ul>
              </div>
              <div class="lt-card-glass lt-fade-up" style="animation-delay: .15s">
                <h4 class="lt-card-label lt-color-b">Camino B — Certificación Directa RC</h4>
                <ul class="lt-list">
                  <li>Setup: $2,000 USD (pago único)</li>
                  <li>Suscripción: $600/mes</li>
                  <li>Conexión directa y permanente</li>
                  <li>Proceso: 6 a 10 semanas</li>
                  <li>Accios Core gestiona la certificación</li>
                  <li>Control total a largo plazo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 5: PATH COMPARISON ═══════ -->
        <div class="lt-slide" data-slide="4">
          <div class="lt-slide-inner">
            <div class="lt-section-num">02</div>
            <h2 class="lt-slide-title">Comparativa de Caminos</h2>
            <div class="lt-table-wrap lt-fade-up">
              <table class="lt-table lt-table--compare">
                <thead><tr><th></th><th class="lt-color-a">Camino A — TravelTek</th><th class="lt-color-b">Camino B — Directo RC</th></tr></thead>
                <tbody>
                  <tr><td>Velocidad de inicio</td><td>2–4 semanas</td><td>6–10 semanas</td></tr>
                  <tr><td>Costo mensual extra</td><td>$500–$2,500/mes</td><td class="lt-highlight">$600/mes</td></tr>
                  <tr><td>Costo de setup</td><td>$2,000–$8,000</td><td class="lt-highlight">$2,000</td></tr>
                  <tr><td>Dependencia de terceros</td><td>Sí</td><td class="lt-highlight">No</td></tr>
                  <tr><td>Control a largo plazo</td><td>Limitado</td><td class="lt-highlight">Total</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 6: LA SOLUCIÓN ═══════ -->
        <div class="lt-slide" data-slide="5">
          <div class="lt-slide-inner">
            <div class="lt-section-num">03</div>
            <h2 class="lt-slide-title">La Solución</h2>
            <p class="lt-slide-lead">Una plataforma propia que centraliza toda la operación de Lina Tour.</p>
            <div class="lt-features-grid">
              <div class="lt-feature-card lt-fade-up">
                <div class="lt-feature-icon">📊</div>
                <h4>Panel de KPIs</h4>
                <p>Ventas, reservas activas, comisiones pendientes. Todo en una pantalla.</p>
              </div>
              <div class="lt-feature-card lt-fade-up" style="animation-delay:.08s">
                <div class="lt-feature-icon">🚢</div>
                <h4>Catálogo RC</h4>
                <p>Itinerarios, cabinas y disponibilidad desde su propia plataforma.</p>
              </div>
              <div class="lt-feature-card lt-fade-up" style="animation-delay:.16s">
                <div class="lt-feature-icon">💰</div>
                <h4>Comisiones</h4>
                <p>Registra y calcula cuánto le corresponde por cada reserva.</p>
              </div>
              <div class="lt-feature-card lt-fade-up" style="animation-delay:.24s">
                <div class="lt-feature-icon">📁</div>
                <h4>Módulo Financiero</h4>
                <p>Ventas, pagos, saldos por cliente — todo ordenado y accesible.</p>
              </div>
              <div class="lt-feature-card lt-fade-up" style="animation-delay:.32s">
                <div class="lt-feature-icon">📄</div>
                <h4>Reportes</h4>
                <p>Genera reportes en PDF o Excel con un clic.</p>
              </div>
              <div class="lt-feature-card lt-fade-up" style="animation-delay:.40s">
                <div class="lt-feature-icon">👥</div>
                <h4>Usuarios y Roles</h4>
                <p>Cada persona tiene el acceso que le corresponde según su función.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 7: TIMELINE ═══════ -->
        <div class="lt-slide" data-slide="6">
          <div class="lt-slide-inner">
            <div class="lt-section-num">04</div>
            <h2 class="lt-slide-title">Tiempos del Proyecto</h2>
            <p class="lt-slide-lead">El desarrollo toma 9 semanas. La conexión RC corre en paralelo.</p>
            <div class="lt-timeline lt-fade-up">
              <div class="lt-timeline-phase">
                <div class="lt-timeline-bar" style="--phase-w: 11%"><span>1 sem</span></div>
                <div class="lt-timeline-info"><strong>Fase 1 — Descubrimiento</strong><br/>Entendemos su operación, flujos y requerimientos.</div>
              </div>
              <div class="lt-timeline-phase">
                <div class="lt-timeline-bar" style="--phase-w: 33%"><span>3 sem</span></div>
                <div class="lt-timeline-info"><strong>Fase 2 — Core</strong><br/>Panel de KPIs, módulo financiero, gestión de usuarios.</div>
              </div>
              <div class="lt-timeline-phase">
                <div class="lt-timeline-bar" style="--phase-w: 33%"><span>3 sem</span></div>
                <div class="lt-timeline-info"><strong>Fase 3 — Comisiones y Reportes</strong><br/>Motor de cálculo, exportables, historial de ventas.</div>
              </div>
              <div class="lt-timeline-phase">
                <div class="lt-timeline-bar" style="--phase-w: 22%"><span>2 sem</span></div>
                <div class="lt-timeline-info"><strong>Fase 4 — Integración</strong><br/>Conexión con RC, pruebas finales, lanzamiento.</div>
              </div>
            </div>
            <div class="lt-two-col lt-fade-up" style="margin-top: 2rem">
              <div class="lt-card-glass lt-card-sm">
                <h4 class="lt-color-a">Vía TravelTek</h4>
                <span class="lt-big-num">~11</span> semanas
              </div>
              <div class="lt-card-glass lt-card-sm">
                <h4 class="lt-color-b">Certificación Directa</h4>
                <span class="lt-big-num">~15-19</span> semanas
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 8: OPORTUNIDAD DE RED ═══════ -->
        <div class="lt-slide" data-slide="7">
          <div class="lt-slide-inner">
            <div class="lt-section-num">05</div>
            <h2 class="lt-slide-title">La Oportunidad Que Se Abre</h2>
            <p class="lt-slide-lead">Lina Tour no solo compra una plataforma. Puede entrar a un negocio nuevo.</p>
            <div class="lt-network-diagram lt-fade-up">
              <div class="lt-net-node lt-net-rc">ROYAL CARIBBEAN<br/><small>API Certificada</small></div>
              <div class="lt-net-line"></div>
              <div class="lt-net-node lt-net-ac">ACCIOS CORE<br/><small>Infraestructura Certificada</small></div>
              <div class="lt-net-branches">
                <div class="lt-net-branch">
                  <div class="lt-net-line-sm"></div>
                  <div class="lt-net-node lt-net-lt">LINA TOUR<br/><small>Cliente + Socio</small></div>
                </div>
                <div class="lt-net-branch">
                  <div class="lt-net-line-sm"></div>
                  <div class="lt-net-node lt-net-other">AGENCIA B<br/><small>Referida por LT</small></div>
                </div>
                <div class="lt-net-branch">
                  <div class="lt-net-line-sm"></div>
                  <div class="lt-net-node lt-net-other">AGENCIA C<br/><small>Referida por LT</small></div>
                </div>
              </div>
            </div>
            <div class="lt-table-wrap lt-table-sm lt-fade-up" style="margin-top: 1.5rem">
              <table class="lt-table">
                <thead><tr><th>Escenario</th><th>Agencias</th><th>Ingreso Lina Tour (24m)</th></tr></thead>
                <tbody>
                  <tr><td>Conservador</td><td>3</td><td class="lt-highlight">~$8,010</td></tr>
                  <tr><td>Realista</td><td>6</td><td class="lt-highlight">~$16,020</td></tr>
                  <tr><td>Optimista</td><td>12</td><td class="lt-highlight">~$32,040</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ═══════ SLIDE 9: PRÓXIMOS PASOS ═══════ -->
        <div class="lt-slide lt-slide--final" data-slide="8">
          <div class="lt-slide-inner">
            <div class="lt-section-num">06</div>
            <h2 class="lt-slide-title">Próximos Pasos</h2>
            <p class="lt-slide-lead">¿Cómo arrancamos?</p>
            <div class="lt-steps-final lt-fade-up">
              <div class="lt-final-step"><span class="lt-final-num">01</span><div><strong>Esperar respuesta de apisupport@rccl.com</strong><p>Confirmar acceso y disponibilidad de la API de Royal Caribbean.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">02</span><div><strong>Elegir el escenario</strong><p>Modelo de pago y camino de conexión RC.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">03</span><div><strong>Firma del contrato</strong><p>Formalizamos el acuerdo con todas las condiciones.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">04</span><div><strong>Pago inicial</strong><p>Licencia: 50% al iniciar. Socio Tec.: entrada acordada.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">05</span><div><strong>Arranca el desarrollo</strong><p>Accios Core inicia la Fase 1 esa misma semana.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">06</span><div><strong>Conexión RC en paralelo</strong><p>Iniciamos el proceso según el camino elegido.</p></div></div>
              <div class="lt-final-step"><span class="lt-final-num">07</span><div><strong>Entrega y activación</strong><p>Plataforma lista. Se activa la posibilidad de referidos.</p></div></div>
            </div>
            <div class="lt-final-footer lt-fade-up">
              <p class="lt-final-tagline">Accios Core construye plataformas digitales para negocios reales en Panamá.</p>
              <p class="lt-final-city">Ciudad de Panamá — 2026</p>
              <p class="lt-final-conf">Documento confidencial preparado exclusivamente para Lina Tour</p>
            </div>
          </div>
        </div>

      </div><!-- /lt-slides -->

      <!-- Slide controls -->
      <div class="lt-controls">
        <button class="lt-ctrl-btn" id="lt-prev" title="Anterior" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="lt-slide-dots" id="lt-dots"></div>
        <button class="lt-ctrl-btn" id="lt-next" title="Siguiente">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </section>
    `;

    this._initSlides();
  }

  /* ── Slide engine ──────────────────────────────────────── */
  _initSlides() {
    const slides = this.container.querySelectorAll('.lt-slide');
    this._total = slides.length;
    this._current = 0;

    // Build dots
    const dotsWrap = this.container.querySelector('#lt-dots');
    if (dotsWrap) {
      for (let i = 0; i < this._total; i++) {
        const dot = document.createElement('button');
        dot.className = 'lt-dot' + (i === 0 ? ' lt-dot--active' : '');
        dot.dataset.index = i;
        dot.addEventListener('click', () => this._goTo(i));
        dotsWrap.appendChild(dot);
      }
    }

    // Set initial total
    const totalEl = this.container.querySelector('#lt-slide-total');
    if (totalEl) totalEl.textContent = String(this._total).padStart(2, '0');

    this._goTo(0, true);

    // Controls
    this.container.querySelector('#lt-prev')?.addEventListener('click', () => this._prev());
    this.container.querySelector('#lt-next')?.addEventListener('click', () => this._next());
    this.container.querySelector('#lt-start-btn')?.addEventListener('click', () => this._next());
    this.container.querySelector('#lt-back-home')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    // Keyboard
    this._keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this._next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this._prev(); }
      if (e.key === 'Escape') { window.location.hash = '#home'; }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Touch / swipe
    const slidesEl = this.container.querySelector('#lt-slides');
    if (slidesEl) {
      slidesEl.addEventListener('touchstart', (e) => {
        this._touchStartX = e.touches[0].clientX;
        this._touchStartY = e.touches[0].clientY;
      }, { passive: true });
      slidesEl.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - this._touchStartX;
        const dy = e.changedTouches[0].clientY - this._touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          dx < 0 ? this._next() : this._prev();
        }
      }, { passive: true });
    }
  }

  _goTo(index, instant = false) {
    if (index < 0 || index >= this._total) return;
    this._current = index;

    const slides = this.container.querySelectorAll('.lt-slide');
    slides.forEach((s, i) => {
      s.classList.toggle('lt-slide--active', i === index);
      s.classList.toggle('lt-slide--past', i < index);
      s.classList.toggle('lt-slide--future', i > index);
      if (instant) s.style.transition = 'none';
      else s.style.transition = '';
    });

    // Update dots
    this.container.querySelectorAll('.lt-dot').forEach((d, i) => {
      d.classList.toggle('lt-dot--active', i === index);
    });

    // Update counter
    const numEl = this.container.querySelector('#lt-slide-num');
    if (numEl) numEl.textContent = String(index + 1).padStart(2, '0');

    // Progress bar
    const fill = this.container.querySelector('#lt-progress-fill');
    if (fill) fill.style.width = `${((index + 1) / this._total) * 100}%`;

    // Prev/Next states
    const prevBtn = this.container.querySelector('#lt-prev');
    const nextBtn = this.container.querySelector('#lt-next');
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === this._total - 1;

    // Trigger fade-up animations for current slide
    requestAnimationFrame(() => {
      const active = this.container.querySelector('.lt-slide--active');
      if (active) {
        active.querySelectorAll('.lt-fade-up').forEach((el, i) => {
          el.style.animationDelay = `${i * 0.1 + 0.2}s`;
          el.classList.remove('lt-fade-up--visible');
          void el.offsetWidth;
          el.classList.add('lt-fade-up--visible');
        });
      }
    });
  }

  _next() { this._goTo(this._current + 1); }
  _prev() { this._goTo(this._current - 1); }

  destroy() {
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }
}
