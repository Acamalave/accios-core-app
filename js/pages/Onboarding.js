import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';

// ─── Questions Data ──────────────────────────────────────
const SECTIONS = [
  {
    id: 'hospitality',
    number: 'I',
    title: 'Protocolo de Hospitalidad',
    subtitle: 'Tu confort dicta el ritmo del show. No hay respuestas incorrectas, solo estandares.',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  },
  {
    id: 'trust',
    number: 'II',
    title: 'El Circulo de Confianza',
    subtitle: 'Como produccion, somos tu escudo. Necesitamos saber a quien dejas entrar y de quien te protegemos.',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  {
    id: 'psychology',
    number: 'III',
    title: 'Psicologia de Escena',
    subtitle: 'Tu mente es el activo mas caro del programa. Queremos saber como ganar contigo.',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  },
];

const QUESTIONS = [
  // Section I — Protocolo de Hospitalidad
  {
    id: 'q1', section: 0,
    title: 'El Combustible Exacto',
    prompt: 'No nos digas "un cafe". Describe tu orden como si se la estuvieras dictando a tu barista personal. (Ej: Lungo, leche de almendras fria aparte, dos sobres de estevia).',
    placeholder: 'Describe tu orden exacta...',
  },
  {
    id: 'q2', section: 0,
    title: 'El Rescate de Emergencia',
    prompt: 'Si llevamos tres horas grabando, la energia cae y el estres sube, cual es ese "placer culposo" que reinicia tu sistema inmediatamente? (Puede ser un snack super especifico, 5 minutos de encierro total, o una cancion a todo volumen. Pidelo y aparecera).',
    placeholder: 'Tu reset de emergencia...',
  },
  {
    id: 'q3', section: 0,
    title: 'El Entorno Ideal',
    prompt: 'Que temperatura, iluminacion o aroma te hace sentir inmediatamente comoda y en control del espacio?',
    placeholder: 'Tu ambiente perfecto...',
  },
  {
    id: 'q4', section: 0,
    title: 'El "No-Go" Visual y Gastrico',
    prompt: 'Que comida te pondria de mal humor si la ves en el catering, o que objeto/desorden en el set te obsesiona y te desconcentra si esta fuera de lugar?',
    placeholder: 'Lo que nunca debe estar presente...',
  },
  // Section II — El Circulo de Confianza
  {
    id: 'q5', section: 1,
    title: 'El Complice de Riesgo',
    prompt: 'Si tuvieras que ocultar un "cadaver" (metaforicamente hablando), a que amiga llamarias a las 3:00 AM sabiendo que llegaria con una pala y sin hacer una sola pregunta?',
    placeholder: 'Tu persona de confianza absoluta...',
  },
  {
    id: 'q6', section: 1,
    title: 'El Ancla a Tierra',
    prompt: 'Cuando la grabacion se pone demasiado intensa emocionalmente y necesitas que alguien te centre, quien es esa persona a la que llamas al salir?',
    placeholder: 'Quien te centra...',
  },
  {
    id: 'q7', section: 1,
    title: 'La Linea Roja Invisible',
    prompt: 'Todas tenemos un limite de exposicion. Cual es ese tema, dinamica o tipo de pregunta que te genera ansiedad y que te haria decir "corten la camara"? (Saber a que le tienes terror es nuestra mejor herramienta para evitarlo o manejarlo con pinzas).',
    placeholder: 'Tu limite absoluto...',
  },
  {
    id: 'q8', section: 1,
    title: 'Veto Absoluto',
    prompt: 'Existe algun nombre, familiar o situacion del pasado que, por proteccion a tu paz mental o legal, esta estrictamente prohibido mencionar al aire?',
    placeholder: 'Lo que nunca se menciona...',
  },
  // Section III — Psicologia de Escena
  {
    id: 'q9', section: 2,
    title: 'La Mentira de Sociedad',
    prompt: 'Cual es esa postura, actitud o respuesta que sueles fingir en los eventos de alta sociedad para encajar, pero que te encantaria destruir publicamente en este podcast?',
    placeholder: 'La mascara que quieres romper...',
  },
  {
    id: 'q10', section: 2,
    title: 'El Boton Rojo',
    prompt: 'Que actitud, comentario o tipo de persona te hace perder la paciencia (para bien o para mal) y te saca de tu zona de confort? (Nos sirve para saber cuando encender el debate).',
    placeholder: 'Lo que enciende tu fuego...',
  },
  {
    id: 'q11', section: 2,
    title: 'El Superpoder de Negociacion',
    prompt: 'Si tuvieras que cerrar un trato millonario hoy y tuvieras todo en contra, cual es esa herramienta de tu personalidad (tu encanto, tu frialdad, tu sarcasmo) que usarias para ganar?',
    placeholder: 'Tu arma secreta...',
  },
  {
    id: 'q12', section: 2,
    title: 'El Trofeo Invisible',
    prompt: 'Cuando terminemos de grabar, te quites el microfono y te subas a tu auto, que tiene que haber pasado en esa silla para que respires hondo y digas: "Wow, hoy la rompimos. Soy la mejor en lo que hago"? (Dinos como mides tu propia victoria para asegurarnos de fabricarla).',
    placeholder: 'Como mides tu victoria...',
  },
];

// Step mapping:
// 0 = intro
// 1..12 = questions (with section intros shown inline)
// 13 = complete

export class Onboarding {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';
    this.currentStep = 0;
    this.answers = {};
    this.existingData = null;
    this.isCompleted = false;
    this.direction = 'next';
    this._transitioning = false;
    this._saveTimeout = null;
  }

  async render() {
    // Load existing data from Firestore
    try {
      this.existingData = await userAuth.getOnboardingResponse(
        this.currentUser.phone,
        this.businessId
      );
    } catch (e) {
      console.error('Failed to load onboarding data:', e);
    }

    if (this.existingData) {
      this.answers = this.existingData.answers || {};
      if (this.existingData.completedAt) {
        this.isCompleted = true;
        this.currentStep = 13;
      } else if (this.existingData.currentStep > 0) {
        this.currentStep = this.existingData.currentStep;
      }
    }

    this._renderShell();
    this._showStep(this.currentStep, false);
  }

  _renderShell() {
    this.container.innerHTML = `
      <section class="onboarding-page">
        <div class="onboarding-progress">
          <div class="onboarding-progress-fill" id="ob-progress-fill" style="width: 0%"></div>
        </div>

        <button class="onboarding-exit" id="ob-exit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Continuar despues
        </button>

        <div class="onboarding-counter" id="ob-counter"></div>

        <div class="onboarding-stage" id="ob-stage"></div>
      </section>
    `;

    this.container.querySelector('#ob-exit').addEventListener('click', () => this._exitLater());
  }

  _updateProgress() {
    const fill = this.container.querySelector('#ob-progress-fill');
    const counter = this.container.querySelector('#ob-counter');
    if (!fill || !counter) return;

    if (this.currentStep === 0) {
      fill.style.width = '0%';
      counter.textContent = '';
    } else if (this.currentStep <= 12) {
      const pct = (this.currentStep / 12) * 100;
      fill.style.width = `${pct.toFixed(0)}%`;
      counter.textContent = `${this.currentStep} / 12`;
    } else {
      fill.style.width = '100%';
      counter.textContent = 'Completado';
    }
  }

  // ─── CINEMATIC SEQUENCES ─────────────────────────

  /**
   * Boot Sequence — plays when user first opens the expediente.
   * Terminal-style line-by-line with spinners → checkmarks.
   */
  async _playBootSequence() {
    const name = this.currentUser?.name || 'Talento';
    const stage = this.container.querySelector('#ob-stage');
    if (!stage) return;

    stage.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'ob-terminal';
    overlay.innerHTML = `
      <div class="ob-terminal-header">
        <span class="ob-terminal-dot ob-terminal-dot--red"></span>
        <span class="ob-terminal-dot ob-terminal-dot--yellow"></span>
        <span class="ob-terminal-dot ob-terminal-dot--green"></span>
        <span class="ob-terminal-title">ACCIOS CORE — Terminal Segura</span>
      </div>
      <div class="ob-terminal-body" id="ob-term-body"></div>
    `;
    stage.appendChild(overlay);

    const body = overlay.querySelector('#ob-term-body');

    const lines = [
      { text: 'Inicializando sistema de expedientes...', delay: 700 },
      { text: 'Conectando con base de datos segura...', delay: 600 },
      { text: `Verificando credenciales de acceso...`, delay: 800 },
      { text: `Comprobando identidad: ${name}`, delay: 900, accent: true },
      { text: 'Acceso concedido — nivel: talento autorizado', delay: 500, success: true },
      { text: 'Desencriptando expediente reservado...', delay: 700 },
      { text: 'Preparando entorno confidencial...', delay: 600 },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const el = document.createElement('div');
      el.className = 'ob-term-line';
      el.innerHTML = `
        <span class="ob-term-prefix">&gt;</span>
        <span class="ob-term-text ${line.success ? 'ob-term-success' : ''} ${line.accent ? 'ob-term-accent' : ''}">${line.text}</span>
        <span class="ob-term-status ob-term-spinner"></span>
      `;
      body.appendChild(el);
      el.offsetHeight; // trigger reflow
      el.classList.add('ob-term-line--visible');

      // Scroll to bottom
      body.scrollTop = body.scrollHeight;

      await this._wait(line.delay);

      // Replace spinner with check
      const status = el.querySelector('.ob-term-status');
      status.classList.remove('ob-term-spinner');
      status.classList.add('ob-term-check');
      status.textContent = '✓';

      await this._wait(150);
    }

    // Final line — access granted pulse
    await this._wait(300);
    const finalLine = document.createElement('div');
    finalLine.className = 'ob-term-line ob-term-final';
    finalLine.innerHTML = `
      <span class="ob-term-prefix">&gt;</span>
      <span class="ob-term-text ob-term-success">EXPEDIENTE LISTO — Iniciando protocolo...</span>
    `;
    body.appendChild(finalLine);
    finalLine.offsetHeight;
    finalLine.classList.add('ob-term-line--visible');
    body.scrollTop = body.scrollHeight;

    await this._wait(1000);

    // Fade out terminal
    overlay.classList.add('ob-terminal--exit');
    await this._wait(500);
  }

  /**
   * Section Transition — plays when moving from one section to the next.
   * Brief file-system animation with response registration.
   */
  async _playSectionTransition(fromSectionIndex, toSectionIndex) {
    const stage = this.container.querySelector('#ob-stage');
    if (!stage) return;

    stage.innerHTML = '';

    const fromSection = fromSectionIndex >= 0 ? SECTIONS[fromSectionIndex] : null;
    const toSection = SECTIONS[toSectionIndex];

    const overlay = document.createElement('div');
    overlay.className = 'ob-terminal ob-terminal--compact';
    overlay.innerHTML = `
      <div class="ob-terminal-header">
        <span class="ob-terminal-dot ob-terminal-dot--red"></span>
        <span class="ob-terminal-dot ob-terminal-dot--yellow"></span>
        <span class="ob-terminal-dot ob-terminal-dot--green"></span>
        <span class="ob-terminal-title">Gestor de Expedientes</span>
      </div>
      <div class="ob-terminal-body" id="ob-term-body"></div>
    `;
    stage.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('ob-terminal--visible');

    const body = overlay.querySelector('#ob-term-body');

    const lines = [];

    if (fromSection) {
      // Count answers in the section we're leaving
      const sectionQs = QUESTIONS.filter(q => q.section === fromSectionIndex);
      const answered = sectionQs.filter(q => this.answers[q.id]?.trim()).length;
      lines.push({ text: `Cerrando archivo: ${fromSection.title}`, delay: 500 });
      lines.push({ text: `Respuestas registradas: ${answered}/${sectionQs.length}`, delay: 400, accent: true });
      lines.push({ text: 'Datos cifrados y almacenados...', delay: 500 });
    }

    lines.push({ text: `Abriendo archivo clasificado: Seccion ${toSection.number}`, delay: 600, accent: true });
    lines.push({ text: `${toSection.title}`, delay: 400, success: true });

    for (const line of lines) {
      const el = document.createElement('div');
      el.className = 'ob-term-line';
      el.innerHTML = `
        <span class="ob-term-prefix">&gt;</span>
        <span class="ob-term-text ${line.success ? 'ob-term-success' : ''} ${line.accent ? 'ob-term-accent' : ''}">${line.text}</span>
        <span class="ob-term-status ob-term-spinner"></span>
      `;
      body.appendChild(el);
      el.offsetHeight;
      el.classList.add('ob-term-line--visible');
      body.scrollTop = body.scrollHeight;

      await this._wait(line.delay);

      const status = el.querySelector('.ob-term-status');
      status.classList.remove('ob-term-spinner');
      status.classList.add('ob-term-check');
      status.textContent = '✓';

      await this._wait(120);
    }

    await this._wait(600);
    overlay.classList.add('ob-terminal--exit');
    await this._wait(500);
  }

  /**
   * Completion Sequence — plays after the last answer before showing the complete screen.
   * Full processing, encryption, and sealing animation.
   */
  async _playCompletionSequence() {
    const stage = this.container.querySelector('#ob-stage');
    if (!stage) return;

    stage.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'ob-terminal ob-terminal--seal';
    overlay.innerHTML = `
      <div class="ob-terminal-header">
        <span class="ob-terminal-dot ob-terminal-dot--red"></span>
        <span class="ob-terminal-dot ob-terminal-dot--yellow"></span>
        <span class="ob-terminal-dot ob-terminal-dot--green"></span>
        <span class="ob-terminal-title">Protocolo de Cierre — Expediente Reservado</span>
      </div>
      <div class="ob-terminal-body" id="ob-term-body"></div>
    `;
    stage.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('ob-terminal--visible');

    const body = overlay.querySelector('#ob-term-body');

    // Count total answered
    const totalAnswered = QUESTIONS.filter(q => this.answers[q.id]?.trim()).length;

    const lines = [
      { text: 'Cerrando ultima seccion de registro...', delay: 600 },
      { text: `Respuestas totales capturadas: ${totalAnswered}/12`, delay: 500, accent: true },
      { text: 'Compilando expediente completo...', delay: 800 },
      { text: 'Verificando integridad de datos...', delay: 700 },
      { text: 'Aplicando cifrado AES-256 a respuestas sensibles...', delay: 900 },
      { text: 'Restringiendo acceso: solo produccion autorizada...', delay: 700 },
      { text: 'Generando sello de confidencialidad...', delay: 600 },
      { text: 'Almacenando en boveda segura...', delay: 800 },
    ];

    for (const line of lines) {
      const el = document.createElement('div');
      el.className = 'ob-term-line';
      el.innerHTML = `
        <span class="ob-term-prefix">&gt;</span>
        <span class="ob-term-text ${line.accent ? 'ob-term-accent' : ''}">${line.text}</span>
        <span class="ob-term-status ob-term-spinner"></span>
      `;
      body.appendChild(el);
      el.offsetHeight;
      el.classList.add('ob-term-line--visible');
      body.scrollTop = body.scrollHeight;

      await this._wait(line.delay);

      const status = el.querySelector('.ob-term-status');
      status.classList.remove('ob-term-spinner');
      status.classList.add('ob-term-check');
      status.textContent = '✓';

      await this._wait(120);
    }

    // Final sealed message
    await this._wait(400);
    const sealEl = document.createElement('div');
    sealEl.className = 'ob-term-seal-badge';
    sealEl.innerHTML = `
      <div class="ob-seal-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div class="ob-seal-text">EXPEDIENTE SELLADO Y ASEGURADO</div>
      <div class="ob-seal-sub">Acceso restringido — Solo produccion MDN</div>
    `;
    body.appendChild(sealEl);
    sealEl.offsetHeight;
    sealEl.classList.add('ob-term-seal-badge--visible');
    body.scrollTop = body.scrollHeight;

    await this._wait(1800);

    overlay.classList.add('ob-terminal--exit');
    await this._wait(500);
  }

  // ─── STEP MANAGEMENT ────────────────────────────

  async _showStep(step, animate = true) {
    if (this._transitioning) return;
    this._transitioning = true;

    const stage = this.container.querySelector('#ob-stage');
    if (!stage) { this._transitioning = false; return; }

    const exitClass = this.direction === 'next' ? 'ob-slide-out-left' : 'ob-slide-out-right';
    const enterClass = this.direction === 'next' ? 'ob-slide-in-right' : 'ob-slide-in-left';

    // Exit current card
    if (animate && stage.firstElementChild) {
      stage.firstElementChild.classList.add(exitClass);
      await this._wait(350);
    }

    // Build new content
    stage.innerHTML = '';
    this.currentStep = step;
    this._updateProgress();

    const card = document.createElement('div');
    card.className = 'onboarding-card';

    if (step === 0) {
      card.innerHTML = this._buildIntro();
    } else if (step >= 1 && step <= 12) {
      const qIndex = step - 1;
      const q = QUESTIONS[qIndex];
      const isFirstOfSection = qIndex === 0 || QUESTIONS[qIndex].section !== QUESTIONS[qIndex - 1]?.section;

      if (isFirstOfSection && animate) {
        // Determine previous section for transition
        const prevSectionIndex = qIndex > 0 ? QUESTIONS[qIndex - 1].section : -1;

        // Play section file-system transition
        this._transitioning = false;
        await this._playSectionTransition(prevSectionIndex, q.section);
        this._transitioning = true;

        // Now show section intro card briefly
        stage.innerHTML = '';
        const sCard = document.createElement('div');
        sCard.className = 'onboarding-card ob-slide-in-right';
        sCard.innerHTML = this._buildSectionIntro(q.section);
        stage.appendChild(sCard);
        this._transitioning = false;

        await this._wait(2000);
        if (this.currentStep !== step) return;

        this._transitioning = true;
        sCard.classList.add('ob-slide-out-left');
        await this._wait(350);

        stage.innerHTML = '';
        const qCard = document.createElement('div');
        qCard.className = 'onboarding-card ob-slide-in-right';
        qCard.innerHTML = this._buildQuestion(qIndex);
        stage.appendChild(qCard);
        this._attachQuestionListeners(qIndex);
        this._transitioning = false;
        return;
      }
      card.innerHTML = this._buildQuestion(qIndex);
    } else if (step === 13) {
      card.innerHTML = this._buildComplete();
    }

    if (animate) card.classList.add(enterClass);
    stage.appendChild(card);

    // Attach listeners
    if (step === 0) this._attachIntroListeners();
    else if (step >= 1 && step <= 12) this._attachQuestionListeners(step - 1);
    else if (step === 13) this._attachCompleteListeners();

    this._transitioning = false;
  }

  // ─── BUILD FUNCTIONS ────────────────────────────────

  _buildIntro() {
    const name = this.currentUser?.name || 'Talento';
    const resumeText = this.existingData && !this.isCompleted
      ? `<p style="font-size: 0.78rem; color: var(--purple-400); margin-bottom: 6px;">Tienes un expediente en progreso. Retomemos donde quedaste.</p>`
      : '';

    return `
      <div class="ob-intro">
        <div class="ob-intro-badge">Expediente Reservado</div>
        <div class="ob-intro-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h2 class="ob-intro-title">Onboarding de Talento</h2>
        <p class="ob-intro-name">${name}</p>
        <p class="ob-intro-text">
          Este expediente es nuestra poliza de seguro mutua. La informacion aqui contenida es estrictamente confidencial y tiene un solo proposito: darte el control absoluto del set, blindar tu imagen y asegurarnos de que solo te preocupes por brillar.
          <br><br>Se tan honesta (y tan exigente) como quieras.
        </p>
        ${resumeText}
        <button class="ob-intro-btn" id="ob-start-btn">
          ${this.existingData && !this.isCompleted ? 'Retomar Expediente' : 'Abrir Expediente'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    `;
  }

  _buildSectionIntro(sectionIndex) {
    const s = SECTIONS[sectionIndex];
    return `
      <div class="ob-section-intro">
        <div class="ob-section-number">Seccion ${s.number}</div>
        <div style="margin: 0 auto 16px; color: var(--purple-400);">${s.icon}</div>
        <h3 class="ob-section-title">${s.title}</h3>
        <p class="ob-section-subtitle">${s.subtitle}</p>
      </div>
    `;
  }

  _buildQuestion(qIndex) {
    const q = QUESTIONS[qIndex];
    const num = String(qIndex + 1).padStart(2, '0');
    const answer = this.answers[q.id] || '';
    let prompt = q.prompt;

    return `
      <div class="ob-question">
        <div class="ob-q-header">
          <span class="ob-q-number">${num}</span>
          <h3 class="ob-q-title">${q.title}</h3>
        </div>
        <p class="ob-q-prompt">${prompt}</p>
        <textarea
          class="ob-textarea"
          id="ob-answer"
          placeholder="${q.placeholder}"
          rows="5"
        >${answer}</textarea>
        <div class="ob-nav">
          <button class="ob-nav-btn" id="ob-prev" ${qIndex === 0 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Anterior
          </button>
          <div class="ob-nav-spacer"></div>
          <button class="ob-nav-btn ob-nav-btn--primary" id="ob-next">
            ${qIndex === 11 ? 'Finalizar' : 'Siguiente'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  _buildComplete() {
    let summaryHTML = '<div class="ob-summary">';
    for (const s of SECTIONS) {
      const sectionQs = QUESTIONS.filter(q => q.section === SECTIONS.indexOf(s));
      summaryHTML += `<div class="ob-summary-section">
        <div class="ob-summary-section-title">${s.number}. ${s.title}</div>`;
      for (const q of sectionQs) {
        const answer = this.answers[q.id];
        summaryHTML += `<div class="ob-summary-item">
          <div class="ob-summary-q">${q.title}</div>
          ${answer
            ? `<div class="ob-summary-a">"${answer}"</div>`
            : `<div class="ob-summary-empty">Sin respuesta</div>`
          }
        </div>`;
      }
      summaryHTML += '</div>';
    }
    summaryHTML += '</div>';

    return `
      <div class="ob-complete">
        <div class="ob-complete-check">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 class="ob-complete-title">Expediente Completado</h2>
        <p class="ob-complete-text">
          Gracias, ${this.currentUser?.name || 'Talento'}. Tu informacion esta segura con nosotros.
          <br>Solo la produccion tiene acceso a este expediente.
        </p>
        <div class="ob-complete-actions">
          <button class="ob-nav-btn ob-nav-btn--primary" id="ob-back-home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Volver al Ecosistema
          </button>
          <button class="ob-review-btn" id="ob-review">Revisar y actualizar respuestas</button>
        </div>
        ${summaryHTML}
      </div>
    `;
  }

  // ─── ATTACH LISTENERS ──────────────────────────────

  _attachIntroListeners() {
    this.container.querySelector('#ob-start-btn')?.addEventListener('click', async () => {
      this.direction = 'next';
      const isResume = this.existingData?.currentStep > 0 && !this.isCompleted;
      const startStep = isResume ? this.existingData.currentStep : 1;

      if (!isResume) {
        // First time opening — play boot sequence
        this._transitioning = true;

        // Hide the intro card first
        const stage = this.container.querySelector('#ob-stage');
        if (stage?.firstElementChild) {
          stage.firstElementChild.classList.add('ob-slide-out-left');
          await this._wait(350);
        }

        await this._playBootSequence();
        this._transitioning = false;
      }

      this._showStep(startStep);
      this._saveProgress();
    });
  }

  _attachQuestionListeners(qIndex) {
    const textarea = this.container.querySelector('#ob-answer');
    const q = QUESTIONS[qIndex];

    if (textarea) {
      textarea.addEventListener('input', () => {
        this.answers[q.id] = textarea.value;
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this._saveProgress(), 1500);
      });
      setTimeout(() => textarea.focus(), 600);
    }

    this.container.querySelector('#ob-prev')?.addEventListener('click', () => {
      if (textarea) this.answers[q.id] = textarea.value;
      this.direction = 'prev';
      const prevStep = this.currentStep - 1;
      if (prevStep >= 1) {
        this._showStep(prevStep);
      } else {
        this._showStep(0);
      }
    });

    this.container.querySelector('#ob-next')?.addEventListener('click', () => {
      if (textarea) this.answers[q.id] = textarea.value;
      this.direction = 'next';
      const nextStep = this.currentStep + 1;
      if (nextStep <= 12) {
        this._showStep(nextStep);
        this._saveProgress();
      } else {
        this._complete();
      }
    });
  }

  _attachCompleteListeners() {
    this.container.querySelector('#ob-back-home')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    this.container.querySelector('#ob-review')?.addEventListener('click', () => {
      this.direction = 'next';
      this._showStep(1);
    });
  }

  // ─── PERSISTENCE ───────────────────────────────────

  async _saveProgress() {
    try {
      await userAuth.saveOnboardingResponse(
        this.currentUser.phone,
        this.businessId,
        {
          userName: this.currentUser.name,
          currentStep: this.currentStep,
          answers: this.answers,
          startedAt: this.existingData?.startedAt || new Date().toISOString(),
          completedAt: this.existingData?.completedAt || null,
        }
      );
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }

  async _complete() {
    this.isCompleted = true;

    // Play completion cinematic FIRST
    this._transitioning = true;
    const stage = this.container.querySelector('#ob-stage');
    if (stage?.firstElementChild) {
      stage.firstElementChild.classList.add('ob-slide-out-left');
      await this._wait(350);
    }
    await this._playCompletionSequence();
    this._transitioning = false;

    // Save to Firestore
    try {
      await userAuth.saveOnboardingResponse(
        this.currentUser.phone,
        this.businessId,
        {
          userName: this.currentUser.name,
          currentStep: 13,
          answers: this.answers,
          startedAt: this.existingData?.startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
      );
      Toast.success('Expediente guardado exitosamente');
    } catch (e) {
      console.error('Save onboarding failed:', e);
      Toast.error('Error al guardar el expediente');
    }

    this.direction = 'next';
    this._showStep(13);
  }

  _exitLater() {
    const textarea = this.container.querySelector('#ob-answer');
    if (textarea && this.currentStep >= 1 && this.currentStep <= 12) {
      const q = QUESTIONS[this.currentStep - 1];
      this.answers[q.id] = textarea.value;
    }

    this._saveProgress();
    Toast.success('Progreso guardado. Puedes retomar cuando quieras.');
    window.location.hash = '#home';
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  unmount() {
    clearTimeout(this._saveTimeout);
  }
}
