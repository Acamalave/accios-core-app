import userAuth from '../services/userAuth.js';
import { Toast } from '../components/Toast.js';

// ── Questions Data — Nested in Sections ──────────────────────
const SECTIONS = [
  {
    id: 'hospitalidad',
    code: 'SEC-I',
    title: 'Protocolo de Hospitalidad',
    subtitle: 'Tu confort dicta el ritmo del show. No hay respuestas incorrectas, solo estandares.',
    questions: [
      { id: 'q1', code: 'HOSP-001', label: 'El Combustible Exacto', prompt: 'No nos digas "un cafe". Describe tu orden como si se la estuvieras dictando a tu barista personal.', context: 'Ej: Lungo, leche de almendras fria aparte, dos sobres de estevia.' },
      { id: 'q2', code: 'HOSP-002', label: 'El Rescate de Emergencia', prompt: 'Si llevamos tres horas grabando, la energia cae y el estres sube, cual es ese "placer culposo" que reinicia tu sistema inmediatamente?', context: 'Puede ser un snack especifico, 5 minutos de encierro total, o una cancion a todo volumen.' },
      { id: 'q3', code: 'HOSP-003', label: 'El Entorno Ideal', prompt: 'Que temperatura, iluminacion o aroma te hace sentir inmediatamente comoda y en control del espacio?', context: '' },
      { id: 'q4', code: 'HOSP-004', label: 'El "No-Go" Visual y Gastrico', prompt: 'Que comida te pondria de mal humor si la ves en el catering, o que objeto/desorden en el set te obsesiona y desconcentra?', context: '' },
    ],
  },
  {
    id: 'circulo',
    code: 'SEC-II',
    title: 'El Circulo de Confianza',
    subtitle: 'Como produccion, somos tu escudo. Necesitamos saber a quien dejas entrar y de quien te protegemos.',
    questions: [
      { id: 'q5', code: 'CONF-001', label: 'El Complice de Riesgo', prompt: 'Si tuvieras que ocultar un "cadaver" (metaforicamente), a que amiga llamarias a las 3:00 AM sabiendo que llegaria con una pala y sin hacer preguntas?', context: '' },
      { id: 'q6', code: 'CONF-002', label: 'El Ancla a Tierra', prompt: 'Cuando la grabacion se pone demasiado intensa y necesitas que alguien te centre, quien es esa persona a la que llamas al salir?', context: '' },
      { id: 'q7', code: 'CONF-003', label: 'La Linea Roja Invisible', prompt: 'Cual es ese tema o tipo de pregunta que te genera ansiedad y te haria decir "corten la camara"?', context: 'Saber a que le tienes temor es nuestra mejor herramienta para evitarlo.' },
      { id: 'q8', code: 'CONF-004', label: 'Veto Absoluto', prompt: 'Existe algun nombre, familiar o situacion del pasado que esta estrictamente prohibido mencionar al aire?', context: '' },
    ],
  },
  {
    id: 'psicologia',
    code: 'SEC-III',
    title: 'Psicologia de Escena',
    subtitle: 'Tu personalidad es el activo mas caro del programa. Queremos saber como ganar contigo.',
    questions: [
      { id: 'q9', code: 'PSI-001', label: 'La Mentira de Sociedad', prompt: 'Cual es esa postura que sueles fingir en eventos de alta sociedad para encajar, pero que te encantaria destruir publicamente en este podcast?', context: '' },
      { id: 'q10', code: 'PSI-002', label: 'El Boton Rojo', prompt: 'Que actitud, comentario o tipo de persona te hace perder la paciencia y te saca de tu zona de confort?', context: 'Nos sirve para saber cuando encender el debate.' },
      { id: 'q11', code: 'PSI-003', label: 'El Superpoder de Negociacion', prompt: 'Si tuvieras que cerrar un trato millonario hoy con todo en contra, cual es esa herramienta de tu personalidad que usarias para ganar?', context: '' },
      { id: 'q12', code: 'PSI-004', label: 'El Trofeo Invisible', prompt: 'Cuando terminemos de grabar y te subas a tu auto, que tiene que haber pasado para que digas: "Wow, hoy la rompimos"?', context: 'Dinos como mides tu propia victoria para asegurarnos de fabricarla.' },
    ],
  },
];

const ROMAN = ['I', 'II', 'III'];

