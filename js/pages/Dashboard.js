import userAuth from '../services/userAuth.js';

// ── Question labels for expediente display ──────────────────
const EXPEDIENTE_SECTIONS = [
  {
    code: 'SEC-I',
    title: 'Protocolo de Hospitalidad',
    questions: [
      { id: 'q1', code: 'HOSP-001', label: 'El Combustible Exacto' },
      { id: 'q2', code: 'HOSP-002', label: 'El Rescate de Emergencia' },
      { id: 'q3', code: 'HOSP-003', label: 'El Entorno Ideal' },
      { id: 'q4', code: 'HOSP-004', label: 'El "No-Go" Visual y Gastrico' },
    ],
  },
  {
    code: 'SEC-II',
    title: 'El Circulo de Confianza',
    questions: [
      { id: 'q5', code: 'CONF-001', label: 'El Complice de Riesgo' },
      { id: 'q6', code: 'CONF-002', label: 'El Ancla a Tierra' },
      { id: 'q7', code: 'CONF-003', label: 'La Linea Roja Invisible' },
      { id: 'q8', code: 'CONF-004', label: 'Veto Absoluto' },
    ],
  },
  {
    code: 'SEC-III',
    title: 'Psicologia de Escena',
    questions: [
      { id: 'q9', code: 'PSI-001', label: 'La Mentira de Sociedad' },
      { id: 'q10', code: 'PSI-002', label: 'El Boton Rojo' },
      { id: 'q11', code: 'PSI-003', label: 'El Superpoder de Negociacion' },
      { id: 'q12', code: 'PSI-004', label: 'El Trofeo Invisible' },
    ],
  },
];