export class Onboarding {
  constructor(container, currentUser, businessId) {
    this.container = container;
    this.currentUser = currentUser || userAuth.getCurrentUser();
    this.businessId = businessId || 'mdn-podcast';

    this.sections = SECTIONS;
    this.currentSectionIdx = 0;
    this.currentQuestionIdx = 0;
    this.answers = {};
    this.totalQuestions = this.sections.reduce((sum, s) => sum + s.questions.length, 0);

    this.existingData = null;
    this.isCompleted = false;

    this._typewriterTimer = null;
    this._aborted = false;
    this._saveTimeout = null;
    this._seenQuestions = new Set();
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
        this._renderReview();
        return;
      }

      if (this.existingData.currentStep > 0) {
        this._setPositionFromStep(this.existingData.currentStep);
        this._renderQuestion(true); // instant — skip typewriter on resume
        return;
      }
    }

    // Fresh start → boot sequence
    this._renderBoot();
  }

  // ═══════════════════════════════════════════
  //  BOOT — Terminal initialization sequence
  // ═══════════════════════════════════════════
  _renderBoot() {
    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-terminal">
          <div class="onb-terminal-header">
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-title">ACCIOS CORE — Terminal Segura</span>
          </div>
          <div class="onb-terminal-body" id="onb-boot-log"></div>
        </div>
      </div>
    `;
    this._runBootSequence();
  }

  async _runBootSequence() {
    const log = document.getElementById('onb-boot-log');
    if (!log) return;

    const name = this.currentUser?.name || 'Talento';

    const lines = [
      { text: '> Inicializando sistema de expedientes...', delay: 500 },
      { text: '> Conectando con base de datos segura...', delay: 600 },
      { text: '> Verificando credenciales de acceso...', delay: 500 },
      { text: `> Comprobando identidad: ${name}`, delay: 800, cls: 'onb-line--accent' },
      { text: '> Acceso concedido — Nivel: AUTORIZADO', delay: 500, cls: 'onb-line--success' },
      { text: '> ⚠ Archivo clasificado detectado', delay: 700, cls: 'onb-line--warning' },
      { text: '> Desclasificando expediente reservado...', delay: 600, cls: 'onb-line--accent' },
    ];

    for (const line of lines) {
      if (this._aborted) return;
      await this._wait(line.delay);
      const el = document.createElement('div');
      el.className = `onb-boot-line ${line.cls || ''}`;
      el.textContent = line.text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    await this._wait(900);
    if (!this._aborted) this._renderDeclassify();
  }

  // ═══════════════════════════════════════════
  //  DECLASSIFY — Classified stamp animation
  // ═══════════════════════════════════════════
  _renderDeclassify() {
    const name = this.currentUser?.name || 'Talento';

    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-stamp-container onb-screen-enter">
          <div class="onb-stamp-folder">📂</div>
          <div class="onb-stamp" id="onb-stamp">CLASIFICADO</div>
          <div class="onb-stamp-subtitle">EXPEDIENTE RESERVADO</div>
          <div class="onb-stamp-title">Onboarding de Talento — MDN Podcast</div>
          <div class="onb-stamp-name">${name}</div>
        </div>
      </div>
    `;

    // Switch to DESCLASIFICADO after stamp lands
    setTimeout(() => {
      if (this._aborted) return;
      const stamp = document.getElementById('onb-stamp');
      if (stamp) {
        stamp.textContent = 'DESCLASIFICADO';
        stamp.classList.add('onb-stamp--declassified');
        stamp.style.animation = 'none';
        stamp.offsetHeight; // force reflow
        stamp.style.animation = 'onb-stampIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
      }
    }, 1800);

    // Advance to first section intro
    setTimeout(() => {
      if (!this._aborted) {
        this.currentSectionIdx = 0;
        this.currentQuestionIdx = 0;
        this._renderSectionIntro();
      }
    }, 3500);
  }

  // ═══════════════════════════════════════════
  //  SECTION INTRO — Protocol header
  // ═══════════════════════════════════════════
  _renderSectionIntro() {
    const section = this.sections[this.currentSectionIdx];

    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-section-screen onb-screen-enter">
          <div class="onb-section-number">${ROMAN[this.currentSectionIdx]}</div>
          <div class="onb-section-code">${section.code} // PROTOCOLO ACTIVO</div>
          <h2 class="onb-section-title">${section.title}</h2>
          <p class="onb-section-desc">${section.subtitle}</p>
          <div class="onb-section-divider"></div>
        </div>
      </div>
      ${this._renderProgress()}
    `;

    // Auto-advance to first question in section
    setTimeout(() => {
      if (!this._aborted) {
        this.currentQuestionIdx = 0;
        this._renderQuestion();
      }
    }, 2200);
  }

  // ═══════════════════════════════════════════
  //  QUESTION — Typewriter prompt + input
  // ═══════════════════════════════════════════
  _renderQuestion(instant = false) {
    const section = this.sections[this.currentSectionIdx];
    const question = section.questions[this.currentQuestionIdx];
    const globalIdx = this._getGlobalIndex();
    const existingAnswer = this.answers[question.id] || '';
    const isFirst = globalIdx === 0;

    // Skip typewriter if question was already seen or has an existing answer
    const shouldTypewrite = !instant && !this._seenQuestions.has(question.id) && !existingAnswer;
    this._seenQuestions.add(question.id);

    this.container.innerHTML = `
      <div class="onb-fullscreen" style="align-items: flex-start; padding-top: 70px;">
        <button class="onb-exit-btn" id="onb-exit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Continuar despues
        </button>
        <div class="onb-question-screen onb-screen-enter">
          <div class="onb-question-code">${question.code}</div>
          <h2 class="onb-question-label">${question.label}</h2>
          <p class="onb-question-prompt ${shouldTypewrite ? 'onb-typewriter' : ''}" id="onb-prompt">${shouldTypewrite ? '' : question.prompt}</p>
          ${question.context ? `<div class="onb-question-context">${question.context}</div>` : ''}
          <textarea
            class="onb-question-input"
            id="onb-answer"
            placeholder="Escribe tu respuesta..."
            rows="4"
            ${shouldTypewrite ? 'style="opacity: 0;"' : ''}
          >${existingAnswer}</textarea>
          <div class="onb-actions" id="onb-actions" ${shouldTypewrite ? 'style="opacity: 0;"' : ''}>
            <button class="onb-btn-prev" id="onb-prev" ${isFirst ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Anterior
            </button>
            <div style="flex:1;"></div>
            <button class="onb-submit" id="onb-next">
              <span>${globalIdx + 1 < this.totalQuestions ? 'Continuar' : 'Finalizar'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>
      ${this._renderProgress()}
    `;

    if (shouldTypewrite) {
      // Typewriter effect for the prompt
      const promptEl = document.getElementById('onb-prompt');
      this._typewrite(promptEl, question.prompt, 25).then(() => {
        if (this._aborted) return;
        promptEl.classList.add('onb-typewriter--done');

        // Reveal input + actions with slide-up
        const input = document.getElementById('onb-answer');
        const actions = document.getElementById('onb-actions');
        if (input) {
          input.style.opacity = '';
          input.style.animation = 'onb-slideUp 0.4s ease forwards';
          setTimeout(() => input.focus(), 300);
        }
        if (actions) {
          actions.style.opacity = '';
          actions.style.animation = 'onb-slideUp 0.4s ease 0.15s forwards';
        }
      });
    } else {
      // Instant — just focus the textarea
      const input = document.getElementById('onb-answer');
      if (input) setTimeout(() => input.focus(), 200);
    }

    this._attachQuestionListeners(question);
  }

  _attachQuestionListeners(question) {
    const input = document.getElementById('onb-answer');
    const nextBtn = document.getElementById('onb-next');
    const prevBtn = document.getElementById('onb-prev');
    const exitBtn = document.getElementById('onb-exit');

    if (input) {
      input.addEventListener('input', () => {
        this.answers[question.id] = input.value;
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this._saveProgress(), 1500);
      });

      // Ctrl/Cmd + Enter to advance
      input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this._handleNext(question, input);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this._handleNext(question, input));
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this._handlePrev(question, input));
    }

    if (exitBtn) {
      exitBtn.addEventListener('click', () => this._exitLater());
    }
  }

  _handleNext(question, input) {
    if (input) this.answers[question.id] = input.value;

    const section = this.sections[this.currentSectionIdx];
    const isLastInSection = this.currentQuestionIdx >= section.questions.length - 1;
    const isLastSection = this.currentSectionIdx >= this.sections.length - 1;

    if (isLastInSection && isLastSection) {
      // All done → finale
      this._renderFinale();
    } else if (isLastInSection) {
      // Section complete → checkmark, then next section
      this._renderSectionComplete();
    } else {
      // Next question in same section
      this.currentQuestionIdx++;
      this._saveProgress();
      this._renderQuestion();
    }
  }

  _handlePrev(question, input) {
    if (input) this.answers[question.id] = input.value;

    if (this.currentQuestionIdx > 0) {
      this.currentQuestionIdx--;
    } else if (this.currentSectionIdx > 0) {
      this.currentSectionIdx--;
      this.currentQuestionIdx = this.sections[this.currentSectionIdx].questions.length - 1;
    }

    this._renderQuestion(true); // instant for backward navigation
  }

  // ═══════════════════════════════════════════
  //  SECTION COMPLETE — Checkmark animation
  // ═══════════════════════════════════════════
  _renderSectionComplete() {
    const section = this.sections[this.currentSectionIdx];
    const answered = section.questions.filter(q => this.answers[q.id]?.trim()).length;

    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-complete-screen onb-screen-enter">
          <div class="onb-complete-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 class="onb-complete-title">${section.title}</h3>
          <p class="onb-complete-sub">Seccion ${ROMAN[this.currentSectionIdx]} completada — ${answered} respuestas registradas</p>
        </div>
      </div>
      ${this._renderProgress()}
    `;

    this._saveProgress();

    // Advance to next section
    setTimeout(() => {
      if (this._aborted) return;
      this.currentSectionIdx++;
      this.currentQuestionIdx = 0;
      this._renderSectionIntro();
    }, 2000);
  }

  // ═══════════════════════════════════════════
  //  FINALE — Terminal processing + save + redirect
  // ═══════════════════════════════════════════
  async _renderFinale() {
    this.isCompleted = true;

    // Save as completed to Firestore
    try {
      await userAuth.saveOnboardingResponse(
        this.currentUser.phone,
        this.businessId,
        {
          userName: this.currentUser.name,
          currentStep: this.totalQuestions + 1,
          answers: this.answers,
          startedAt: this.existingData?.startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
      );
    } catch (e) {
      console.error('Save failed:', e);
      Toast.error('Error al guardar el expediente');
    }

    // Show terminal processing sequence
    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-terminal onb-screen-enter">
          <div class="onb-terminal-header">
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-dot"></span>
            <span class="onb-terminal-title">Protocolo de Cierre — Expediente Reservado</span>
          </div>
          <div class="onb-terminal-body" id="onb-finale-log"></div>
        </div>
      </div>
    `;

    const log = document.getElementById('onb-finale-log');
    if (!log) return;

    const totalAnswered = this.sections.reduce((sum, s) =>
      sum + s.questions.filter(q => this.answers[q.id]?.trim()).length, 0
    );

    const lines = [
      { text: '> Cerrando ultima seccion de registro...', delay: 500 },
      { text: `> Respuestas totales capturadas: ${totalAnswered}/${this.totalQuestions}`, delay: 500, cls: 'onb-line--accent' },
      { text: '> Compilando expediente completo...', delay: 700 },
      { text: '> Verificando integridad de datos...', delay: 600 },
      { text: '> Aplicando cifrado AES-256 a respuestas...', delay: 800, cls: 'onb-line--accent' },
      { text: '> Restringiendo acceso: solo produccion autorizada...', delay: 600 },
      { text: '> Generando sello de confidencialidad...', delay: 500 },
      { text: '> Almacenando en boveda segura...', delay: 700, cls: 'onb-line--accent' },
      { text: '> ✓ EXPEDIENTE SELLADO Y ASEGURADO', delay: 600, cls: 'onb-line--success' },
    ];

    for (const line of lines) {
      if (this._aborted) return;
      await this._wait(line.delay);
      const el = document.createElement('div');
      el.className = `onb-boot-line ${line.cls || ''}`;
      el.textContent = line.text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    await this._wait(800);
    if (this._aborted) return;

    // Show finale completion screen
    this.container.innerHTML = `
      <div class="onb-fullscreen">
        <div class="onb-finale onb-screen-enter">
          <div class="onb-finale-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 class="onb-finale-title">Expediente Completado</h2>
          <p class="onb-finale-text">
            Todas tus respuestas han sido registradas y cifradas de forma segura.
            Tu expediente de talento esta listo para el equipo de produccion.
          </p>
          <div class="onb-finale-bar">
            <div class="onb-finale-bar-fill" id="onb-finale-fill"></div>
          </div>
          <p class="onb-finale-redirect">Redirigiendo al ecosistema...</p>
        </div>
      </div>
    `;

    // Animate progress bar fill
    await this._wait(200);
    const fill = document.getElementById('onb-finale-fill');
    if (fill) fill.style.width = '100%';

    // Redirect after animation
    await this._wait(2800);
    if (!this._aborted) {
      Toast.success('Expediente guardado exitosamente');
      window.location.hash = '#home';
    }
  }

  // ═══════════════════════════════════════════
  //  REVIEW — Already completed summary view
  // ═══════════════════════════════════════════
  _renderReview() {
    let summaryHTML = '';
    for (const section of this.sections) {
      summaryHTML += `<div class="onb-summary-section">
        <div class="onb-summary-section-title">${section.code} · ${section.title}</div>`;
      for (const q of section.questions) {
        const answer = this.answers[q.id];
        summaryHTML += `<div class="onb-summary-item">
          <div class="onb-summary-q">${q.label}</div>
          ${answer
            ? `<div class="onb-summary-a">"${answer}"</div>`
            : `<div class="onb-summary-empty">Sin respuesta</div>`
          }
        </div>`;
      }
      summaryHTML += '</div>';
    }

    this.container.innerHTML = `
      <div class="onb-fullscreen" style="align-items: flex-start; padding-top: 60px;">
        <div class="onb-review-screen onb-screen-enter">
          <div class="onb-review-header">
            <div class="onb-review-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 class="onb-review-title">Expediente Completado</h2>
            <p class="onb-review-text">Gracias, ${this.currentUser?.name || 'Talento'}. Tu informacion esta segura con nosotros.</p>
            <div class="onb-review-actions">
              <button class="onb-submit" id="onb-back-home">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Volver al Ecosistema</span>
              </button>
              <button class="onb-btn-review" id="onb-update">Actualizar Respuestas</button>
            </div>
          </div>
          <div class="onb-summary">${summaryHTML}</div>
        </div>
      </div>
    `;

    document.getElementById('onb-back-home')?.addEventListener('click', () => {
      window.location.hash = '#home';
    });

    document.getElementById('onb-update')?.addEventListener('click', () => {
      this.isCompleted = false;
      this.currentSectionIdx = 0;
      this.currentQuestionIdx = 0;
      this._renderQuestion(true);
    });
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════
  _renderProgress() {
    const globalIdx = this._getGlobalIndex();
    const pct = ((globalIdx) / this.totalQuestions) * 100;

    return `
      <div class="onb-progress">
        <div class="onb-progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="onb-progress-text">
        Pregunta ${Math.min(globalIdx + 1, this.totalQuestions)}/${this.totalQuestions} · Seccion ${ROMAN[this.currentSectionIdx]} de ${ROMAN[this.sections.length - 1]}
      </div>
    `;
  }

  _getGlobalIndex() {
    let idx = 0;
    for (let s = 0; s < this.currentSectionIdx; s++) {
      idx += this.sections[s].questions.length;
    }
    idx += this.currentQuestionIdx;
    return idx;
  }

  _getStepNumber() {
    return this._getGlobalIndex() + 1;
  }

  _setPositionFromStep(step) {
    let remaining = step - 1; // step is 1-based
    for (let s = 0; s < this.sections.length; s++) {
      if (remaining < this.sections[s].questions.length) {
        this.currentSectionIdx = s;
        this.currentQuestionIdx = remaining;
        return;
      }
      remaining -= this.sections[s].questions.length;
    }
    // Fallback to last question
    this.currentSectionIdx = this.sections.length - 1;
    this.currentQuestionIdx = this.sections[this.currentSectionIdx].questions.length - 1;
  }

  _typewrite(element, text, speed = 25) {
    return new Promise(resolve => {
      if (!element || this._aborted) { resolve(); return; }
      let i = 0;
      this._typewriterTimer = setInterval(() => {
        if (this._aborted) {
          clearInterval(this._typewriterTimer);
          resolve();
          return;
        }
        element.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(this._typewriterTimer);
          this._typewriterTimer = null;
          resolve();
        }
      }, speed);
    });
  }

  async _saveProgress() {
    try {
      await userAuth.saveOnboardingResponse(
        this.currentUser.phone,
        this.businessId,
        {
          userName: this.currentUser.name,
          currentStep: this._getStepNumber(),
          answers: this.answers,
          startedAt: this.existingData?.startedAt || new Date().toISOString(),
          completedAt: null,
        }
      );
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }

  _exitLater() {
    const input = document.getElementById('onb-answer');
    if (input) {
      const section = this.sections[this.currentSectionIdx];
      const question = section.questions[this.currentQuestionIdx];
      this.answers[question.id] = input.value;
    }
    this._saveProgress();
    Toast.success('Progreso guardado. Puedes retomar cuando quieras.');
    window.location.hash = '#home';
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  unmount() {
    this._aborted = true;
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    clearTimeout(this._saveTimeout);
  }
}