export class Dashboard {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';
    this.activeTab = 'episode';
    this.expedienteData = null;
  }

  async render() {
    this.container.innerHTML = `
      <div class="dash-page">
        <div class="dash-loading">
          <div class="dash-loading-spinner"></div>
          <span>Cargando dashboard...</span>
        </div>
      </div>
    `;

    try {
      this.expedienteData = await userAuth.getOnboardingResponse(
        this.currentUser.phone,
        this.businessId
      );
    } catch (e) {
      console.error('Failed to load expediente:', e);
    }

    this._renderShell();
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="dash-page">
        <header class="dash-header">
          <div class="dash-header-row">
            <button class="dash-back" id="dash-back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div class="dash-brand">
              <span class="dash-brand-tag">MDN</span>
              <span class="dash-brand-name">Manual de Nadie</span>
            </div>
          </div>
          <nav class="dash-tabs" id="dash-tabs">
            <button class="dash-tab ${this.activeTab === 'episode' ? 'active' : ''}" data-tab="episode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <span>EP. 001</span>
            </button>
            <button class="dash-tab ${this.activeTab === 'expediente' ? 'active' : ''}" data-tab="expediente">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Expediente</span>
            </button>
          </nav>
        </header>

        <div class="dash-content" id="dash-content">
          ${this.activeTab === 'episode' ? this._buildEpisodeContent() : this._buildExpedienteContent()}
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _switchTab(tab) {
    if (tab === this.activeTab) return;
    this.activeTab = tab;

    this.container.querySelectorAll('.dash-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    const content = this.container.querySelector('#dash-content');
    if (!content) return;

    content.classList.add('dash-content--exit');

    setTimeout(() => {
      content.innerHTML = tab === 'episode'
        ? this._buildEpisodeContent()
        : this._buildExpedienteContent();

      this._attachContentListeners();
      content.classList.remove('dash-content--exit');
      content.classList.add('dash-content--enter');

      setTimeout(() => content.classList.remove('dash-content--enter'), 400);
    }, 200);
  }

  // ═══════════════════════════════════════════════════
  //  EPISODE CONTENT — Master Plan EP.001
  // ═══════════════════════════════════════════════════

  _buildEpisodeContent() {
    return `
      <div class="ep-content">

        <!-- ── HERO ── -->
        <div class="ep-hero">
          <div class="ep-hero-top">
            <span class="ep-hero-podcast">PODCAST: MANUAL DE NADIE</span>
          </div>
          <div class="ep-hero-number">001</div>
          <h1 class="ep-hero-title">El Lujo de<br>Renunciar</h1>
          <div class="ep-hero-badges">
            <span class="ep-badge ep-badge--time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              15 — 20 min
            </span>
            <span class="ep-badge ep-badge--status">Pre-Produccion</span>
          </div>
          <blockquote class="ep-hero-quote">
            &ldquo;Bajar el ritmo ya no es de mediocres; renunciar es el nuevo estatus de la elite.&rdquo;
          </blockquote>
        </div>

        <!-- ── I. CONCEPTO CENTRAL ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">I</span>
            <div>
              <h2 class="ep-section-title">Concepto Central</h2>
              <p class="ep-section-sub">El nucleo narrativo del episodio</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <div class="ep-block-label">El "Fact" a Debatir</div>
              <p class="ep-block-text">Bajar el ritmo ya no es de mediocres — renunciar se convirtio en el nuevo estatus de la elite. El exito dejo de medirse en horas trabajadas y empezo a medirse en horas libres.</p>
            </div>
            <div class="ep-block">
              <div class="ep-block-label">El Choque</div>
              <p class="ep-block-text">Desmontar la hipocresia de la cultura "Girlboss" y del exceso de trabajo como medalla de honor. Mientras la clase media colecciona horas extras, la elite emocional colecciona horas libres. El maximo lujo hoy es tener el poder de decir <strong>"ya no quiero"</strong>.</p>
            </div>
          </div>
        </section>

        <!-- ── II. DIRECCIÓN DE ARTE ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">II</span>
            <div>
              <h2 class="ep-section-title">Direccion de Arte y Estetica</h2>
              <p class="ep-section-sub">La identidad visual del episodio</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-grid-2">
              <div class="ep-card-visual">
                <div class="ep-card-visual-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46L16 2 12 5.59 8 2 3.62 3.46 2 8l3.59 4L2 16l1.62 4.54L8 22l4-3.59L16 22l4.38-1.46L22 16l-3.59-4L22 8l-1.62-4.54z"/></svg>
                </div>
                <div class="ep-card-visual-tag">Dress Code</div>
                <div class="ep-card-visual-accent">Quiet Luxury Desalinado</div>
                <p class="ep-card-visual-text">Blazer oversized de excelente corte sobre camiseta basica blanca, o sueter de cachemira costoso pero mal puesto.</p>
                <div class="ep-card-visual-note">
                  <strong>Mensaje:</strong> "Me importa un carajo, pero con estilo." Tienen el poder, pero decidieron dejar de esforzarse por encajar.
                </div>
              </div>
              <div class="ep-card-visual">
                <div class="ep-card-visual-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <div class="ep-card-visual-tag">El Set</div>
                <div class="ep-card-visual-accent">Minimalista Editorial</div>
                <p class="ep-card-visual-text">Iluminacion intima pero nitida, estilo editorial de revista. Elementos de "caos controlado" en escena.</p>
                <div class="ep-card-visual-note">
                  Taza de cafe real, no utileria perfecta. Lo imperfecto es intencional.
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── III. IDENTIDAD SONORA ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">III</span>
            <div>
              <h2 class="ep-section-title">Identidad Sonora</h2>
              <p class="ep-section-sub">El ADN auditivo del podcast</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <div class="ep-block-label">Vibe del Jingle</div>
              <div class="ep-tags">
                <span class="ep-tag">Chic Tech-House</span>
                <span class="ep-tag">125 BPM</span>
                <span class="ep-tag">Pasarela Rapida</span>
                <span class="ep-tag">Actitud</span>
              </div>
              <p class="ep-block-text">Moderno, dinamico y con actitud. Estilo pasarela rapida — puro punch visual y sonoro.</p>
            </div>
            <div class="ep-block">
              <div class="ep-block-label">El Intro</div>
              <p class="ep-block-text">Inicia con un flash de camara. Entra un beat de pasarela rapido y pesado. Voz ritmica (estilo Rihanna):</p>
              <div class="ep-lyrics">
                <div class="ep-lyrics-line">"Cero filtros, cero culpa,</div>
                <div class="ep-lyrics-line">Aqui la verdad no se oculta.</div>
                <div class="ep-lyrics-line">Ni tuya, ni mia...</div>
                <div class="ep-lyrics-line ep-lyrics-line--bold">Manual de Nadie"</div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── IV. ESCALETA DE GRABACIÓN ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">IV</span>
            <div>
              <h2 class="ep-section-title">Escaleta de Grabacion</h2>
              <p class="ep-section-sub">El flow del episodio — minuto a minuto</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-timeline">
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">00:00</span>
                  <span class="ep-tl-end">01:30</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node"></div>
                  <div class="ep-tl-line"></div>
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">Cold Open</div>
                  <div class="ep-tl-subtitle">El Gancho en Frio</div>
                  <p class="ep-tl-desc">Cero saludos. La camara enciende y una de ellas suelta el Fact directamente: "Nos vendieron que renunciar es de fracasados, pero hoy decir 'ya no quiero' es el mayor lujo que te puedes pagar".</p>
                </div>
              </div>
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">01:30</span>
                  <span class="ep-tl-end">02:00</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node"></div>
                  <div class="ep-tl-line"></div>
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">Intro</div>
                  <div class="ep-tl-subtitle">Jingle Chic Techno</div>
                  <p class="ep-tl-desc">Suena el jingle de 15 segundos. Energia pura, beat de pasarela. La marca sonora del podcast.</p>
                </div>
              </div>
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">02:00</span>
                  <span class="ep-tl-end">08:00</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node ep-tl-node--accent"></div>
                  <div class="ep-tl-line"></div>
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">El Debate Frontal</div>
                  <div class="ep-tl-subtitle">Choque de Posturas</div>
                  <p class="ep-tl-desc">Chocan posturas. La "Estructurada" habla de lo que cuesta llegar a la cima; la "Rebelde" habla de la delicia de soltarlo todo. Fuego cruzado con argumentos reales.</p>
                </div>
              </div>
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">08:00</span>
                  <span class="ep-tl-end">15:00</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node ep-tl-node--accent"></div>
                  <div class="ep-tl-line"></div>
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">La Letra Chica</div>
                  <div class="ep-tl-subtitle">Confesion Obligatoria</div>
                  <p class="ep-tl-desc">Obligatorio. Deben confesar en camara una oportunidad increible — un cliente, un proyecto de dinero, una relacion de estatus — a la que le dijeron "No" puramente porque les daba pereza o les quitaba la paz.</p>
                </div>
              </div>
              <div class="ep-tl-item">
                <div class="ep-tl-time">
                  <span class="ep-tl-start">15:00</span>
                  <span class="ep-tl-end">18:00</span>
                </div>
                <div class="ep-tl-track">
                  <div class="ep-tl-node"></div>
                </div>
                <div class="ep-tl-body">
                  <div class="ep-tl-title">Cierre y Sentencia</div>
                  <div class="ep-tl-subtitle">Sin Despedidas Largas</div>
                  <p class="ep-tl-desc">Conclusion rapida. Lanzan la pregunta al publico y cortan. Sin adornos, sin despedidas cursis. La sentencia queda flotando en el aire.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── V. LA TARJETA NEGRA ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">V</span>
            <div>
              <h2 class="ep-section-title">Herramientas para las Conductoras</h2>
              <p class="ep-section-sub">Lo unico en la mesa — sin guion</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-tarjeta">
              <div class="ep-tarjeta-top">
                <span class="ep-tarjeta-label">TARJETA NEGRA MATE</span>
                <span class="ep-tarjeta-ep">EP. 001</span>
              </div>
              <div class="ep-tarjeta-divider"></div>
              <div class="ep-tarjeta-rules">
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">01</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">El Fact a Defender</div>
                    <div class="ep-tarjeta-rule-text">"El exito no es una agenda llena, es una agenda en blanco."</div>
                  </div>
                </div>
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">02</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">La Palabra Prohibida</div>
                    <div class="ep-tarjeta-rule-text">Tienen prohibido decir "Fracaso" o "Rendirse". Esto las obliga a buscar terminos mas inteligentes y crudos.</div>
                  </div>
                </div>
                <div class="ep-tarjeta-rule">
                  <span class="ep-tarjeta-num">03</span>
                  <div>
                    <div class="ep-tarjeta-rule-label">La Pregunta de Cierre</div>
                    <div class="ep-tarjeta-rule-text">Mirar a camara y preguntar: "A que renunciaste hoy para comprar tu paz?"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── VI. ESTRATEGIA ── -->
        <section class="ep-section">
          <div class="ep-section-head">
            <span class="ep-section-num">VI</span>
            <div>
              <h2 class="ep-section-title">Estrategia de Promocion</h2>
              <p class="ep-section-sub">Redes sociales y posicionamiento</p>
            </div>
          </div>
          <div class="ep-section-body">
            <div class="ep-block">
              <div class="ep-block-label">Titulo en YouTube</div>
              <div class="ep-yt-title">Por que RENUNCIAR es el nuevo estatus (y el esfuerzo constante es para mediocres).</div>
            </div>

            <div class="ep-block">
              <div class="ep-block-label">Cortes Planificados — Reels / TikTok</div>
              <div class="ep-reels">
                <div class="ep-reel">
                  <div class="ep-reel-head">
                    <span class="ep-reel-num">01</span>
                    <span class="ep-reel-name">El Choque Frontal</span>
                  </div>
                  <p class="ep-reel-clip">Destruyendo el concepto de trabajar sin dormir.</p>
                  <div class="ep-reel-caption">Romantizar el cansancio es de la decada pasada. Tu paz es tu activo mas caro.</div>
                  <span class="ep-reel-tag">#ManualDeNadie</span>
                </div>
                <div class="ep-reel">
                  <div class="ep-reel-head">
                    <span class="ep-reel-num">02</span>
                    <span class="ep-reel-name">El Limite</span>
                  </div>
                  <p class="ep-reel-clip">Cuando explican que decir "No" no requiere explicaciones.</p>
                  <div class="ep-reel-caption">No le debes un 'si' a nadie si te cuesta tu tranquilidad.</div>
                </div>
                <div class="ep-reel">
                  <div class="ep-reel-head">
                    <span class="ep-reel-num">03</span>
                    <span class="ep-reel-name">La Confesion</span>
                  </div>
                  <p class="ep-reel-clip">La anecdota personal donde rechazaron dinero y estatus.</p>
                  <div class="ep-reel-caption">Esa vez que dije que NO a todo y se sintio increible.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  EXPEDIENTE CONTENT
  // ═══════════════════════════════════════════════════

  _buildExpedienteContent() {
    const data = this.expedienteData;
    const answers = data?.answers || {};
    const isCompleted = !!data?.completedAt;
    const totalAnswered = Object.values(answers).filter(a => a?.trim()).length;

    if (!data) {
      return `
        <div class="exp-content">
          <div class="exp-empty">
            <div class="exp-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h3 class="exp-empty-title">Expediente Pendiente</h3>
            <p class="exp-empty-text">Este talento aun no ha completado el formulario de onboarding.</p>
            <button class="glass-btn glass-btn--primary" id="exp-start-onboarding">Iniciar Expediente</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="exp-content">
        <div class="exp-header">
          <div class="exp-header-left">
            <div class="exp-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 class="exp-header-title">Expediente de Talento</h2>
              <p class="exp-header-name">${data.userName || this.currentUser?.name || 'Sin nombre'}</p>
            </div>
          </div>
          <div class="exp-status ${isCompleted ? 'exp-status--done' : ''}">
            ${isCompleted
              ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Completado'
              : `<span class="exp-status-count">${totalAnswered}</span>/12`
            }
          </div>
        </div>

        ${EXPEDIENTE_SECTIONS.map(section => {
          const sectionAnswered = section.questions.filter(q => answers[q.id]?.trim()).length;
          return `
            <div class="exp-section">
              <div class="exp-section-head">
                <div class="exp-section-left">
                  <span class="exp-section-code">${section.code}</span>
                  <span class="exp-section-title">${section.title}</span>
                </div>
                <span class="exp-section-count">${sectionAnswered}/${section.questions.length}</span>
              </div>
              <div class="exp-section-body">
                ${section.questions.map(q => {
                  const answer = answers[q.id];
                  return `
                    <div class="exp-item ${answer ? '' : 'exp-item--empty'}">
                      <div class="exp-item-top">
                        <span class="exp-item-code">${q.code}</span>
                        <span class="exp-item-label">${q.label}</span>
                      </div>
                      ${answer
                        ? `<div class="exp-item-answer">${answer}</div>`
                        : `<div class="exp-item-na">Sin respuesta</div>`
                      }
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}

        <div class="exp-footer">
          <button class="glass-btn" id="exp-edit-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Respuestas
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════
  //  LISTENERS
  // ═══════════════════════════════════════════════════

  _attachListeners() {
    this.container.querySelector('#dash-back')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    this.container.querySelectorAll('.dash-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._switchTab(tab.dataset.tab);
      });
    });

    this._attachContentListeners();
  }

  _attachContentListeners() {
    this.container.querySelector('#exp-start-onboarding')?.addEventListener('click', () => {
      window.location.hash = '#onboarding/mdn-podcast';
    });

    this.container.querySelector('#exp-edit-btn')?.addEventListener('click', () => {
      window.location.hash = '#onboarding/mdn-podcast';
    });
  }

  unmount() {}
}
